const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Memory/Testimonial images
const uploadDir = path.join(__dirname, '../public/uploads/reviews');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and MP4, MPEG, MOV, WebM videos are allowed.'), false);
    }
};

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
    fileFilter: fileFilter
});

// @route   GET api/reviews
// @desc    Get all visible reviews/testimonials (Memories)
// @access  Public
router.get('/', async (req, res) => {
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
        const reviews = await prisma.review.findMany({
            where: { userId: req.user.id },
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
router.post('/', auth, (req, res) => {
    upload.fields([
        { name: 'images', maxCount: 5 },
        { name: 'videos', maxCount: 2 }
    ])(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ msg: 'File too large. Maximum size allowed is 50MB.' });
            }
            return res.status(400).json({ msg: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ msg: err.message });
        }

        try {
            const { rating, comment, packageId } = req.body;
            const user = await prisma.user.findUnique({ where: { id: req.user.id } });

            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            const imageUrls = req.files['images'] ? req.files['images'].map(file => `/uploads/reviews/${file.filename}`) : [];
            const videoUrls = req.files['videos'] ? req.files['videos'].map(file => `/uploads/reviews/${file.filename}`) : [];
            
            const review = await prisma.review.create({
                data: {
                    userId: req.user.id,
                    packageId: packageId ? parseInt(packageId) : null,
                    name: user.name,
                    rating: parseInt(rating) || 5,
                    comment,
                    images: imageUrls,
                    videos: videoUrls,
                    isVisible: false
                }
            });
            res.json(review);
        } catch (dbErr) {
            console.error(dbErr.message);
            res.status(500).send('Server Error');
        }
    });
});

// @route   PUT api/reviews/:id/toggle
// @desc    Toggle review visibility
// @access  Private (Admin)
router.put('/:id/toggle', auth, adminAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
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
        await prisma.review.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ msg: 'Review deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;