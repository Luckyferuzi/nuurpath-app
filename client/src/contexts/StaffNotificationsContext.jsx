import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios, { BACKEND_ORIGIN, getStoredAuthToken } from '../lib/api';
import { useAuth } from './AuthContext.jsx';
import { resolveNotificationDestination } from '../lib/staffNotifications.js';

const StaffNotificationsContext = createContext(null);

const SOUND_STORAGE_KEY = 'nuurpath.staff.notifications.sound-enabled';
const MAX_NOTIFICATION_CACHE = 20;

function getNotificationPermissionState() {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
}

function readStoredSoundPreference() {
  if (typeof window === 'undefined') {
    return true;
  }

  const storedValue = window.localStorage.getItem(SOUND_STORAGE_KEY);
  if (storedValue === null) {
    return true;
  }

  return storedValue === 'true';
}

function persistSoundPreference(value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SOUND_STORAGE_KEY, value ? 'true' : 'false');
}

function sortNotificationsByCreatedAt(notifications) {
  return [...notifications].sort((firstNotification, secondNotification) => (
    new Date(secondNotification?.createdAt || 0).getTime() - new Date(firstNotification?.createdAt || 0).getTime()
  ));
}

function mergeNotifications(currentNotifications, incomingNotifications) {
  const notificationsById = new Map();

  [...incomingNotifications, ...currentNotifications].forEach((notification) => {
    if (!notification?.id) {
      return;
    }

    notificationsById.set(notification.id, notification);
  });

  return sortNotificationsByCreatedAt(Array.from(notificationsById.values())).slice(0, MAX_NOTIFICATION_CACHE);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function registerNotificationServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/notification-sw.js');
}

