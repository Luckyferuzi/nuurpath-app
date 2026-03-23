const prisma = require('../config/db');

exports.createReview = async (req, res) => {
    try {
        const { packageId, rating, comment } = req.body;
        const userId = req.user.id;

        // Check if package exists
        const pkg = await prisma.travelPackage.findUnique({
            where: { id: parseInt(packageId) }
        });

        if (!pkg) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        // Create review
        const review = await prisma.review.create({
            data: {
                userId,
                packageId: parseInt(packageId),
                rating: parseInt(rating),
                comment
            },
            include: {
                user: {
                    select: { name: true }
                }
            }
        });

        res.json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getReviewsByPackageId = async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { packageId: parseInt(req.params.packageId) },
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getReviewsByUserId = async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { userId: parseInt(req.params.userId) },
            include: {
                package: {
                    select: { title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const review = await prisma.review.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!review) {
            return res.status(404).json({ msg: 'Review not found' });
        }

        // Check user (allow admin or owner to delete)
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await prisma.review.delete({
            where: { id: parseInt(req.params.id) }
        });

        res.json({ msg: 'Review removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const review = await prisma.review.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!review) {
            return res.status(404).json({ msg: 'Review not found' });
        }

        // Check user
        if (review.userId !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updateData = {};
        if (rating !== undefined) updateData.rating = parseInt(rating);
        if (comment !== undefined) updateData.comment = comment;

        const updatedReview = await prisma.review.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        res.json(updatedReview);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};