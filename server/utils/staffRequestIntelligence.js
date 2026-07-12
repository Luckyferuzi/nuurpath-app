const {
    isActiveFollowUpStatus,
    isLostOperationalStatus,
    isNewOperationalStatus,
    isWonOperationalStatus,
    normalizeOperationalStatus,
} = require('./operationalPipeline');
const { isAdmin, isAdminOrManager, normalizeRole } = require('./roles');
const { toPositiveInteger } = require('./validation');

const STAFF_USER_SUMMARY_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
};

function toValidDate(value) {
    if (!value) {
        return null;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getAgeInDays(value) {
    const date = toValidDate(value);
    if (!date) {
        return null;
    }

    const elapsedMs = Date.now() - date.getTime();
    return elapsedMs < 0 ? 0 : Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
}

function buildStaffSummary(user) {
    if (!user || typeof user !== 'object') {
        return null;
    }

    return {
        id: user.id,
        name: user.name || null,
        email: user.email || null,
        role: normalizeRole(user.role, ''),
    };
}

function getQueueLabel(queueBucket) {
    switch (queueBucket) {
        case 'new':
            return 'New requests';
        case 'documents':
            return 'Waiting for documents';
        case 'overdue':
            return 'Overdue follow-up';
        case 'won':
            return 'Won or completed';
        case 'lost':
            return 'Lost or cancelled';
        default:
            return 'Ready for follow-up';
    }
}

function buildRequestWorkflowSignals(record, {
    waitingForDocuments = false,
    priorityLabel = null,
    newResponseDays = 1,
    followUpOverdueDays = 2,
    documentOverdueDays = 3,
} = {}) {
    const status = normalizeOperationalStatus(record?.status) || 'New';
    const assignedStaff = buildStaffSummary(record?.assignedStaff);
    const lastUpdatedBy = buildStaffSummary(record?.lastUpdatedBy);
    const isClosed = isLostOperationalStatus(status);
    const isWon = isWonOperationalStatus(status);
    const isNew = isNewOperationalStatus(status);
    const isActiveFollowUp = isActiveFollowUpStatus(status);
    const isUnassigned = !assignedStaff;
    const normalizedPriority = String(priorityLabel || '').trim().toLowerCase();
    const isHighPriority = normalizedPriority === 'high';

    const lastActionAt = toValidDate(record?.updatedAt) || toValidDate(record?.createdAt);
    const lastFollowUpAt = toValidDate(record?.lastContactedAt);
    const followUpReferenceAt = lastFollowUpAt || toValidDate(record?.assignedAt) || lastActionAt;
    const daysSinceLastAction = getAgeInDays(lastActionAt);
    const daysSinceLastFollowUp = getAgeInDays(followUpReferenceAt);

    const overdueThreshold = waitingForDocuments ? documentOverdueDays : followUpOverdueDays;
    const isOverdueFollowUp = !isClosed && !isWon && (
        (isNew && daysSinceLastFollowUp !== null && daysSinceLastFollowUp >= newResponseDays) ||
        ((isActiveFollowUp || waitingForDocuments) && daysSinceLastFollowUp !== null && daysSinceLastFollowUp >= overdueThreshold)
    );

    let queueBucket = 'follow-up';
    if (isClosed) {
        queueBucket = 'lost';
    } else if (isWon) {
        queueBucket = 'won';
    } else if (isNew) {
        queueBucket = 'new';
    } else if (waitingForDocuments) {
        queueBucket = 'documents';
    } else if (isOverdueFollowUp) {
        queueBucket = 'overdue';
    }

    const attentionReasons = [];
    if (!isClosed && !isWon && isOverdueFollowUp) {
        attentionReasons.push('Overdue follow-up');
    }
    if (!isClosed && !isWon && waitingForDocuments) {
        attentionReasons.push('Waiting for customer documents');
    }
    if (!isClosed && !isWon && isUnassigned) {
        attentionReasons.push('No owner assigned');
    }
    if (!isClosed && !isWon && isHighPriority) {
        attentionReasons.push('Urgent customer timing');
    }

    let attentionLevel = 'normal';
    if (!isClosed && !isWon && (isOverdueFollowUp || isHighPriority)) {
        attentionLevel = 'high';
    } else if (!isClosed && !isWon && (waitingForDocuments || isUnassigned)) {
        attentionLevel = 'medium';
    }

    return {
        assignedStaff,
        lastUpdatedBy,
        isAssignedToStaff: Boolean(assignedStaff),
        isUnassigned,
        lastActionAt,
        lastFollowUpAt,
        lastStatusChangedAt: toValidDate(record?.lastStatusChangedAt),
        daysSinceLastAction,
        daysSinceLastFollowUp,
        isWaitingForDocuments: waitingForDocuments,
        isOverdueFollowUp,
        needsAttention: attentionReasons.length > 0,
        attentionLevel,
        attentionReasons,
        queueBucket,
        queueLabel: getQueueLabel(queueBucket),
        priorityLabel: priorityLabel || null,
    };
}

function buildStaffWhereClause() {
    return {
        OR: [
            {
                role: {
                    equals: 'admin',
                    mode: 'insensitive',
                },
            },
            {
                role: {
                    equals: 'manager',
                    mode: 'insensitive',
                },
            },
        ],
    };
}

function createAssignmentError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function resolveAssignedStaffInput(prisma, rawAssignedStaffId, actor) {
    if (rawAssignedStaffId === undefined) {
        return { hasAssignmentChange: false };
    }

    const actorId = toPositiveInteger(actor?.id);
    if (actorId === null || !isAdminOrManager(actor)) {
        throw createAssignmentError('Only staff users can assign request ownership.', 403);
    }

    if (rawAssignedStaffId === null || rawAssignedStaffId === '') {
        if (!isAdmin(actor)) {
            throw createAssignmentError('Managers can only assign requests to themselves.');
        }

        return {
            hasAssignmentChange: true,
            assignedStaffId: null,
        };
    }

    const normalizedAssignedStaffId = toPositiveInteger(rawAssignedStaffId);
    if (normalizedAssignedStaffId === null) {
        throw createAssignmentError('Assigned owner must be a positive integer staff id.');
    }

    if (!isAdmin(actor) && normalizedAssignedStaffId !== actorId) {
        throw createAssignmentError('Managers can only assign requests to themselves.');
    }

    const assignedStaff = await prisma.user.findFirst({
        where: {
            id: normalizedAssignedStaffId,
            ...buildStaffWhereClause(),
        },
        select: STAFF_USER_SUMMARY_SELECT,
    });

    if (!assignedStaff) {
        throw createAssignmentError('Selected owner must be an admin or manager account.');
    }

    return {
        hasAssignmentChange: true,
        assignedStaffId: assignedStaff.id,
        assignedStaff,
    };
}

module.exports = {
    STAFF_USER_SUMMARY_SELECT,
    buildRequestWorkflowSignals,
    buildStaffSummary,
    buildStaffWhereClause,
    getQueueLabel,
    resolveAssignedStaffInput,
};
