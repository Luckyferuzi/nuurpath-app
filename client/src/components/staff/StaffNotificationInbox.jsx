import React from 'react';
import { Link } from 'react-router-dom';
import { useStaffNotifications } from '../../contexts/StaffNotificationsContext.jsx';

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function DeviceIcon({ inactive = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    pushEnabled,
    notificationPermission,
    soundEnabled,
    requestDeviceAlerts,
    disableBackgroundAlerts,
    toggleSound,
  } = useStaffNotifications();

  const deviceAlertsEnabled = pushEnabled || notificationPermission === 'granted';
  const deviceAlertsBlocked = notificationPermission === 'denied';
  const deviceAlertLabel = pushEnabled
    ? 'Turn off background alerts'
    : deviceAlertsEnabled
      ? 'Browser alerts are available'
      : 'Turn on device alerts';

  return (
    <div className="border-b border-white/10 px-4 py-4">
      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/admin/notifications"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#d8c79a]/10 text-[#f4df9c] transition hover:bg-[#d8c79a]/18 hover:text-white"
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Open notifications'}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Open notifications'}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#d8c79a] px-1.5 py-0.5 text-[10px] font-black text-[#101c2d]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={pushEnabled ? disableBackgroundAlerts : requestDeviceAlerts}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
              pushEnabled
                ? 'border-[#d8c79a]/45 bg-[#d8c79a]/18 text-[#f4df9c] hover:bg-[#d8c79a]/26'
                : deviceAlertsBlocked
                  ? 'border-red-400/35 bg-red-500/10 text-red-200 hover:bg-red-500/15'
                  : deviceAlertsEnabled
                    ? 'border-white/15 bg-white/10 text-white hover:bg-white/14'
                    : 'border-white/10 bg-white/6 text-white/68 hover:bg-white/10 hover:text-white'
            }`}
            aria-label={deviceAlertLabel}
            title={deviceAlertLabel}
          >
            <DeviceIcon inactive={!deviceAlertsEnabled} />
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
              soundEnabled
                ? 'border-white/10 bg-white/6 text-white/85 hover:bg-white/10 hover:text-white'
                : 'border-white/10 bg-transparent text-white/45 hover:bg-white/6 hover:text-white/75'
            }`}
            aria-label={soundEnabled ? 'Mute notification sound' : 'Turn on notification sound'}
            title={soundEnabled ? 'Mute notification sound' : 'Turn on notification sound'}
          >
            <SoundIcon muted={!soundEnabled} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffNotificationInbox;
