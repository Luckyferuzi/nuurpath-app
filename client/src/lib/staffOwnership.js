export function getStaffDisplayName(staffMember, fallback = 'Unassigned') {
  if (!staffMember || typeof staffMember !== 'object') {
    return fallback;
  }

  return staffMember.name || staffMember.email || fallback;
}

export function getStaffRoleLabel(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (normalizedRole === 'admin') {
    return 'Admin';
  }

  if (normalizedRole === 'manager') {
    return 'Manager';
  }

  return 'Staff';
}

export function getAttentionToneClass(level) {
  const normalizedLevel = String(level || '').trim().toLowerCase();

  if (normalizedLevel === 'high') {
    return 'bg-red-100 text-red-700';
  }

  if (normalizedLevel === 'medium') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-gray-100 text-gray-700';
}

export function formatDayAge(days, fallback = 'Today') {
  if (days === null || days === undefined || Number.isNaN(Number(days))) {
    return 'Not recorded';
  }

  const normalizedDays = Math.max(0, Number(days));
  if (normalizedDays === 0) {
    return fallback;
  }

  return normalizedDays === 1 ? '1 day' : `${normalizedDays} days`;
}

export function isOwnedByCurrentStaff(record, currentUserId) {
  if (!currentUserId) {
    return false;
  }

  return Number(record?.assignedStaff?.id) === Number(currentUserId);
}
