const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const contactController = require('../controllers/contactController');
const { contactFormLimiter } = require('../middleware/rateLimitMiddleware');
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = new Set([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and WebP files are allowed.'), false);
    }
};

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: fileFilter }); // 5MB limit

// @route   POST api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactFormLimiter, (req, res, next) => {
    upload.single('attachment')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
                msg: err.message,
            });
        }
        next();
    });
}, [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('subject', 'Subject is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty()
], contactController.submitContactForm);

module.exports = router;
