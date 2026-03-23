const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { notifyAdmins } = require('../utils/adminNotifier');

// @route   GET api/appointments/private
// @desc    Get private consultations (User sees theirs, Admin sees all)
// @access  Private
router.get('/private', auth, async (req, res) => {
    try {
        let where = {};
        
        // If not admin/manager, only show consultations belonging to this user
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            where = { userId: parseInt(req.user.id) };
        }

        const consultations = await prisma.privateConsultation.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(consultations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/appointments/private
// @desc    Book a private consultation (Public)
// @access  Public
router.post('/private', async (req, res) => {
    try {
        const { name, email, phone, description, date, time, status, captchaToken, userId } = req.body;

        if (!name || !email || !phone || !description || !date || !time) {
            return res.status(400).json({ msg: 'Please enter all required fields' });
        }

        // Note: In a real app, verify captchaToken here if not admin

        const consultationData = {
            name,
            email,
            phone,
            description,
            date,
            time,
            status: status || 'Pending'
        };

        // Soft-auth: Associate with user if userId is provided and valid
        if (userId) {
            const parsedId = parseInt(userId);
            if (!isNaN(parsedId)) {
                consultationData.user = { connect: { id: parsedId } };
            }
        }

        const consultation = await prisma.privateConsultation.create({
            data: consultationData
        });

        // Notify Admins about the new consultation request
        await notifyAdmins(req.app, {
            title: 'New Consultation Request',
            message: `New private consultation requested by ${name} for ${date} at ${time}`,
            type: 'NEW_CONSULTATION'
        });

        res.json(consultation);
    } catch (err) {
        console.error("Error creating consultation:", err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/appointments/private/:id
// @desc    Update consultation status (Admin)
// @access  Private (Admin)
router.put('/private/:id', auth, adminAuth, async (req, res) => {
    try {
        const { name, email, phone, description, date, time, status } = req.body;
        const updated = await prisma.privateConsultation.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                email,
                phone,
                description,
                date,
                time,
                status
            }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/appointments/private/:id
// @desc    Delete consultation (Admin)
// @access  Private (Admin)
router.delete('/private/:id', auth, adminAuth, async (req, res) => {
    try {
        await prisma.privateConsultation.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ msg: 'Consultation deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;