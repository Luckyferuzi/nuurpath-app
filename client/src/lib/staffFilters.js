export const STAFF_TIME_WINDOW_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function matchesCreatedAtWindow(record, timeWindow, getDateValue = (value) => value?.createdAt) {
  if (!record || timeWindow === 'all') {
    return true;
  }

  const rawDate = getDateValue(record);
  if (!rawDate) {
    return false;
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const now = new Date();
  const cutoff = new Date(now);

  if (timeWindow === '7d') {
    cutoff.setDate(now.getDate() - 7);
    return parsedDate >= cutoff;
  }

  if (timeWindow === '30d') {
    cutoff.setDate(now.getDate() - 30);
    return parsedDate >= cutoff;
  }

  if (timeWindow === '90d') {
    cutoff.setDate(now.getDate() - 90);
    return parsedDate >= cutoff;
  }

  return true;
}
