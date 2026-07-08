const REDACTED_VALUE = '[Redacted]';
const BODY_PLACEHOLDER = '[Request body omitted]';
const BINARY_PLACEHOLDER = '[Binary content omitted]';
const CIRCULAR_PLACEHOLDER = '[Circular]';

function normalizeKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key) {
    const normalizedKey = normalizeKey(key);

    return normalizedKey === 'password'
        || normalizedKey.includes('token')
        || normalizedKey.includes('authorization')
        || normalizedKey.includes('cookie')
        || normalizedKey.includes('secret')
        || normalizedKey.includes('jwt')
        || normalizedKey === 'emailpass'
        || normalizedKey === 'emailpassword'
        || normalizedKey === 'databaseurl';
}

function shouldOmitBody(key) {
    const normalizedKey = normalizeKey(key);
    return normalizedKey === 'body' || normalizedKey === 'requestbody' || normalizedKey === 'reqbody';
}

function sanitizeValue(value, key, seen) {
    if (shouldOmitBody(key)) {
        return BODY_PLACEHOLDER;
    }

    if (isSensitiveKey(key)) {
        return REDACTED_VALUE;
    }

    if (Buffer.isBuffer(value)) {
        return `${BINARY_PLACEHOLDER} (length=${value.length})`;
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            code: value.code,
            statusCode: value.statusCode,
            stack: value.stack,
        };
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, key, seen));
    }

    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (value && typeof value === 'object') {
        if (seen.has(value)) {
            return CIRCULAR_PLACEHOLDER;
        }

        seen.add(value);
        const sanitizedObject = {};

        for (const [childKey, childValue] of Object.entries(value)) {
            sanitizedObject[childKey] = sanitizeValue(childValue, childKey, seen);
        }

        seen.delete(value);
        return sanitizedObject;
    }

    return value;
}

function writeLog(level, message, meta) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
    };

    if (meta !== undefined) {
        entry.meta = sanitizeValue(meta, undefined, new WeakSet());
    }

    const serializedEntry = JSON.stringify(entry);

    if (level === 'error') {
        console.error(serializedEntry);
        return;
    }

    if (level === 'warn') {
        console.warn(serializedEntry);
        return;
    }

    console.log(serializedEntry);
}

module.exports = {
    info(message, meta) {
        writeLog('info', message, meta);
    },
    warn(message, meta) {
        writeLog('warn', message, meta);
    },
    error(message, meta) {
        writeLog('error', message, meta);
    },
};
