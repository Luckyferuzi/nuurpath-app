const crypto = require('crypto');

function generateRequestId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRequestId(value) {
    const trimmedValue = String(value || '').trim();

    if (!trimmedValue) {
        return null;
    }

    if (!/^[A-Za-z0-9._:-]{1,200}$/.test(trimmedValue)) {
        return null;
    }

    return trimmedValue;
}

module.exports = function requestId(req, res, next) {
    const existingRequestId = normalizeRequestId(req.get('x-request-id'));
    const requestIdValue = existingRequestId || generateRequestId();

    req.id = requestIdValue;
    req.requestId = requestIdValue;
    res.setHeader('X-Request-Id', requestIdValue);

    return next();
};
