const prisma = require('../db');
const AppError = require('../utils/AppError');
const {
    sendEmail,
    getEmailServiceAvailability,
} = require('../utils/emailService');
const {
    isValidEmail,
    normalizeBoolean,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    CAMPAIGN_STATUS,
    normalizeCampaignPayload,
    renderCampaignPreview,
    serializeEmailCampaign,
} = require('../utils/emailCampaigns');

const DELIVERY_TYPES = {
    LIVE: 'LIVE',
    TEST: 'TEST',
};

const DELIVERY_STATUS = {
    SENT: 'Sent',
    FAILED: 'Failed',
};

const CAMPAIGN_SEND_BATCH_SIZE = 5;
const RECIPIENT_LOG_BATCH_SIZE = 100;

function normalizeEmail(email) {
    return toTrimmedString(email).toLowerCase();
}

function normalizeSubscriberName(name) {
    return toTrimmedString(name).replace(/\s+/g, ' ');
}

function buildSubscriberWhereClause({ search, status }) {
    const where = {};
    const normalizedSearch = toTrimmedString(search);

    if (normalizedSearch) {
        where.OR = [
            {
                email: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                },
            },
            {
                name: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                },
            },
        ];
    }

    if (status === 'active') {
        where.isActive = true;
    } else if (status === 'inactive') {
        where.isActive = false;
    }

    return where;
}

function buildSubscribersCsv(subscribers) {
    const headers = ['Name', 'Email', 'Status', 'Subscribed Date', 'Unsubscribed Date'];
    const lines = subscribers.map((subscriber) => {
        const cells = [
            subscriber.name || '',
            subscriber.email || '',
            subscriber.isActive ? 'Active' : 'Unsubscribed',
            subscriber.createdAt ? new Date(subscriber.createdAt).toISOString() : '',
            subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt).toISOString() : '',
        ];

        return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...lines].join('\n');
}

function createAudienceSyncOperations(email, { suppress, reason = null, source = null }) {
    const operations = [
        prisma.user.updateMany({
            where: { email },
            data: { emailSubscriptions: !suppress },
        }),
    ];

    if (suppress) {
        operations.push(
            prisma.emailSuppression.upsert({
                where: { email },
                update: {
                    reason,
                    source,
                },
                create: {
                    email,
                    reason,
                    source,
                },
            })
        );
    } else {
        operations.push(
            prisma.emailSuppression.deleteMany({
                where: { email },
            })
        );
    }

    return operations;
}

function buildReachableEmailSet(records, suppressedSet) {
    const emailSet = new Set();

    (Array.isArray(records) ? records : []).forEach((record) => {
        const email = normalizeEmail(record?.email);

        if (email && !suppressedSet.has(email)) {
            emailSet.add(email);
        }
    });

    return emailSet;
}

function buildAudienceReadiness({ activeSubscribers, optedInUsers, suppressedEmails }) {
    const suppressedSet = buildReachableEmailSet(suppressedEmails, new Set());
    const subscriberSet = buildReachableEmailSet(activeSubscribers, suppressedSet);
    const userSet = buildReachableEmailSet(optedInUsers, suppressedSet);
    const combinedSet = new Set([...subscriberSet, ...userSet]);

    return {
        subscribersReachable: subscriberSet.size,
        usersReachable: userSet.size,
        combinedReachable: combinedSet.size,
        suppressed: suppressedSet.size,
    };
}

function normalizeRecipientSource(source) {
    if (source === 'both') {
        return 'Both audiences';
    }

    if (source === 'user') {
        return 'Registered user';
    }

    return 'Subscriber';
}

function buildPreviewRecipients({ activeSubscribers, optedInUsers, suppressedEmails }) {
    const suppressedSet = buildReachableEmailSet(suppressedEmails, new Set());
    const mergedRecipients = new Map();

    const addRecipient = (record, source) => {
        const email = normalizeEmail(record?.email);

        if (!email || suppressedSet.has(email)) {
            return;
        }

        const existing = mergedRecipients.get(email);
        const normalizedName = normalizeSubscriberName(record?.name);

        if (!existing) {
            mergedRecipients.set(email, {
                id: `preview-${email}`,
                name: normalizedName,
                email,
                source,
            });
            return;
        }

        mergedRecipients.set(email, {
            ...existing,
            name: existing.name || normalizedName,
            source: existing.source === source ? existing.source : 'both',
        });
    };

    (Array.isArray(activeSubscribers) ? activeSubscribers : []).forEach((record) => addRecipient(record, 'subscriber'));
    (Array.isArray(optedInUsers) ? optedInUsers : []).forEach((record) => addRecipient(record, 'user'));

    return Array.from(mergedRecipients.values())
        .sort((firstRecipient, secondRecipient) => {
            const firstLabel = (firstRecipient.name || firstRecipient.email).toLowerCase();
            const secondLabel = (secondRecipient.name || secondRecipient.email).toLowerCase();
            return firstLabel.localeCompare(secondLabel);
        })
        .slice(0, 8)
        .map((recipient) => ({
            ...recipient,
            sourceLabel: normalizeRecipientSource(recipient.source),
        }));
}

