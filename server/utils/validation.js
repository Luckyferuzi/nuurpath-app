function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function isNonEmptyString(value) {
    return toTrimmedString(value).length > 0;
}

function isValidEmail(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toTrimmedString(value));
}

function isPositiveInteger(value) {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0;
    }

    if (typeof value !== 'string') {
        return false;
    }

    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
        return false;
    }

    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0;
}

function toPositiveInteger(value) {
    return isPositiveInteger(value) ? Number(value) : null;
}

function isValidDate(value) {
    if (value instanceof Date) {
        return !Number.isNaN(value.getTime());
    }

    if (value === undefined || value === null || value === '') {
        return false;
    }

    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
}

function parseOptionalDate(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (!isValidDate(value)) {
        return null;
    }

    return new Date(value);
}

function toNonNegativeNumber(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (normalizedValue === '') {
        return null;
    }

    const parsed = Number(normalizedValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

function normalizeStatus(value, allowedStatuses) {
    if (value === undefined || value === null) {
        return null;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return null;
    }

    const aliases = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        canceled: 'Cancelled',
        completed: 'Completed',
        contacted: 'Contacted',
    };

    const normalized = aliases[trimmed.toLowerCase()] || trimmed;

    return allowedStatuses.find((status) => status.toLowerCase() === normalized.toLowerCase()) || null;
}

function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();

        if (trimmed === 'true' || trimmed === '1') {
            return true;
        }

        if (trimmed === 'false' || trimmed === '0') {
            return false;
        }
    }

    return null;
}

function sendValidationError(res, message, details) {
    const payload = {
        success: false,
        message,
        msg: message,
    };

    if (details !== undefined) {
        payload.details = details;
    }

    return res.status(400).json(payload);
}

function sendInvalidId(res) {
    return res.status(400).json({
        success: false,
        message: 'Invalid id.',
    });
}

module.exports = {
    isNonEmptyString,
    isPositiveInteger,
    isValidDate,
    isValidEmail,
    normalizeBoolean,
    normalizeStatus,
    parseOptionalDate,
    sendInvalidId,
    sendValidationError,
    toNonNegativeNumber,
    toPositiveInteger,
    toTrimmedString,
};
