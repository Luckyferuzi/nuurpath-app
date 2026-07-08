const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, '.env.example');

const requiredKeys = [
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
  'API_BASE_URL',
  'DATABASE_URL',
  'JWT_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
  'RECAPTCHA_SECRET_KEY',
  'GOOGLE_CLIENT_ID',
];

console.log(`Checking environment file: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error('No server/.env file found.');
  console.error(`Copy ${examplePath} to ${envPath} and fill in real values locally.`);
  process.exit(1);
}

let envConfig;

try {
  envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
} catch (error) {
  console.error('Unable to parse server/.env.');
  console.error(error.message);
  process.exit(1);
}

const missingKeys = requiredKeys.filter((key) => !envConfig[key] || !String(envConfig[key]).trim());

if (missingKeys.length > 0) {
  console.error('Missing required environment variables:');
  missingKeys.forEach((key) => console.error(`- ${key}`));
  console.error(`Use ${examplePath} as the safe template.`);
}

if (envConfig.NODE_ENV === 'production') {
  console.error('This helper will not generate or overwrite production secrets.');
  console.error('Set production values in your deployment environment instead.');
}

if (envConfig.JWT_SECRET && (envConfig.JWT_SECRET === 'secret' || envConfig.JWT_SECRET === 'your-secret-key' || envConfig.JWT_SECRET.length < 32)) {
  console.error('JWT_SECRET is too weak for production and should be replaced with a strong secret.');
}

if (envConfig.NODE_ENV === 'production' && envConfig.CLIENT_URL && !envConfig.CLIENT_URL.startsWith('https://')) {
  console.error('CLIENT_URL should use https:// in production.');
}

if (envConfig.NODE_ENV === 'production' && envConfig.API_BASE_URL && !envConfig.API_BASE_URL.startsWith('https://')) {
  console.error('API_BASE_URL should use https:// in production.');
}

if (envConfig.DATABASE_URL && !envConfig.DATABASE_URL.includes('schema=public')) {
  console.error('DATABASE_URL is missing ?schema=public.');
}

if (missingKeys.length === 0) {
  console.log('server/.env contains all required keys.');
}

console.log('No values were written. This helper only validates and reports missing configuration.');