function buildCampaignRecipients(audienceType, { activeSubscribers, optedInUsers, suppressedEmails }) {
    const suppressedSet = buildReachableEmailSet(suppressedEmails, new Set());
    const mergedRecipients = new Map();

    const addRecipient = (record, source) => {
        const email = normalizeEmail(record?.email);

        if (!email || suppressedSet.has(email)) {
            return;
        }

        const existing = mergedRecipients.get(email);
        const normalizedName = normalizeSubscriberName(record?.name);

        if (!existing) {
            mergedRecipients.set(email, {
                name: normalizedName,
                email,
                source,
            });
            return;
        }

        mergedRecipients.set(email, {
            ...existing,
            name: existing.name || normalizedName,
            source: existing.source === source ? existing.source : 'both',
        });
    };

    if (audienceType === 'SUBSCRIBERS' || audienceType === 'BOTH') {
        (Array.isArray(activeSubscribers) ? activeSubscribers : []).forEach((record) => addRecipient(record, 'subscriber'));
    }

    if (audienceType === 'USERS' || audienceType === 'BOTH') {
        (Array.isArray(optedInUsers) ? optedInUsers : []).forEach((record) => addRecipient(record, 'user'));
    }

    return Array.from(mergedRecipients.values()).sort((firstRecipient, secondRecipient) => {
        const firstLabel = (firstRecipient.name || firstRecipient.email).toLowerCase();
        const secondLabel = (secondRecipient.name || secondRecipient.email).toLowerCase();
        return firstLabel.localeCompare(secondLabel);
    });
}

