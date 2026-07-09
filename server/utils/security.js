const crypto = require('crypto');

function createRandomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPlainTextForHtml(value) {
    return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />');
}

function sanitizeEmailHeaderValue(value, fallback = '') {
    const normalized = String(value ?? fallback)
        .replace(/[\r\n]+/g, ' ')
        .trim();

    return normalized || fallback;
}

module.exports = {
    createRandomToken,
    escapeHtml,
    formatPlainTextForHtml,
    hashToken,
    sanitizeEmailHeaderValue,
};