export function StaffNotificationsProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deviceAlertMessage, setDeviceAlertMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionState());
  const [soundEnabled, setSoundEnabled] = useState(readStoredSoundPreference);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushPublicKey, setPushPublicKey] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const notificationsRef = useRef([]);
  const socketRef = useRef(null);
  const serviceWorkerRegistrationRef = useRef(null);
  const alertSettingsRef = useRef({
    notificationPermission: getNotificationPermissionState(),
    pushEnabled: false,
    soundEnabled: readStoredSoundPreference(),
    role: '',
  });

  const role = String(user?.role || '').trim().toLowerCase();
  const isStaffUser = isAuthenticated && (role === 'admin' || role === 'manager');

  useEffect(() => {
    alertSettingsRef.current = {
      notificationPermission,
      pushEnabled,
      soundEnabled,
      role,
    };
  }, [notificationPermission, pushEnabled, role, soundEnabled]);

  const updateNotificationState = useCallback((nextNotifications) => {
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
    setUnreadCount(nextNotifications.filter((notification) => !notification.read).length);
  }, []);

  const playNotificationTone = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = StaffNotificationsProvider.audioContext || new AudioContextClass();
    StaffNotificationsProvider.audioContext = audioContext;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const currentTime = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, currentTime);
    oscillator.frequency.setValueAtTime(988, currentTime + 0.08);
    gainNode.gain.setValueAtTime(0.0001, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.24);
  }, []);

  const showForegroundNotificationPopup = useCallback((notification) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    const popup = new Notification(notification.title || 'NuurPath Alert', {
      body: notification.message || 'You have a new staff notification.',
      icon: '/nuurpath-logo.png',
      badge: '/nuurpath-logo.png',
      tag: `nuurpath-foreground-${notification.id}`,
      data: {
        url: resolveNotificationDestination(notification, alertSettingsRef.current.role),
      },
    });

    popup.onclick = () => {
      window.focus();
      if (popup.data?.url) {
        window.location.assign(popup.data.url);
      }
      popup.close();
    };
  }, []);

  const refreshPushSubscriptionState = useCallback(async (providedPublicKey = pushPublicKey) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setPushEnabled(false);
      return null;
    }

    const registration = await registerNotificationServiceWorker();
    serviceWorkerRegistrationRef.current = registration;

    if (!registration || !providedPublicKey || !('PushManager' in window)) {
      setPushEnabled(false);
      return registration;
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    setPushEnabled(Boolean(existingSubscription));
    return registration;
  }, [pushPublicKey]);

  const refreshNotificationSettings = useCallback(async () => {
    if (!isStaffUser) {
      setPushConfigured(false);
      setPushPublicKey('');
      setPushEnabled(false);
      return;
    }

    try {
      const response = await axios.get('/notifications/push-settings');
      const nextPushConfigured = Boolean(response.data?.isConfigured && response.data?.publicKey);
      const nextPushPublicKey = nextPushConfigured ? String(response.data.publicKey) : '';

      setPushConfigured(nextPushConfigured);
      setPushPublicKey(nextPushPublicKey);
      await refreshPushSubscriptionState(nextPushPublicKey);
    } catch (requestError) {
      console.error('Failed to load notification settings:', requestError);
      setPushConfigured(false);
      setPushPublicKey('');
      setPushEnabled(false);
    }
  }, [isStaffUser, refreshPushSubscriptionState]);

  const refreshNotifications = useCallback(async () => {
    if (!isStaffUser) {
      updateNotificationState([]);
      return;
    }

    try {
      const response = await axios.get('/notifications?limit=10');
      const nextNotifications = mergeNotifications([], response.data?.notifications || []);
      updateNotificationState(nextNotifications);
      setError('');
    } catch (requestError) {
      console.error('Failed to load staff notifications:', requestError);
      setError('Unable to load staff notifications right now.');
    }
  }, [isStaffUser, updateNotificationState]);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!isStaffUser) {
      updateNotificationState([]);
      setLoading(false);
      setError('');
      setDeviceAlertMessage('');
      setPushConfigured(false);
      setPushPublicKey('');
      setPushEnabled(false);
      return undefined;
    }

    let isCancelled = false;

    const loadNotificationWorkspace = async () => {
      setLoading(true);
      await Promise.all([
        refreshNotifications(),
        refreshNotificationSettings(),
      ]);

      if (!isCancelled) {
        setLoading(false);
      }
    };

    loadNotificationWorkspace();

    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    };

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'nuurpath-notification-received') {
        refreshNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener?.('message', handleServiceWorkerMessage);
    };
  }, [authLoading, isStaffUser, refreshNotifications, refreshNotificationSettings, updateNotificationState]);

  useEffect(() => {
    if (!isStaffUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      return undefined;
    }

    const token = getStoredAuthToken();
    if (!token) {
      return undefined;
    }

    const socket = io(BACKEND_ORIGIN, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('receive_notification', async (incomingNotification) => {
      const alreadyKnown = notificationsRef.current.some((notification) => notification.id === incomingNotification.id);
      const nextNotifications = mergeNotifications(notificationsRef.current, [incomingNotification]);
      updateNotificationState(nextNotifications);

      if (alreadyKnown || incomingNotification.read) {
        return;
      }

      const currentSettings = alertSettingsRef.current;

      if (currentSettings.soundEnabled && document.visibilityState === 'visible') {
        try {
          await playNotificationTone();
        } catch (soundError) {
          console.error('Failed to play notification tone:', soundError);
        }
      }

      if (!currentSettings.pushEnabled && currentSettings.notificationPermission === 'granted' && document.visibilityState !== 'visible') {
        showForegroundNotificationPopup(incomingNotification);
      }
    });

    socket.on('connect_error', (socketError) => {
      console.error('Staff notification socket error:', socketError?.message || socketError);
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [isStaffUser, playNotificationTone, showForegroundNotificationPopup, updateNotificationState]);

  const requestDeviceAlerts = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setDeviceAlertMessage('This browser does not support device notifications.');
      return { success: false };
    }

    try {
      let registration = await registerNotificationServiceWorker();
      serviceWorkerRegistrationRef.current = registration;

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        setDeviceAlertMessage(
          permission === 'denied'
            ? 'Browser notifications are blocked in this browser.'
            : 'Browser notification permission was dismissed.'
        );
        return { success: false };
      }

      if (pushConfigured && pushPublicKey && registration && 'PushManager' in window) {
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(pushPublicKey),
          });
        }

        await axios.post('/notifications/push-subscriptions', {
          subscription: subscription.toJSON(),
        });

        setPushEnabled(true);
        setDeviceAlertMessage('Device notifications are enabled for this browser and phone-ready where supported.');
      } else {
        setDeviceAlertMessage('Browser popups are enabled while this site is open. Add push keys on the server for full background alerts.');
      }

      try {
        await playNotificationTone();
      } catch (soundError) {
        console.error('Failed to warm up notification tone:', soundError);
      }

      return { success: true };
    } catch (requestError) {
      console.error('Failed to enable device alerts:', requestError);
      setDeviceAlertMessage(requestError.response?.data?.msg || 'Unable to enable device alerts right now.');
      return { success: false };
    }
  }, [playNotificationTone, pushConfigured, pushPublicKey]);

  const disableBackgroundAlerts = useCallback(async () => {
    try {
      const registration = serviceWorkerRegistrationRef.current || await registerNotificationServiceWorker();
      serviceWorkerRegistrationRef.current = registration;
      const subscription = await registration?.pushManager?.getSubscription?.();

      if (subscription) {
        await axios.delete('/notifications/push-subscriptions', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setDeviceAlertMessage('Background push alerts were turned off for this browser.');
    } catch (requestError) {
      console.error('Failed to disable background alerts:', requestError);
      setDeviceAlertMessage(requestError.response?.data?.msg || 'Unable to disable background alerts right now.');
    }
  }, []);

  const toggleSound = useCallback(async () => {
    const nextValue = !alertSettingsRef.current.soundEnabled;
    setSoundEnabled(nextValue);
    persistSoundPreference(nextValue);
    alertSettingsRef.current = {
      ...alertSettingsRef.current,
      soundEnabled: nextValue,
    };

    if (nextValue) {
      try {
        await playNotificationTone();
      } catch (soundError) {
        console.error('Failed to preview notification tone:', soundError);
      }
    }
  }, [playNotificationTone]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    const nextNotifications = notificationsRef.current.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    ));
    updateNotificationState(nextNotifications);

    try {
      await axios.put(`/notifications/${notificationId}/read`);
      setError('');
    } catch (requestError) {
      console.error('Failed to mark notification as read:', requestError);
      setError('Unable to update notification status right now.');
      refreshNotifications();
    }
  }, [refreshNotifications, updateNotificationState]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const nextNotifications = notificationsRef.current.map((notification) => ({ ...notification, read: true }));
    updateNotificationState(nextNotifications);

    try {
      await axios.put('/notifications/read-all');
      setError('');
    } catch (requestError) {
      console.error('Failed to mark all notifications as read:', requestError);
      setError('Unable to mark all notifications as read right now.');
      refreshNotifications();
    }
  }, [refreshNotifications, updateNotificationState]);

  const sidebarNotifications = useMemo(() => {
    const unreadNotifications = notifications.filter((notification) => !notification.read);
    return (unreadNotifications.length > 0 ? unreadNotifications : notifications).slice(0, 2);
  }, [notifications]);

  const dashboardNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    role,
    pushConfigured,
    pushEnabled,
    notificationPermission,
    soundEnabled,
    sidebarNotifications,
    dashboardNotifications,
    deviceAlertMessage,
    refreshNotifications,
    requestDeviceAlerts,
    disableBackgroundAlerts,
    toggleSound,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  }), [
    dashboardNotifications,
    deviceAlertMessage,
    error,
    loading,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notificationPermission,
    notifications,
    pushConfigured,
    pushEnabled,
    refreshNotifications,
    requestDeviceAlerts,
    role,
    sidebarNotifications,
    soundEnabled,
    toggleSound,
    unreadCount,
    disableBackgroundAlerts,
  ]);

  return (
    <StaffNotificationsContext.Provider value={value}>
      {children}
    </StaffNotificationsContext.Provider>
  );
}

export function useStaffNotifications() {
  const context = useContext(StaffNotificationsContext);

  if (!context) {
    throw new Error('useStaffNotifications must be used within a StaffNotificationsProvider.');
  }

  return context;
}
