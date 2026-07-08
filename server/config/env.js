const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const defaultDevelopmentOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];
const defaultProductionOrigins = [
  'https://nuurpath.com',
  'https://www.nuurpath.com',
];

function requireEnv(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name];

  if (value && String(value).trim()) {
    return value;
  }

  return fallback;
}

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

const configuredAllowedOrigins = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS
    || (isProduction
      ? defaultProductionOrigins.join(',')
      : defaultDevelopmentOrigins.join(','))
);

const clientUrlOrigin = normalizeOrigin(process.env.CLIENT_URL || (!isProduction ? 'http://localhost:3000' : ''));
const ALLOWED_ORIGINS = Array.from(
  new Set([
    ...configuredAllowedOrigins,
    clientUrlOrigin,
  ].filter(Boolean))
);

const env = {
  NODE_ENV,
  isProduction,
  PORT: Number(optionalEnv('PORT', 5001)),
  CLIENT_URL: optionalEnv('CLIENT_URL', 'http://localhost:3000'),
  API_BASE_URL: optionalEnv('API_BASE_URL', 'http://localhost:5001'),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ALLOWED_ORIGINS,
  RECAPTCHA_SECRET_KEY: optionalEnv('RECAPTCHA_SECRET_KEY', ''),
  UPLOAD_ROOT: optionalEnv('UPLOAD_ROOT', ''),
};

if (isProduction) {
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET');
  requireEnv('CLIENT_URL');
  requireEnv('API_BASE_URL');

  if (env.JWT_SECRET === 'secret' || env.JWT_SECRET === 'your-secret-key' || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be a strong production secret with at least 32 characters.');
  }

  if (!env.CLIENT_URL.startsWith('https://')) {
    throw new Error('CLIENT_URL must use https:// in production.');
  }

  if (!env.API_BASE_URL.startsWith('https://')) {
    throw new Error('API_BASE_URL must use https:// in production.');
  }

  env.ALLOWED_ORIGINS.forEach((origin) => {
    if (origin === '*') {
      throw new Error('ALLOWED_ORIGINS cannot contain wildcard origins in production.');
    }

    if (!origin.startsWith('https://')) {
      throw new Error(`ALLOWED_ORIGINS must use https:// in production. Invalid origin: ${origin}`);
    }
  });
}

module.exports = env;
