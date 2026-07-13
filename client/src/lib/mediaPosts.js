import { resolveBackendUrl } from './api';

const PLACEHOLDER_IMAGE = 'https://placehold.co/1200x900/0B1C3E/D4AF37?text=NuurPath+Story';

export function getMediaPostImageUrls(post) {
  const images = Array.isArray(post?.images) ? post.images : [];

  if (images.length === 0) {
    return [PLACEHOLDER_IMAGE];
  }

  return images.map((image) => resolveBackendUrl(image));
}

export function getMediaPostHeroImage(post) {
  return getMediaPostImageUrls(post)[0];
}

export function formatMediaPostDate(value, options = {}) {
  if (!value) {
    return 'Recent story';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recent story';
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatMediaPostRelativeTime(value) {
  if (!value) {
    return 'Just now';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Just now';
  }

  const diffMs = parsedDate.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, 'month');
  }

  const diffYears = Math.round(diffMonths / 12);
  return formatter.format(diffYears, 'year');
}

export function getMediaPostExcerpt(text, maxLength = 160) {
  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    return '';
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatMediaPostInteractionLabel(type) {
  const normalizedType = String(type || '').trim().toUpperCase();

  if (normalizedType === 'LIKE') {
    return 'Liked this story';
  }

  if (normalizedType === 'VIDEO_VIEW') {
    return 'Opened the video';
  }

  return 'Interacted with this story';
}
