import React from 'react';
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
    requestDeviceAlerts,
    disableBackgroundAlerts,
    toggleSound,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useStaffNotifications();

  const deviceAlertStatusLabel = pushEnabled
    ? 'Background alerts on'
    : notificationPermission === 'granted'
      ? (pushConfigured ? 'Foreground alerts on' : 'Popup alerts on')
      : notificationPermission === 'denied'
        ? 'Alerts blocked'
        : 'Enable alerts';

  return (
    <div className="border-b border-white/10 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Staff alerts</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-[#d8c79a]">
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-[#d8c79a] px-1.5 py-0.5 text-[10px] font-black text-[#101c2d]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black text-white">
                {loading ? 'Loading alerts...' : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                {role === 'manager' ? 'Manager inbox' : 'Admin inbox'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pushEnabled ? disableBackgroundAlerts : requestDeviceAlerts}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
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
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
          pushEnabled ? 'bg-[#d8c79a]/20 text-[#f4df9c]' : 'bg-white/8 text-white/65'
        }`}>
          {deviceAlertStatusLabel}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
          soundEnabled ? 'bg-white/8 text-white/70' : 'bg-white/5 text-white/45'
        }`}>
          {soundEnabled ? 'Sound on' : 'Sound off'}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsAsRead}
            className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/8 hover:text-white"
          >
            Mark all read
          </button>
        )}
      </div>

      {(deviceAlertMessage || error) && (
        <div className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm leading-6 ${
          error
            ? 'border-red-400/20 bg-red-500/10 text-red-100'
            : 'border-white/10 bg-white/6 text-white/75'
        }`}>
          {error || deviceAlertMessage}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {sidebarNotifications.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/5 px-4 py-4 text-sm leading-6 text-white/55">
            New package, flight, service, and consultation alerts will appear here automatically.
          </div>
        ) : (
          sidebarNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-[1.25rem] border px-4 py-4 ${
                notification.read
                  ? 'border-white/8 bg-white/5'
                  : 'border-[#d8c79a]/30 bg-[#d8c79a]/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-[#f4df9c]" />}
                    <h3 className="truncate text-sm font-black text-white">{notification.title || 'Staff notification'}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/8 hover:text-white"
                  >
                    Read
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-white/45">{formatNotificationTime(notification.createdAt)}</span>
                <Link
                  to={resolveNotificationDestination(notification, role)}
                  className="text-xs font-black uppercase tracking-[0.16em] text-[#f4df9c] transition hover:text-white"
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
