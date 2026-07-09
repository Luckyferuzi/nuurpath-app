import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';
const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export function normalizeApiBaseUrl(value) {
  const resolvedValue = String(value || '').trim() || DEFAULT_API_BASE_URL;
  return resolvedValue.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/i, '');

export function getStoredAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function resolveBackendUrl(path) {
  if (!path) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${normalizedPath}`;
}

function normalizeApiPath(url) {
  const normalizedUrl = String(url || '').trim();

  if (!normalizedUrl) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith(API_BASE_URL)) {
    return normalizedUrl.slice(API_BASE_URL.length) || '/';
  }

  if (normalizedUrl.startsWith('/api/')) {
    return normalizedUrl.slice(4);
  }

  if (normalizedUrl === '/api') {
    return '/';
  }

  return normalizedUrl;
}

let authFailureHandler = null;

export function setApiAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === 'function' ? handler : null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  const nextConfig = {
    ...config,
    headers: {
      ...(config.headers || {}),
    },
  };

  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;

    if (!nextConfig.headers['x-auth-token']) {
      nextConfig.headers['x-auth-token'] = token;
    }
  }

  if (nextConfig.url && !ABSOLUTE_URL_PATTERN.test(nextConfig.url)) {
    nextConfig.url = normalizeApiPath(nextConfig.url);
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && authFailureHandler) {
      authFailureHandler(error);
    }

    return Promise.reject(error);
  }
);

export default api;
