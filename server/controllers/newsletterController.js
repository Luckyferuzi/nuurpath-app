const prisma = require('../db');
const AppError = require('../utils/AppError');
const {
    isValidEmail,
    normalizeBoolean,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

function normalizeEmail(email) {
    return toTrimmedString(email).toLowerCase();
}

function buildSubscriberWhereClause({ search, status }) {
    const where = {};
    const normalizedSearch = toTrimmedString(search);

    if (normalizedSearch) {
        where.email = {
            contains: normalizedSearch,
            mode: 'insensitive',
        };
    }

    if (status === 'active') {
        where.isActive = true;
    } else if (status === 'inactive') {
        where.isActive = false;
    }

    return where;
}

function buildSubscribersCsv(subscribers) {
    const headers = ['Email', 'Status', 'Subscribed Date', 'Unsubscribed Date'];
    const lines = subscribers.map((subscriber) => {
        const cells = [
            subscriber.email || '',
            subscriber.isActive ? 'Active' : 'Unsubscribed',
            subscriber.createdAt ? new Date(subscriber.createdAt).toISOString() : '',
            subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt).toISOString() : '',
        ];

        return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...lines].join('\n');
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

        if (existingSubscriber?.isActive) {
            return res.json({ message: 'You are already subscribed!' });
        }

        if (existingSubscriber) {
            await prisma.newsletterSubscriber.update({
                where: { id: existingSubscriber.id },
                data: {
                    isActive: true,
                    unsubscribedAt: null,
                },
            });

            return res.status(200).json({ message: 'Your newsletter subscription has been reactivated.' });
        }

        await prisma.newsletterSubscriber.create({
            data: { email },
        });

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
        const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
            where: { email },
        });

        if (!existingSubscriber || !existingSubscriber.isActive) {
            return res.json({ message: 'This email is already unsubscribed.' });
        }

        await prisma.newsletterSubscriber.update({
            where: { id: existingSubscriber.id },
            data: {
                isActive: false,
                unsubscribedAt: new Date(),
            },
        });

        return res.json({ message: 'You have been unsubscribed successfully.' });
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
        ]);

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

        const updatedSubscriber = await prisma.newsletterSubscriber.update({
            where: { id: subscriberId },
            data: {
                isActive,
                unsubscribedAt: isActive ? null : new Date(),
            },
        });

        return res.json(updatedSubscriber);
    } catch (err) {
        console.error(err.message);
        return next(new AppError('Server error updating subscriber status.', 500));
    }
};