async function loadCampaignAudienceContext() {
    const [activeSubscribers, optedInUsers, suppressedEmails] = await prisma.$transaction([
        prisma.newsletterSubscriber.findMany({
            where: { isActive: true },
            select: {
                name: true,
                email: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findMany({
            where: {
                role: 'user',
                emailSubscriptions: true,
            },
            select: {
                name: true,
                email: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.emailSuppression.findMany({
            select: {
                email: true,
            },
        }),
    ]);

    return {
        activeSubscribers,
        optedInUsers,
        suppressedEmails,
    };
}

function getCampaignInclude({ withDeliveryLogs = false } = {}) {
    const include = {
        createdBy: {
            select: {
                id: true,
                name: true,
                email: true,
            },
        },
        updatedBy: {
            select: {
                id: true,
                name: true,
                email: true,
            },
        },
    };

    if (withDeliveryLogs) {
        include.recipients = {
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' },
            ],
            take: 8,
        };
    }

    return include;
}

function buildCampaignLastErrorMessage(failedCount) {
    if (!failedCount) {
        return null;
    }

    return failedCount === 1
        ? '1 delivery could not be completed.'
        : `${failedCount} deliveries could not be completed.`;
}

function normalizeDeliveryError(error) {
    const rawMessage = toTrimmedString(error?.message) || 'Email delivery could not be completed.';
    return rawMessage.length > 240 ? `${rawMessage.slice(0, 237)}...` : rawMessage;
}

function validateEmailService() {
    const availability = getEmailServiceAvailability();

    if (!availability.configured) {
        throw new AppError(
            availability.reason || 'Email delivery is unavailable until the mail service is configured.',
            503
        );
    }
}

async function sendCampaignMessage(campaign, recipient) {
    const preview = renderCampaignPreview(campaign, recipient);
    const result = await sendEmail({
        to: recipient.email,
        subject: preview.subject,
        text: preview.text,
        html: preview.html,
    });

    if (result?.skipped) {
        const error = new Error(result.reason || 'Email delivery is unavailable until the mail service is configured.');
        error.code = 'EMAIL_SKIPPED';
        throw error;
    }

    return preview;
}

function buildRecipientLog(campaignId, recipient, deliveryType, status, details = {}) {
    return {
        campaignId,
        email: recipient.email,
        name: recipient.name || null,
        source: recipient.source,
        deliveryType,
        status,
        errorMessage: details.errorMessage || null,
        sentAt: details.sentAt || null,
    };
}

function requireDraftCampaign(campaign, actionLabel) {
    if (!campaign) {
        throw new AppError('Campaign draft not found.', 404);
    }

    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
        throw new AppError(`Only draft campaigns can be ${actionLabel}.`, 409);
    }
}

async function persistRecipientLogs(logEntries) {
    if (!Array.isArray(logEntries) || logEntries.length === 0) {
        return;
    }

    if (
        logEntries.length <= CAMPAIGN_SEND_BATCH_SIZE
        || typeof prisma.emailCampaignRecipient.createMany !== 'function'
    ) {
        for (const logEntry of logEntries) {
            await prisma.emailCampaignRecipient.create({
                data: logEntry,
            });
        }
        return;
    }

    for (let index = 0; index < logEntries.length; index += RECIPIENT_LOG_BATCH_SIZE) {
        const batch = logEntries.slice(index, index + RECIPIENT_LOG_BATCH_SIZE);
        await prisma.emailCampaignRecipient.createMany({
            data: batch,
        });
    }
}

exports.subscribe = async (req, res, next) => {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
        return next(new AppError('A valid email is required.', 400));
    }

    try {
        const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
            where: { email },
        });
        const incomingName = normalizeSubscriberName(req.body?.name);
        const resolvedName = incomingName || normalizeSubscriberName(existingSubscriber?.name);

        if (!resolvedName) {
            return next(new AppError('Your name is required to subscribe.', 400));
        }

        if (existingSubscriber?.isActive) {
            const operations = createAudienceSyncOperations(email, {
                suppress: false,
                source: 'newsletter_subscribe',
            });
            const shouldUpdateName = normalizeSubscriberName(existingSubscriber.name) !== resolvedName;

            if (shouldUpdateName) {
                operations.unshift(
                    prisma.newsletterSubscriber.update({
                        where: { id: existingSubscriber.id },
                        data: {
                            name: resolvedName,
                        },
                    })
                );
            }

            await prisma.$transaction(operations);

            return res.json({
                message: shouldUpdateName
                    ? 'You are already subscribed and your details were updated.'
                    : 'You are already subscribed!',
            });
        }

        const subscriberOperation = existingSubscriber
            ? prisma.newsletterSubscriber.update({
                where: { id: existingSubscriber.id },
                data: {
                    name: resolvedName,
                    isActive: true,
                    unsubscribedAt: null,
                },
            })
            : prisma.newsletterSubscriber.create({
                data: {
                    email,
                    name: resolvedName,
                },
            });

        await prisma.$transaction([
            subscriberOperation,
            ...createAudienceSyncOperations(email, {
                suppress: false,
                source: 'newsletter_subscribe',
            }),
        ]);

        if (existingSubscriber) {
            return res.status(200).json({ message: 'Your newsletter subscription has been reactivated.' });
        }

        return res.status(201).json({ message: 'Subscribed successfully!' });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error subscribing to newsletter.', 500));
    }
};

exports.unsubscribe = async (req, res, next) => {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
        return next(new AppError('A valid email is required.', 400));
    }

    try {
        const [existingSubscriber, existingUser, existingSuppression] = await Promise.all([
            prisma.newsletterSubscriber.findUnique({
                where: { email },
            }),
            prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    emailSubscriptions: true,
                },
            }),
            prisma.emailSuppression.findUnique({
                where: { email },
            }),
        ]);

        const operations = [];

        if (existingSubscriber?.isActive) {
            operations.push(
                prisma.newsletterSubscriber.update({
                    where: { id: existingSubscriber.id },
                    data: {
                        isActive: false,
                        unsubscribedAt: new Date(),
                    },
                })
            );
        }

        operations.push(
            ...createAudienceSyncOperations(email, {
                suppress: true,
                reason: 'campaign_opt_out',
                source: 'newsletter_unsubscribe',
            })
        );

        await prisma.$transaction(operations);

        const hadReachableAudience = Boolean(
            existingSubscriber?.isActive
            || (existingUser && existingUser.emailSubscriptions !== false)
            || !existingSuppression
        );

        return res.json({
            message: hadReachableAudience
                ? 'You have been unsubscribed successfully.'
                : 'This email is already unsubscribed.',
        });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error unsubscribing from newsletter.', 500));
    }
};

