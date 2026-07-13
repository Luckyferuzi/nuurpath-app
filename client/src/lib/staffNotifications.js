export function resolveNotificationDestination(notification, role = 'admin') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedType = String(notification?.type || '').trim().toUpperCase();

  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    if (['NEW_BOOKING', 'PACKAGE_REQUEST', 'BOOKING_UPDATE', 'BOOKING_CANCELLED'].includes(normalizedType)) {
      return '/admin/package-bookings';
    }

    if (['NEW_FLIGHT_REQUEST', 'FLIGHT_CANCELLED'].includes(normalizedType)) {
      return '/admin/flight-bookings';
    }

    if (normalizedType === 'NEW_SERVICE_INQUIRY') {
      return '/admin/service-inquiries';
    }

    if (normalizedType === 'NEW_CONSULTATION') {
      return '/admin/consultations';
    }

    return '/admin';
  }

  return '/dashboard?tab=notifications';
}

export function formatNotificationTime(value) {
  if (!value) {
    return 'Just now';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return 'Just now';
  }

  const now = new Date();
  const diffMs = now.getTime() - parsedValue.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return parsedValue.toLocaleDateString();
}
