export function formatAdminDate(value, fallback = 'Not provided') {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString();
}

export function formatAdminDateTime(value, fallback = 'Not recorded') {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString();
}

function extractFilenameFromDisposition(headerValue) {
  const value = String(headerValue || '').trim();
  if (!value) {
    return '';
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim();
    } catch (error) {
      return utf8Match[1].trim();
    }
  }

  const basicMatch = value.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1]?.trim() || '';
}

export async function openProtectedStaffFile(apiClient, fileReference, { mode = 'preview', fallbackName = 'document' } = {}) {
  if (!fileReference) {
    throw new Error('No file reference was provided.');
  }

  const response = await apiClient.get(fileReference, { responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || 'application/octet-stream';
  const filename = extractFilenameFromDisposition(response.headers?.['content-disposition']) || fallbackName;
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: contentType });
  const objectUrl = window.URL.createObjectURL(blob);

  if (mode === 'download') {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const previewWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

    if (!previewWindow) {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60_000);

  return filename;
}