exports.getSubscribers = async (req, res, next) => {
    try {
        const page = toPositiveInteger(req.query.page) || 1;
        const limit = toPositiveInteger(req.query.limit) || 12;
        const status = toTrimmedString(req.query.status).toLowerCase();
        const search = toTrimmedString(req.query.search);
        const skip = (page - 1) * limit;
        const where = buildSubscriberWhereClause({ search, status });
        const startOfMonth = new Date();

        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [
            subscribers,
            filteredTotal,
            total,
            active,
            inactive,
            thisMonth,
            activeAudienceSubscribers,
            optedInUsers,
            suppressedEmails,
        ] = await prisma.$transaction([
            prisma.newsletterSubscriber.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.newsletterSubscriber.count({ where }),
            prisma.newsletterSubscriber.count(),
            prisma.newsletterSubscriber.count({ where: { isActive: true } }),
            prisma.newsletterSubscriber.count({ where: { isActive: false } }),
            prisma.newsletterSubscriber.count({
                where: {
                    createdAt: {
                        gte: startOfMonth,
                    },
                },
            }),
            prisma.newsletterSubscriber.findMany({
                where: { isActive: true },
                select: {
                    email: true,
                },
            }),
            prisma.user.findMany({
                where: {
                    role: 'user',
                    emailSubscriptions: true,
                },
                select: {
                    email: true,
                },
            }),
            prisma.emailSuppression.findMany({
                select: {
                    email: true,
                },
            }),
        ]);
        const audienceReadiness = buildAudienceReadiness({
            activeSubscribers: activeAudienceSubscribers,
            optedInUsers,
            suppressedEmails,
        });

        return res.json({
            subscribers,
            currentPage: page,
            totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
            total,
            filteredTotal,
            counts: {
                total,
                active,
                inactive,
                thisMonth,
            },
            audienceReadiness,
        });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error fetching subscribers.', 500));
    }
};

exports.exportSubscribers = async (req, res, next) => {
    try {
        const status = toTrimmedString(req.query.status).toLowerCase();
        const search = toTrimmedString(req.query.search);
        const where = buildSubscriberWhereClause({ search, status });

        const subscribers = await prisma.newsletterSubscriber.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const csv = buildSubscribersCsv(subscribers);
        const filename = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return res.status(200).send(csv);
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error exporting subscribers.', 500));
    }
};

exports.updateSubscriberStatus = async (req, res, next) => {
    try {
        const subscriberId = toPositiveInteger(req.params.id);
        if (subscriberId === null) {
            return next(new AppError('Invalid subscriber id.', 400));
        }

        const isActive = normalizeBoolean(req.body?.isActive);
        if (isActive === null) {
            return next(new AppError('Subscriber status must be true or false.', 400));
        }

        const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
            where: { id: subscriberId },
        });

        if (!existingSubscriber) {
            return next(new AppError('Subscriber not found.', 404));
        }

        const [updatedSubscriber] = await prisma.$transaction([
            prisma.newsletterSubscriber.update({
                where: { id: subscriberId },
                data: {
                    isActive,
                    unsubscribedAt: isActive ? null : new Date(),
                },
            }),
            ...createAudienceSyncOperations(existingSubscriber.email, {
                suppress: !isActive,
                reason: isActive ? null : 'campaign_opt_out',
                source: 'newsletter_admin_status',
            }),
        ]);

        return res.json(updatedSubscriber);
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error updating subscriber status.', 500));
    }
};

