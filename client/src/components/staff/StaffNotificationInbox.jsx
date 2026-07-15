import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStaffNotifications } from '../../contexts/StaffNotificationsContext.jsx';
import { formatNotificationTime, resolveNotificationDestination } from '../../lib/staffNotifications.js';

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18h2" />
      <path d="M10 6.5h4" />
    </svg>
  );
}

function SoundIcon({ muted }) {
  if (muted) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="m19 9-6 6" />
        <path d="m13 9 6 6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 9.5a5 5 0 0 1 0 5" />
      <path d="M18.5 7a9 9 0 0 1 0 10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function compactInboxMessage(message) {
  const normalizedMessage = String(message || '').replace(/\s+/g, ' ').trim();

  if (!normalizedMessage) {
    return '';
  }

  if (normalizedMessage === 'Browser popups are enabled while this site is open. Add push keys on the server for full background alerts.') {
    return 'Browser popups are on for this session. Server push keys are still needed for background alerts.';
  }

  if (normalizedMessage === 'Device notifications are enabled for this browser and phone-ready where supported.') {
    return 'Device alerts are enabled for this browser.';
  }

  if (normalizedMessage === 'Background push alerts were turned off for this browser.') {
    return 'Background alerts were turned off for this browser.';
  }

  return normalizedMessage.length > 108
    ? `${normalizedMessage.slice(0, 105).trim()}...`
    : normalizedMessage;
}

function compactNotificationMessage(message) {
  const normalizedMessage = String(message || '').replace(/\s+/g, ' ').trim();

  if (!normalizedMessage) {
    return 'Open the queue for the full request details.';
  }

  const packageRequestMatch = normalizedMessage.match(/request\s+#?(\d+)\s+received\s+from\s+(.+?)\s+for\s+(.+)$/i);
  if (packageRequestMatch) {
    return `#${packageRequestMatch[1]} / ${packageRequestMatch[2]} / ${packageRequestMatch[3]}`;
  }

  const genericReceivedMatch = normalizedMessage.match(/received\s+from\s+(.+?)\s+for\s+(.+)$/i);
  if (genericReceivedMatch) {
    return `${genericReceivedMatch[1]} / ${genericReceivedMatch[2]}`;
  }

  return normalizedMessage.length > 88
    ? `${normalizedMessage.slice(0, 85).trim()}...`
    : normalizedMessage;
}

const StaffNotificationInbox = () => {
  const {
    unreadCount,
    loading,
    error,
    role,
    pushConfigured,
    pushEnabled,
    notificationPermission,
    soundEnabled,
    sidebarNotifications,
    deviceAlertMessage,
    clearInboxMessage,
    requestDeviceAlerts,
    disableBackgroundAlerts,
    toggleSound,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useStaffNotifications();
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);

  useEffect(() => {
    setDismissedNotificationIds((currentIds) => (
      currentIds.filter((id) => sidebarNotifications.some((notification) => notification.id === id))
    ));
  }, [sidebarNotifications]);

  const visibleSidebarNotifications = useMemo(
    () => sidebarNotifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, sidebarNotifications]
  );

  const deviceAlertStatusLabel = pushEnabled
    ? 'Background on'
    : notificationPermission === 'granted'
      ? (pushConfigured ? 'Foreground on' : 'Popup on')
      : notificationPermission === 'denied'
        ? 'Alerts blocked'
        : 'Enable alerts';

  const handleDismissNotification = (notification) => {
    setDismissedNotificationIds((currentIds) => (
      currentIds.includes(notification.id)
        ? currentIds
        : [...currentIds, notification.id]
    ));

    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
  };

  return (
    <div className="border-b border-white/10 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Staff alerts</div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-[#d8c79a]">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-[#d8c79a] px-1.5 py-0.5 text-[10px] font-black text-[#101c2d]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white sm:text-[15px]">
                {loading ? 'Loading alerts...' : unreadCount > 0 ? `${unreadCount} unread` : 'Inbox clear'}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {role === 'manager' ? 'Manager inbox' : 'Admin inbox'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pushEnabled ? disableBackgroundAlerts : requestDeviceAlerts}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              pushEnabled
                ? 'border-[#d8c79a]/40 bg-[#d8c79a]/15 text-[#f4df9c] hover:bg-[#d8c79a]/25'
                : notificationPermission === 'denied'
                  ? 'border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
                  : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            aria-label={pushEnabled ? 'Disable background alerts' : 'Enable browser and device alerts'}
            title={pushEnabled ? 'Disable background alerts' : 'Enable browser and device alerts'}
          >
            <DeviceIcon />
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              soundEnabled
                ? 'border-white/10 bg-white/6 text-white/85 hover:bg-white/10 hover:text-white'
                : 'border-white/10 bg-transparent text-white/45 hover:bg-white/6 hover:text-white/75'
            }`}
            aria-label={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
            title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
          >
            <SoundIcon muted={!soundEnabled} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
          pushEnabled ? 'bg-[#d8c79a]/20 text-[#f4df9c]' : 'bg-white/8 text-white/65'
        }`}>
          {deviceAlertStatusLabel}
        </span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
          soundEnabled ? 'bg-white/8 text-white/70' : 'bg-white/5 text-white/45'
        }`}>
          {soundEnabled ? 'Sound on' : 'Sound off'}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsAsRead}
            className="inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/8 hover:text-white"
          >
            Read all
          </button>
        )}
      </div>

      {(deviceAlertMessage || error) && (
        <div className={`mt-3 rounded-[1rem] border px-3 py-2.5 text-[11px] leading-5 ${
          error
            ? 'border-red-400/20 bg-red-500/10 text-red-100'
            : 'border-white/10 bg-white/6 text-white/75'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0">{compactInboxMessage(error || deviceAlertMessage)}</p>
            <button
              type="button"
              onClick={clearInboxMessage}
              className="shrink-0 rounded-full p-1 text-white/55 transition hover:bg-white/8 hover:text-white"
              aria-label="Close inbox message"
              title="Close inbox message"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {visibleSidebarNotifications.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/5 px-3 py-3 text-xs leading-5 text-white/55">
            New package, flight, service, and consultation alerts will appear here automatically.
          </div>
        ) : (
          visibleSidebarNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-[1rem] border px-3 py-3 ${
                notification.read
                  ? 'border-white/8 bg-white/5'
                  : 'border-[#d8c79a]/30 bg-[#d8c79a]/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-[#f4df9c]" />}
                    <h3 className="truncate text-[13px] font-black text-white">{notification.title || 'Staff notification'}</h3>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-white/68" title={notification.message}>
                    {compactNotificationMessage(notification.message)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/8 hover:text-white"
                    >
                      Read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(notification)}
                    className="rounded-full p-1 text-white/55 transition hover:bg-white/8 hover:text-white"
                    aria-label="Close notification"
                    title="Close notification"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/45">{formatNotificationTime(notification.createdAt)}</span>
                <Link
                  to={resolveNotificationDestination(notification, role)}
                  className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f4df9c] transition hover:text-white"
                  onClick={() => {
                    if (!notification.read) {
                      markNotificationAsRead(notification.id);
                    }
                  }}
                >
                  Open
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffNotificationInbox;
