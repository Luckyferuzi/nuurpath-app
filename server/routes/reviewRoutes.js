const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
    isNonEmptyString,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    removeUploadedFiles,
    reviewMediaUpload,
    runUpload,
    sendUploadError,
    toPublicUploadUrl,
    validateReviewMediaSizes,
} = require('../utils/upload');

function requireAdminForAllReviews(req, res, next) {
    if (req.query.all !== 'true') {
        return next();
    }

    return auth(req, res, () => adminAuth(req, res, next));
}

// @route   GET api/reviews
// @desc    Get all visible reviews/testimonials (Memories)
// @access  Public
router.get('/', requireAdminForAllReviews, async (req, res) => {
    try {
        const { all } = req.query;
        const where = all === 'true' ? {} : { isVisible: true };

        const reviews = await prisma.review.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { 
                user: { select: { name: true, profilePicture: true } },
                package: { select: { title: true } }
            }
        });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reviews/user
// @desc    Get all reviews by current user
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const reviews = await prisma.review.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/reviews
// @desc    Create a review/testimonial with optional images
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        await runUpload(reviewMediaUpload.fields([
            { name: 'images', maxCount: 5 },
            { name: 'videos', maxCount: 2 }
        ]), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'File too large. Maximum size allowed is 25 MB.');
    }

    const reviewMediaSizeError = validateReviewMediaSizes(req.files);
    if (reviewMediaSizeError) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: reviewMediaSizeError, msg: reviewMediaSizeError });
    }

    try {
        const { rating, comment, packageId } = req.body;
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            removeUploadedFiles(req.files);
            return sendValidationError(res, 'Invalid user id.');
        }

        const parsedRating = toPositiveInteger(rating);
        if (parsedRating === null || parsedRating < 1 || parsedRating > 5) {
            removeUploadedFiles(req.files);
            return sendValidationError(res, 'Rating must be an integer between 1 and 5.');
        }

        if (!isNonEmptyString(comment)) {
            removeUploadedFiles(req.files);
            return sendValidationError(res, 'Comment is required.');
        }

        let normalizedPackageId = null;
        if (packageId !== undefined && packageId !== null && packageId !== '') {
            normalizedPackageId = toPositiveInteger(packageId);
            if (normalizedPackageId === null) {
                removeUploadedFiles(req.files);
                return sendValidationError(res, 'Package id must be a positive integer.');
            }

            const selectedPackage = await prisma.package.findUnique({
                where: { id: normalizedPackageId },
                select: { id: true },
            });
            if (!selectedPackage) {
                removeUploadedFiles(req.files);
                return sendValidationError(res, 'Selected package does not exist.');
            }
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            removeUploadedFiles(req.files);
            return res.status(404).json({ msg: 'User not found' });
        }

        const imageUrls = req.files?.images
            ? req.files.images.map((file) => toPublicUploadUrl('reviews', file.filename))
            : [];
        const videoUrls = req.files?.videos
            ? req.files.videos.map((file) => toPublicUploadUrl('reviews', file.filename))
            : [];
        
        const review = await prisma.review.create({
            data: {
                userId,
                packageId: normalizedPackageId,
                name: user.name,
                rating: parsedRating,
                comment: toTrimmedString(comment),
                images: imageUrls,
                videos: videoUrls,
                isVisible: false
            }
        });
        res.json(review);
    } catch (dbErr) {
        removeUploadedFiles(req.files);
        console.error(dbErr.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reviews/:id/toggle
// @desc    Toggle review visibility
// @access  Private (Admin)
router.put('/:id/toggle', auth, adminAuth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const review = await prisma.review.findUnique({ where: { id } });
        
        if (!review) return res.status(404).json({ msg: 'Review not found' });

        const updated = await prisma.review.update({
            where: { id },
            data: { isVisible: !review.isVisible }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/reviews/:id
// @desc    Delete review
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.review.delete({ where: { id } });
        res.json({ msg: 'Review deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
