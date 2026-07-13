const VISITOR_KEY_STORAGE_KEY = 'nuurpath.story-visitor.v1';
const INTERACTION_STATE_STORAGE_KEY = 'nuurpath.story-interactions.v1';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJsonStorage(key, fallbackValue) {
  if (!canUseLocalStorage()) {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage write failures on restricted browsers.
  }
}

function createFallbackVisitorKey() {
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateMediaPostVisitorKey() {
  if (!canUseLocalStorage()) {
    return createFallbackVisitorKey();
  }

  const existingKey = String(window.localStorage.getItem(VISITOR_KEY_STORAGE_KEY) || '').trim();
  if (existingKey) {
    return existingKey;
  }

  const nextKey = typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : createFallbackVisitorKey();

  window.localStorage.setItem(VISITOR_KEY_STORAGE_KEY, nextKey);
  return nextKey;
}

export function hasTrackedMediaPostInteraction(mediaPostId, type) {
  const store = readJsonStorage(INTERACTION_STATE_STORAGE_KEY, {});
  const postInteractions = store?.[String(mediaPostId)] || {};

  return Boolean(postInteractions[String(type || '').toUpperCase()]);
}

export function markMediaPostInteractionTracked(mediaPostId, type) {
  const normalizedPostId = String(mediaPostId || '').trim();
  const normalizedType = String(type || '').trim().toUpperCase();

  if (!normalizedPostId || !normalizedType) {
    return;
  }

  const store = readJsonStorage(INTERACTION_STATE_STORAGE_KEY, {});
  const nextStore = {
    ...store,
    [normalizedPostId]: {
      ...(store?.[normalizedPostId] || {}),
      [normalizedType]: true,
    },
  };

  writeJsonStorage(INTERACTION_STATE_STORAGE_KEY, nextStore);
}
