const PIPELINE_STATUSES = [
    'New',
    'Contacted',
    'Qualified',
    'Docs Requested',
    'Docs Received',
    'Quoted',
    'WhatsApp Follow-up',
    'Confirmed Offline',
    'Completed',
    'Cancelled',
    'Lost',
];

const LEGACY_STATUS_ALIASES = {
    pending: 'New',
    confirmed: 'Confirmed Offline',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    completed: 'Completed',
    'in progress': 'In Progress',
};

const FOLLOW_UP_STATUSES = new Set([
    'Contacted',
    'Qualified',
    'Docs Requested',
    'Docs Received',
    'Quoted',
    'WhatsApp Follow-up',
    'Confirmed Offline',
    'Completed',
    'In Progress',
]);

const WON_STATUSES = new Set(['Confirmed Offline', 'Completed']);
const LOST_STATUSES = new Set(['Cancelled', 'Lost']);
const ACTIVE_FOLLOW_UP_STATUSES = new Set([
    'Contacted',
    'Qualified',
    'Docs Requested',
    'Docs Received',
    'Quoted',
    'WhatsApp Follow-up',
    'In Progress',
]);

function normalizeOperationalStatus(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return null;
    }

    const canonicalStatus = PIPELINE_STATUSES.find((status) => status.toLowerCase() === trimmed.toLowerCase());
    if (canonicalStatus) {
        return canonicalStatus;
    }

    return LEGACY_STATUS_ALIASES[trimmed.toLowerCase()] || null;
}

function getPipelineStatusOptions(currentStatus) {
    const normalizedCurrentStatus = normalizeOperationalStatus(currentStatus);
    if (!normalizedCurrentStatus || PIPELINE_STATUSES.includes(normalizedCurrentStatus)) {
        return [...PIPELINE_STATUSES];
    }

    return [...PIPELINE_STATUSES, normalizedCurrentStatus];
}

function isNewOperationalStatus(value) {
    return normalizeOperationalStatus(value) === 'New';
}

function isWonOperationalStatus(value) {
    return WON_STATUSES.has(normalizeOperationalStatus(value));
}

function isLostOperationalStatus(value) {
    return LOST_STATUSES.has(normalizeOperationalStatus(value));
}

function isActiveFollowUpStatus(value) {
    return ACTIVE_FOLLOW_UP_STATUSES.has(normalizeOperationalStatus(value));
}

function shouldSetLastContactedAt(value) {
    return FOLLOW_UP_STATUSES.has(normalizeOperationalStatus(value));
}

module.exports = {
    PIPELINE_STATUSES,
    getPipelineStatusOptions,
    isActiveFollowUpStatus,
    isLostOperationalStatus,
    isNewOperationalStatus,
    isWonOperationalStatus,
    normalizeOperationalStatus,
    shouldSetLastContactedAt,
};
