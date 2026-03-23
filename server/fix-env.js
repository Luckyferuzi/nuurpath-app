const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');

console.log(`🔍 Checking .env file at: ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.log('⚠️ .env file not found. Creating default .env file.');
    fs.writeFileSync(envPath, '');
}

let content = fs.readFileSync(envPath, 'utf8');
let originalContent = content;

// 1. Fix formatting issues (missing newlines)
// Fix: "value"KEY=
if (content.match(/(".*?")([A-Z_]+=)/)) {
    content = content.replace(/(".*?")([A-Z_]+=)/g, '$1\n$2');
}
// Fix: valueKEY= (heuristic: lowercase/number char followed by UPPERCASE_KEY=)
// This handles cases like: ...publicEMAIL_HOST=...
if (content.match(/([a-z0-9])([A-Z_]+=)/)) {
    content = content.replace(/([a-z0-9])([A-Z_]+=)/g, '$1\n$2');
}

// 2. Parse and validate
const envConfig = dotenv.parse(content);
const defaults = {
    PORT: '5001',
    JWT_SECRET: 'Nuurpath2025',
    DATABASE_URL: 'postgresql://postgres:admin%40123@localhost:5432/nuurpath_travels?schema=public',
    EMAIL_SERVICE: 'gmail',
    EMAIL_USER: 'your-email@gmail.com',
    EMAIL_PASS: 'your-app-password',
    ADMIN_EMAIL: 'admin@nuurpath.com'
};

let updates = [];
const requiredKeys = ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL'];

requiredKeys.forEach(key => {
    if (!envConfig[key]) {
        console.log(`➕ Missing ${key}. Adding default value.`);
        updates.push(`${key}=${defaults[key]}`);
    } else if (key === 'DATABASE_URL') {
        if (!envConfig[key].startsWith('postgres')) {
            console.log(`⚠️ Invalid DATABASE_URL. Updating to PostgreSQL default.`);
            // Replace the existing line in content
            const regex = new RegExp(`^${key}\\s*=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${defaults[key]}`);
            } else {
                updates.push(`${key}=${defaults[key]}`);
            }
        } else if (!envConfig[key].includes('schema=')) {
            console.log(`⚠️ DATABASE_URL missing schema. Appending ?schema=public`);
            const separator = envConfig[key].includes('?') ? '&' : '?';
            const newUrl = `${envConfig[key]}${separator}schema=public`;
            const regex = new RegExp(`^${key}\\s*=.*$`, 'm');
            content = content.replace(regex, `${key}=${newUrl}`);
        }
    }
});

if (updates.length > 0) {
    if (content && !content.endsWith('\n')) content += '\n';
    content += updates.join('\n') + '\n';
}

if (content !== originalContent) {
    fs.writeFileSync(envPath, content);
    console.log('✅ .env file updated successfully.');
} else {
    console.log('✅ .env file appears correct and complete.');
}