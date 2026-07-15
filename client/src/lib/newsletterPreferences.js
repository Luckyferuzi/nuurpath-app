export const NEWSLETTER_SUBSCRIBED_STORAGE_KEY = 'nuurpath-newsletter-subscribed';
export const NEWSLETTER_REMINDER_DISMISSED_AT_KEY = 'nuurpath-newsletter-reminder-dismissed-at';
export const NEWSLETTER_OPTED_OUT_STORAGE_KEY = 'nuurpath-newsletter-opted-out';
export const NEWSLETTER_REMINDER_SNOOZE_DAYS = 7;

function readStorage(key) {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) || '';
  } catch (error) {
    return '';
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures so the UI still works in restrictive browsers.
  }
}

function removeStorage(key) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage failures so the UI still works in restrictive browsers.
  }
}

export function markNewsletterSubscribed() {
  writeStorage(NEWSLETTER_SUBSCRIBED_STORAGE_KEY, String(Date.now()));
  removeStorage(NEWSLETTER_OPTED_OUT_STORAGE_KEY);
}

export function hasNewsletterSubscriptionMarker() {
  return Boolean(readStorage(NEWSLETTER_SUBSCRIBED_STORAGE_KEY));
}

export function markNewsletterOptedOut() {
  writeStorage(NEWSLETTER_OPTED_OUT_STORAGE_KEY, String(Date.now()));
}

export function hasNewsletterOptOutMarker() {
  return Boolean(readStorage(NEWSLETTER_OPTED_OUT_STORAGE_KEY));
}

export function dismissNewsletterReminder() {
  writeStorage(NEWSLETTER_REMINDER_DISMISSED_AT_KEY, String(Date.now()));
}

export function canShowNewsletterReminder() {
  if (hasNewsletterSubscriptionMarker() || hasNewsletterOptOutMarker()) {
    return false;
  }

  const rawDismissedAt = readStorage(NEWSLETTER_REMINDER_DISMISSED_AT_KEY);
  const dismissedAt = Number.parseInt(rawDismissedAt, 10);

  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) {
    return true;
  }

  const snoozeWindowMs = NEWSLETTER_REMINDER_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt >= snoozeWindowMs;
}
