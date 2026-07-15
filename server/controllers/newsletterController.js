const prisma = require('../db');
const AppError = require('../utils/AppError');
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

function getCampaignInclude() {
    return {
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

exports.getCampaignDrafts = async (req, res, next) => {
    try {
        const campaigns = await prisma.emailCampaign.findMany({
            where: {
                status: CAMPAIGN_STATUS.DRAFT,
            },
            include: getCampaignInclude(),
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
        return next(new AppError('Server error fetching campaign drafts.', 500));
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

        if (!existingCampaign) {
            return next(new AppError('Campaign draft not found.', 404));
        }

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
            },
        });

        if (!existingCampaign) {
            return next(new AppError('Campaign draft not found.', 404));
        }

        await prisma.emailCampaign.delete({
            where: { id: campaignId },
        });

        return res.json({
            success: true,
            message: 'Campaign draft deleted.',
            msg: 'Campaign draft deleted.',
        });
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error deleting campaign draft.', 500));
    }
};
