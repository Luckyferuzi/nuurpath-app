import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../lib/api';
import { useStaffNotifications } from '../contexts/StaffNotificationsContext.jsx';
import { formatNotificationTime, resolveNotificationDestination } from '../lib/staffNotifications.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffInfoPill,
  StaffPageShell,
} from './staff/WorkspacePrimitives.jsx';

const PAGE_SIZE = 12;

function DeviceIcon({ inactive = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18h2" />
      <path d="M10 6.5h4" />
      {inactive && <path d="m6 6 12 12" />}
    </svg>
  );
}

function SoundIcon({ muted }) {
  if (muted) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="m19 9-6 6" />
        <path d="m13 9 6 6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 9.5a5 5 0 0 1 0 5" />
      <path d="M18.5 7a9 9 0 0 1 0 10" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
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

function formatNotificationType(type) {
  const normalizedType = String(type || '').trim();

  if (!normalizedType) {
    return 'General';
  }

  return normalizedType
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const StaffNotificationsPage = () => {
  const {
    unreadCount,
    role,
    error,
    deviceAlertMessage,
    clearInboxMessage,
    refreshNotifications,
    pushEnabled,
    notificationPermission,
    soundEnabled,
    requestDeviceAlerts,
    disableBackgroundAlerts,
    toggleSound,
  } = useStaffNotifications();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const deviceAlertsEnabled = pushEnabled || notificationPermission === 'granted';
  const deviceAlertsBlocked = notificationPermission === 'denied';
  const deviceAlertButtonLabel = pushEnabled
    ? 'Background alerts on'
    : deviceAlertsEnabled
      ? 'Browser alerts ready'
      : 'Device alerts off';

  const filterOptions = useMemo(() => ([
    { value: 'all', label: 'All notifications' },
    { value: 'unread', label: 'Unread', count: unreadCount },
  ]), [unreadCount]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('filter', filter === 'unread' ? 'unread' : 'all');

      const response = await axios.get(`/notifications?${params.toString()}`);
      setNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
      setTotalPages(Math.max(1, Number.parseInt(response.data?.totalPages, 10) || 1));
    } catch (requestError) {
      console.error('Failed to load notification inbox:', requestError);
      setPageError('Unable to load notifications right now.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, unreadCount]);

  const handleMarkAsRead = async (notification) => {
    if (!notification || notification.read) {
      return;
    }

    setNotifications((currentNotifications) => currentNotifications.map((currentNotification) => (
      currentNotification.id === notification.id
        ? { ...currentNotification, read: true }
        : currentNotification
    )));

    try {
      await axios.put(`/notifications/${notification.id}/read`);
      await refreshNotifications();
    } catch (requestError) {
      console.error('Failed to mark notification as read:', requestError);
      setPageError('Unable to update this notification right now.');
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all');
      await refreshNotifications();
      loadNotifications();
    } catch (requestError) {
      console.error('Failed to mark all notifications as read:', requestError);
      setPageError('Unable to mark all notifications as read right now.');
    }
  };

  const handleRefresh = async () => {
    await refreshNotifications();
    loadNotifications();
  };

  return (
    <StaffPageShell
      eyebrow="Staff Inbox"
      title="Notifications"
      description="Keep every request alert in one place, then open the right queue without crowding the sidebar."
      actions={(
        <>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb7] bg-white px-4 py-2 text-sm font-semibold text-[#4f5763] transition hover:border-[#bca77a] hover:text-[#101c2d]"
          >
            <RefreshIcon />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="rounded-full bg-[#101c2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f3050]"
            >
              Mark all read
            </button>
          )}
        </>
      )}
    >
      <StaffCardSection
        title="Inbox"
        description="This page keeps the full notification list, while the sidebar stays compact and calm."
        actions={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pushEnabled ? disableBackgroundAlerts : requestDeviceAlerts}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                pushEnabled
                  ? 'border-[#d8c79a] bg-[#fff7e3] text-[#7f6a3d] hover:bg-[#fff2d2]'
                  : deviceAlertsBlocked
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : deviceAlertsEnabled
                      ? 'border-[#d8cdb7] bg-[#fbfaf7] text-[#4f5763] hover:bg-white'
                      : 'border-[#d8cdb7] bg-white text-[#4f5763] hover:bg-[#fbfaf7]'
              }`}
            >
              <DeviceIcon inactive={!deviceAlertsEnabled} />
              {deviceAlertButtonLabel}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb7] bg-white px-3.5 py-2 text-sm font-semibold text-[#4f5763] transition hover:bg-[#fbfaf7] hover:text-[#101c2d]"
            >
              <SoundIcon muted={!soundEnabled} />
              {soundEnabled ? 'Sound on' : 'Sound off'}
            </button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <StaffFilterPills
            options={filterOptions}
            value={filter}
            onChange={(nextFilter) => {
              setFilter(nextFilter);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <StaffInfoPill tone={unreadCount > 0 ? 'warm' : 'accent'}>
              {unreadCount} unread
            </StaffInfoPill>
            <StaffInfoPill tone={deviceAlertsEnabled ? 'accent' : 'neutral'}>
              {deviceAlertsEnabled ? 'Alerts enabled' : 'Alerts muted'}
            </StaffInfoPill>
            <StaffInfoPill tone={soundEnabled ? 'info' : 'neutral'}>
              {soundEnabled ? 'Sound ready' : 'Sound muted'}
            </StaffInfoPill>
          </div>
        </div>

        {(pageError || error || deviceAlertMessage) && (
          <div className={`mt-5 rounded-[1.25rem] border px-4 py-3 text-sm ${
            pageError || error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-[#e6decc] bg-[#fbfaf7] text-[#5b6472]'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 leading-6">{pageError || error || deviceAlertMessage}</p>
              {deviceAlertMessage && !pageError && !error && (
                <button
                  type="button"
                  onClick={clearInboxMessage}
                  className="shrink-0 rounded-full p-1 text-[#7a828f] transition hover:bg-white hover:text-[#101c2d]"
                  aria-label="Close notification note"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] px-5 py-8 text-sm text-[#67707e]">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <StaffEmptyState
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description={filter === 'unread'
                ? 'Everything in your inbox has been read.'
                : 'New package, flight, service, and consultation activity will appear here automatically.'}
            />
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[1.4rem] border px-4 py-4 transition ${
                    notification.read
                      ? 'border-[#ebe4d3] bg-[#fbfaf7]'
                      : 'border-[#d8c79a] bg-[#fffaf0]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.read && <span className="h-2 w-2 rounded-full bg-[#d4af37]" />}
                        <h3 className="text-sm font-black text-[#101c2d]">
                          {notification.title || 'Staff notification'}
                        </h3>
                        <span className="rounded-full border border-[#e4ddcf] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#7f6a3d]">
                          {formatNotificationType(notification.type)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#5b6472]">
                        {notification.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification)}
                          className="rounded-full border border-[#d8cdb7] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#7f6a3d] transition hover:bg-white"
                        >
                          Mark read
                        </button>
                      )}
                      <Link
                        to={resolveNotificationDestination(notification, role)}
                        className="rounded-full bg-[#101c2d] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#1f3050]"
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkAsRead(notification);
                          }
                        }}
                      >
                        Open queue
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-[#7a828f]">
                    {formatNotificationTime(notification.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#efe8d8] pt-5">
            <div className="text-sm text-[#67707e]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1}
                className="rounded-full border border-[#d8cdb7] px-4 py-2 text-sm font-semibold text-[#4f5763] transition hover:bg-[#fbfaf7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-[#d8cdb7] px-4 py-2 text-sm font-semibold text-[#4f5763] transition hover:bg-[#fbfaf7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </StaffCardSection>
    </StaffPageShell>
  );
};

export default StaffNotificationsPage;
