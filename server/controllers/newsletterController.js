const prisma = require('../config/db');
const AppError = require('../utils/AppError');

exports.subscribe = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Email is required', 400));
    }

    try {
        const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
        if (existing) {
            return res.json({ message: 'You are already subscribed!' });
        }

        await prisma.newsletterSubscriber.create({ data: { email } });
        res.status(201).json({ message: 'Subscribed successfully!' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error subscribing to newsletter', 500));
    }
};

exports.getSubscribers = async (req, res, next) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
             return next(new AppError('Not authorized to view subscribers', 403));
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [subscribers, total] = await Promise.all([
            prisma.newsletterSubscriber.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.newsletterSubscriber.count()
        ]);

        res.json({
            subscribers,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching subscribers', 500));
    }
};