exports.getCampaigns = async (req, res, next) => {
    try {
        const campaigns = await prisma.emailCampaign.findMany({
            include: getCampaignInclude({ withDeliveryLogs: true }),
            orderBy: [
                { updatedAt: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        return res.json({
            campaigns: campaigns.map(serializeEmailCampaign),
        });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error fetching campaigns.', 500));
    }
};

exports.getPreviewRecipients = async (req, res, next) => {
    try {
        const audienceContext = await loadCampaignAudienceContext();

        return res.json({
            recipients: buildPreviewRecipients(audienceContext),
        });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error loading preview recipients.', 500));
    }
};

exports.previewCampaign = async (req, res, next) => {
    let payload;

    try {
        payload = normalizeCampaignPayload(req.body);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to preview campaign.';
        return next(new AppError(message, 400));
    }

    try {
        const preview = renderCampaignPreview(payload, req.body?.previewRecipient);
        return res.json(preview);
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error previewing campaign.', 500));
    }
};

exports.createCampaignDraft = async (req, res, next) => {
    let payload;

    try {
        payload = normalizeCampaignPayload(req.body);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid campaign draft.';
        return next(new AppError(message, 400));
    }

    try {
        const userId = toPositiveInteger(req.user?.id);

        const campaign = await prisma.emailCampaign.create({
            data: {
                ...payload,
                createdByUserId: userId,
                updatedByUserId: userId,
            },
            include: getCampaignInclude(),
        });

        return res.status(201).json(serializeEmailCampaign(campaign));
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error creating campaign draft.', 500));
    }
};

exports.updateCampaignDraft = async (req, res, next) => {
    try {
        const campaignId = toPositiveInteger(req.params.id);
        if (campaignId === null) {
            return next(new AppError('Invalid campaign id.', 400));
        }

        const existingCampaign = await prisma.emailCampaign.findUnique({
            where: { id: campaignId },
        });
        requireDraftCampaign(existingCampaign, 'updated');

        let payload;
        try {
            payload = normalizeCampaignPayload(req.body);
        } catch (validationError) {
            const message = validationError instanceof Error ? validationError.message : 'Invalid campaign draft.';
            return next(new AppError(message, 400));
        }

        const userId = toPositiveInteger(req.user?.id);

        const updatedCampaign = await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: {
                ...payload,
                updatedByUserId: userId,
            },
            include: getCampaignInclude(),
        });

        return res.json(serializeEmailCampaign(updatedCampaign));
    } catch (err) {
        if (err instanceof AppError) {
            return next(err);
        }

        console.error(err.message);
        return next(new AppError('Server error updating campaign draft.', 500));
    }
};

exports.deleteCampaignDraft = async (req, res, next) => {
    try {
        const campaignId = toPositiveInteger(req.params.id);
        if (campaignId === null) {
            return next(new AppError('Invalid campaign id.', 400));
        }

        const existingCampaign = await prisma.emailCampaign.findUnique({
            where: { id: campaignId },
            select: {
                id: true,
                status: true,
            },
        });
        requireDraftCampaign(existingCampaign, 'deleted');

        await prisma.emailCampaign.delete({
            where: { id: campaignId },
        });

        return res.json({
            success: true,
            message: 'Campaign draft deleted.',
            msg: 'Campaign draft deleted.',
        });
    } catch (err) {
        if (err instanceof AppError) {
            return next(err);
        }

        console.error(err.message);
        return next(new AppError('Server error deleting campaign draft.', 500));
    }
};

exports.sendCampaignTest = async (req, res, next) => {
    try {
        const campaignId = toPositiveInteger(req.params.id);
        if (campaignId === null) {
            return next(new AppError('Invalid campaign id.', 400));
        }

        const campaign = await prisma.emailCampaign.findUnique({
            where: { id: campaignId },
        });
        requireDraftCampaign(campaign, 'tested');
        validateEmailService();

        const adminEmail = normalizeEmail(req.user?.email);
        if (!isValidEmail(adminEmail)) {
            return next(new AppError('The current admin account does not have a valid email address.', 400));
        }

        const adminName = normalizeSubscriberName(req.user?.name) || 'NuurPath Team';
        const userId = toPositiveInteger(req.user?.id);
        const recipient = {
            name: adminName,
            email: adminEmail,
            source: 'admin_test',
        };

        try {
            await sendCampaignMessage(campaign, recipient);
            const sentAt = new Date();

            const [, updatedCampaign] = await prisma.$transaction([
                prisma.emailCampaignRecipient.create({
                    data: buildRecipientLog(
                        campaign.id,
                        recipient,
                        DELIVERY_TYPES.TEST,
                        DELIVERY_STATUS.SENT,
                        { sentAt }
                    ),
                }),
                prisma.emailCampaign.update({
                    where: { id: campaign.id },
                    data: {
                        updatedByUserId: userId,
                        lastTestSentAt: sentAt,
                        lastError: null,
                    },
                    include: getCampaignInclude({ withDeliveryLogs: true }),
                }),
            ]);

            return res.json({
                success: true,
                message: `Test email sent to ${adminEmail}.`,
                campaign: serializeEmailCampaign(updatedCampaign),
            });
        } catch (sendError) {
            const errorMessage = normalizeDeliveryError(sendError);

            await prisma.$transaction([
                prisma.emailCampaignRecipient.create({
                    data: buildRecipientLog(
                        campaign.id,
                        recipient,
                        DELIVERY_TYPES.TEST,
                        DELIVERY_STATUS.FAILED,
                        { errorMessage }
                    ),
                }),
                prisma.emailCampaign.update({
                    where: { id: campaign.id },
                    data: {
                        updatedByUserId: userId,
                        lastError: errorMessage,
                    },
                }),
            ]);

            return next(new AppError(errorMessage, sendError?.code === 'EMAIL_SKIPPED' ? 503 : 500));
        }
    } catch (err) {
        if (err instanceof AppError) {
            return next(err);
        }

        console.error(err.message);
        return next(new AppError('Server error sending campaign test email.', 500));
    }
};

exports.sendCampaign = async (req, res, next) => {
    const campaignId = toPositiveInteger(req.params.id);
    if (campaignId === null) {
        return next(new AppError('Invalid campaign id.', 400));
    }

    const userId = toPositiveInteger(req.user?.id);
    let recipientCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    const recipientLogs = [];

    try {
        const campaign = await prisma.emailCampaign.findUnique({
            where: { id: campaignId },
        });
        requireDraftCampaign(campaign, 'sent');
        validateEmailService();

        const audienceContext = await loadCampaignAudienceContext();
        const recipients = buildCampaignRecipients(campaign.audienceType, audienceContext);

        if (recipients.length === 0) {
            return next(new AppError('No reachable recipients are available for this audience.', 400));
        }

        recipientCount = recipients.length;

        await prisma.emailCampaign.update({
            where: { id: campaign.id },
            data: {
                status: CAMPAIGN_STATUS.SENDING,
                recipientCount,
                sentCount: 0,
                failedCount: 0,
                lastError: null,
                updatedByUserId: userId,
            },
        });

        for (let index = 0; index < recipients.length; index += CAMPAIGN_SEND_BATCH_SIZE) {
            const recipientBatch = recipients.slice(index, index + CAMPAIGN_SEND_BATCH_SIZE);
            const batchResults = await Promise.allSettled(
                recipientBatch.map((recipient) => sendCampaignMessage(campaign, recipient))
            );

            batchResults.forEach((result, batchIndex) => {
                const recipient = recipientBatch[batchIndex];

                if (result.status === 'fulfilled') {
                    const sentAt = new Date();
                    sentCount += 1;
                    recipientLogs.push(
                        buildRecipientLog(
                            campaign.id,
                            recipient,
                            DELIVERY_TYPES.LIVE,
                            DELIVERY_STATUS.SENT,
                            { sentAt }
                        )
                    );
                    return;
                }

                failedCount += 1;
                recipientLogs.push(
                    buildRecipientLog(
                        campaign.id,
                        recipient,
                        DELIVERY_TYPES.LIVE,
                        DELIVERY_STATUS.FAILED,
                        { errorMessage: normalizeDeliveryError(result.reason) }
                    )
                );
            });
        }

        await persistRecipientLogs(recipientLogs);

        const finalStatus = failedCount > 0 ? CAMPAIGN_STATUS.FAILED : CAMPAIGN_STATUS.SENT;
        const lastSentAt = new Date();
        const updatedCampaign = await prisma.emailCampaign.update({
            where: { id: campaign.id },
            data: {
                status: finalStatus,
                recipientCount,
                sentCount,
                failedCount,
                lastSentAt,
                lastError: buildCampaignLastErrorMessage(failedCount),
                updatedByUserId: userId,
            },
            include: getCampaignInclude({ withDeliveryLogs: true }),
        });

        return res.json({
            success: true,
            message: failedCount > 0
                ? `Campaign send completed with ${failedCount} delivery issue${failedCount === 1 ? '' : 's'}.`
                : `Campaign sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`,
            campaign: serializeEmailCampaign(updatedCampaign),
        });
    } catch (err) {
        if (err instanceof AppError) {
            return next(err);
        }

        const errorMessage = normalizeDeliveryError(err);
        console.error(err.message);

        try {
            const existingCampaign = await prisma.emailCampaign.findUnique({
                where: { id: campaignId },
                select: {
                    id: true,
                },
            });

            if (existingCampaign?.id) {
                await prisma.emailCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: CAMPAIGN_STATUS.FAILED,
                        recipientCount,
                        sentCount,
                        failedCount,
                        lastSentAt: recipientCount > 0 ? new Date() : null,
                        lastError: errorMessage,
                        updatedByUserId: userId,
                    },
                });
            }
        } catch (updateError) {
            console.error(updateError.message);
        }

        return next(new AppError(errorMessage, err?.code === 'EMAIL_SKIPPED' ? 503 : 500));
    }
};

exports.getCampaignDrafts = exports.getCampaigns;
