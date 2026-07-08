const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const {
    isNonEmptyString,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

const ALLOWED_CONTENT_TYPES = ['privacy', 'terms'];

// @route   GET api/content/:type
// @desc    Get privacy or terms content
// @access  Public
router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!ALLOWED_CONTENT_TYPES.includes(type)) {
            return sendValidationError(res, 'Invalid content type.');
        }

        const result = await prisma.siteContent.findUnique({
            where: { key: type }
        });

        res.json({ content: result ? result.content : '' });
    } catch (err) {
        console.error(err.message);
        // Return empty content if table doesn't exist yet
        res.json({ content: '' });
    }
});

// @route   POST api/content/:type
// @desc    Update privacy or terms content
// @access  Private (Admin only)
router.post('/:type', auth, async (req, res) => {
    try {
        const { type } = req.params;
        const { content } = req.body;

        if (!ALLOWED_CONTENT_TYPES.includes(type)) {
            return sendValidationError(res, 'Invalid content type.');
        }

        if (!isNonEmptyString(content)) {
            return sendValidationError(res, 'Content is required.');
        }

        const requestorId = toPositiveInteger(req.user.id);
        if (requestorId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const requestor = await prisma.user.findUnique({ where: { id: requestorId } });
        if (!requestor || requestor.role !== 'admin') {
             return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const result = await prisma.siteContent.upsert({
            where: { key: type },
            update: { content: toTrimmedString(content), updatedAt: new Date() },
            create: { key: type, content: toTrimmedString(content) }
        });
        
        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
