const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
    isNonEmptyString,
    sendInvalidId,
    sendValidationError,
    toNonNegativeNumber,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

// @route   GET api/services
// @desc    Get all services
// @access  Public
router.get('/', async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services
// @desc    Create a new service
// @access  Private (Admin)
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const { title, description, icon, price } = req.body;

        if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
            return sendValidationError(res, 'Title and description are required.');
        }

        if (price !== undefined && price !== null && price !== '' && toNonNegativeNumber(price) === null) {
            return sendValidationError(res, 'Price must be a valid non-negative number.');
        }

        const newService = await prisma.service.create({
            data: {
                title: toTrimmedString(title),
                description: toTrimmedString(description),
                icon: typeof icon === 'string' ? icon.trim() : icon,
            }
        });

        res.json(newService);
    } catch (err) {
        console.error('Error creating service:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/reorder
// @desc    Reorder services
// @access  Private (Admin)
router.put('/reorder', auth, adminAuth, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return sendValidationError(res, 'orderedIds must be a non-empty array of ids.');
        }

        const normalizedIds = orderedIds.map((id) => toPositiveInteger(id));
        if (normalizedIds.some((id) => id === null)) {
            return sendValidationError(res, 'orderedIds must contain only positive integer ids.');
        }

        const updates = normalizedIds.map((id, index) => 
            prisma.service.update({
                where: { id },
                data: { order: index }
            })
        );

        await prisma.$transaction(updates);
        res.json({ msg: 'Services reordered' });
    } catch (err) {
        console.error('Error reordering services:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/:id
// @desc    Update a service
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const { title, description, icon, price } = req.body;
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        if (title !== undefined && !isNonEmptyString(title)) {
            return sendValidationError(res, 'Title is required.');
        }

        if (description !== undefined && !isNonEmptyString(description)) {
            return sendValidationError(res, 'Description is required.');
        }

        if (price !== undefined && price !== null && price !== '' && toNonNegativeNumber(price) === null) {
            return sendValidationError(res, 'Price must be a valid non-negative number.');
        }

        const updateData = {};
        if (title !== undefined) {
            updateData.title = toTrimmedString(title);
        }

        if (description !== undefined) {
            updateData.description = toTrimmedString(description);
        }

        if (icon !== undefined) {
            updateData.icon = typeof icon === 'string' ? icon.trim() : icon;
        }

        const updatedService = await prisma.service.update({
            where: { id },
            data: updateData
        });

        res.json(updatedService);
    } catch (err) {
        console.error('Error updating service:', err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Service not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/services/:id
// @desc    Delete a service
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.service.delete({
            where: { id }
        });
        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error('Error deleting service:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
