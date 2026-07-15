import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStaffNotifications } from '../contexts/StaffNotificationsContext.jsx';
import { formatNotificationTime, resolveNotificationDestination } from '../lib/staffNotifications.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffInfoPill,
  StaffPageShell,
} from './staff/WorkspacePrimitives.jsx';

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
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
    notifications,
    unreadCount,
    loading,
    role,
    error,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useStaffNotifications();

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  return (
    <StaffPageShell
      eyebrow="Staff Inbox"
      title="Notifications"
      description="Only unread notifications stay here. Once a notification is opened or marked read, it leaves this list."
      actions={(
        <>
          <button
            type="button"
            onClick={refreshNotifications}
            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb7] bg-white px-4 py-2 text-sm font-semibold text-[#4f5763] transition hover:border-[#bca77a] hover:text-[#101c2d]"
          >
            <RefreshIcon />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="rounded-full bg-[#101c2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f3050]"
            >
              Mark all read
            </button>
          )}
        </>
      )}
    >
      <StaffCardSection
        title="Unread notifications"
        description={unreadNotifications.length > 0
          ? `${unreadNotifications.length} active notification${unreadNotifications.length === 1 ? '' : 's'} are waiting for review.`
          : 'There are no active notifications right now.'}
        actions={unreadNotifications.length > 0 ? <StaffInfoPill tone="warm">{unreadNotifications.length} active</StaffInfoPill> : <StaffInfoPill tone="accent">Inbox clear</StaffInfoPill>}
      >
        {error && (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5">
          {loading && unreadNotifications.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] px-5 py-8 text-sm text-[#67707e]">
              Loading notifications...
            </div>
          ) : unreadNotifications.length === 0 ? (
            <StaffEmptyState
              title="No notifications right now"
              description="New package, flight, service, and consultation activity will appear here automatically."
            />
          ) : (
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-[1.4rem] border border-[#d8c79a] bg-[#fffaf0] px-4 py-4 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
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
                      <button
                        type="button"
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="rounded-full border border-[#d8cdb7] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#7f6a3d] transition hover:bg-white"
                      >
                        Mark read
                      </button>
                      <Link
                        to={resolveNotificationDestination(notification, role)}
                        className="rounded-full bg-[#101c2d] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#1f3050]"
                        onClick={() => markNotificationAsRead(notification.id)}
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
      </StaffCardSection>
    </StaffPageShell>
  );
};

export default StaffNotificationsPage;
