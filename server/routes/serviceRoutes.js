const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

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
        const { title, description, icon } = req.body;

        if (!title || !description) {
            return res.status(400).json({ msg: 'Title and description are required' });
        }

        const newService = await prisma.service.create({
            data: { title, description, icon }
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

        const updates = orderedIds.map((id, index) => 
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
        const { title, description, icon } = req.body;
        const id = parseInt(req.params.id);

        const updatedService = await prisma.service.update({
            where: { id },
            data: { title, description, icon }
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
        const id = parseInt(req.params.id);
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