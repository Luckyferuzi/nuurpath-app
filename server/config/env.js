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
  PORT: Number(optionalEnv('PORT', 5000)),
  CLIENT_URL: optionalEnv('CLIENT_URL', 'http://localhost:3000'),
  API_BASE_URL: optionalEnv('API_BASE_URL', 'http://localhost:5000'),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ALLOWED_ORIGINS,
  UPLOAD_ROOT: optionalEnv('UPLOAD_ROOT', ''),
  EMAIL_HOST: optionalEnv('EMAIL_HOST', ''),
  EMAIL_PORT: optionalEnv('EMAIL_PORT', ''),
  EMAIL_USER: optionalEnv('EMAIL_USER', ''),
  EMAIL_PASS: optionalEnv('EMAIL_PASS', ''),
  EMAIL_FROM: optionalEnv('EMAIL_FROM', ''),
  ADMIN_EMAIL: optionalEnv('ADMIN_EMAIL', ''),
  GOOGLE_CLIENT_ID: optionalEnv('GOOGLE_CLIENT_ID', ''),
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

  const emailFieldNames = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const configuredEmailFieldCount = emailFieldNames.filter((fieldName) => Boolean(String(process.env[fieldName] || '').trim())).length;

  if (configuredEmailFieldCount > 0 && configuredEmailFieldCount < emailFieldNames.length) {
    throw new Error('EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS must all be configured together in production.');
  }

  if (configuredEmailFieldCount === emailFieldNames.length) {
    requireEnv('ADMIN_EMAIL');

    const parsedEmailPort = Number.parseInt(env.EMAIL_PORT, 10);
    if (!Number.isInteger(parsedEmailPort) || parsedEmailPort <= 0) {
      throw new Error('EMAIL_PORT must be a valid positive integer in production.');
    }
  }
}

module.exports = env;
