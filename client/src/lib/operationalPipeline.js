export const PIPELINE_STATUS_OPTIONS = [
  'New',
  'Contacted',
  'Qualified',
  'Docs Requested',
  'Docs Received',
  'Quoted',
  'WhatsApp Follow-up',
  'Confirmed Offline',
  'Completed',
  'Cancelled',
  'Lost',
];

const LEGACY_STATUS_ALIASES = {
  pending: 'New',
  confirmed: 'Confirmed Offline',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  completed: 'Completed',
  'in progress': 'In Progress',
};

export function getOperationalStatusLabel(status) {
  if (status === undefined || status === null) {
    return 'New';
  }

  const trimmedStatus = String(status).trim();
  if (!trimmedStatus) {
    return 'New';
  }

  const canonicalStatus = PIPELINE_STATUS_OPTIONS.find((option) => option.toLowerCase() === trimmedStatus.toLowerCase());
  if (canonicalStatus) {
    return canonicalStatus;
  }

  return LEGACY_STATUS_ALIASES[trimmedStatus.toLowerCase()] || trimmedStatus;
}

export function getOperationalStatusOptions(currentStatus) {
  const normalizedCurrentStatus = getOperationalStatusLabel(currentStatus);
  if (!normalizedCurrentStatus || PIPELINE_STATUS_OPTIONS.includes(normalizedCurrentStatus)) {
    return PIPELINE_STATUS_OPTIONS;
  }

  return [...PIPELINE_STATUS_OPTIONS, normalizedCurrentStatus];
}

export function getOperationalStatusTone(status) {
  const label = getOperationalStatusLabel(status);

  if (label === 'Confirmed Offline' || label === 'Completed') {
    return 'success';
  }

  if (label === 'Cancelled' || label === 'Lost') {
    return 'danger';
  }

  if (
    label === 'Contacted' ||
    label === 'Qualified' ||
    label === 'Docs Requested' ||
    label === 'Docs Received' ||
    label === 'Quoted' ||
    label === 'WhatsApp Follow-up' ||
    label === 'In Progress'
  ) {
    return 'info';
  }

  return 'warning';
}

export function getOperationalStatusBadgeStyle(status) {
  switch (getOperationalStatusTone(status)) {
    case 'success':
      return { backgroundColor: '#d4edda', color: '#155724' };
    case 'danger':
      return { backgroundColor: '#f8d7da', color: '#721c24' };
    case 'info':
      return { backgroundColor: '#d1ecf1', color: '#0c5460' };
    default:
      return { backgroundColor: '#fff3cd', color: '#856404' };
  }
}

export function getOperationalStatusBadgeClassName(status) {
  switch (getOperationalStatusTone(status)) {
    case 'success':
      return 'bg-green-100 text-green-700';
    case 'danger':
      return 'bg-red-100 text-red-700';
    case 'info':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

export function isOperationalConfirmedStatus(status) {
  return getOperationalStatusLabel(status) === 'Confirmed Offline';
}

export function isOperationalCancelledStatus(status) {
  const label = getOperationalStatusLabel(status);
  return label === 'Cancelled' || label === 'Lost';
}

export function isOperationalCompletedStatus(status) {
  return getOperationalStatusLabel(status) === 'Completed';
}

export function isOperationalOpenStatus(status) {
  return !isOperationalCancelledStatus(status) && !isOperationalCompletedStatus(status);
}
