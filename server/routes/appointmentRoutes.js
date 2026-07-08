const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { privateConsultationLimiter } = require('../middleware/rateLimitMiddleware');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');
const {
    isNonEmptyString,
    isValidDate,
    isValidEmail,
    normalizeStatus,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

const CONSULTATION_STATUSES = ['Pending', 'Contacted', 'Completed', 'Cancelled'];

function isValidTimeString(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    const trimmed = toTrimmedString(value);
    return /^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed) || /^(1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM)$/i.test(trimmed);
}

// @route   GET api/appointments/private
// @desc    Get private consultations (User sees theirs, Admin sees all)
// @access  Private
router.get('/private', auth, async (req, res) => {
    try {
        let where = {};
        const userId = toPositiveInteger(req.user.id);

        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }
        
        // If not admin/manager, only show consultations belonging to this user
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            where = { userId };
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
router.post('/private', privateConsultationLimiter, softAuth, async (req, res) => {
    try {
        const { name, email, phone, description, date, time, status } = req.body;

        if (!isNonEmptyString(name) || !isNonEmptyString(description) || !isNonEmptyString(phone)) {
            return sendValidationError(res, 'Please enter all required fields.');
        }

        if (!isValidEmail(email)) {
            return sendValidationError(res, 'A valid email is required.');
        }

        if (!isValidDate(date)) {
            return sendValidationError(res, 'A valid date is required.');
        }

        if (!isValidTimeString(time)) {
            return sendValidationError(res, 'A valid time is required.');
        }

        const normalizedStatus = status === undefined || status === null || status === ''
            ? 'Pending'
            : normalizeStatus(status, CONSULTATION_STATUSES);

        if (!normalizedStatus) {
            return sendValidationError(res, 'Status must be Pending, Contacted, Completed, or Cancelled.');
        }

        const consultationData = {
            name: toTrimmedString(name),
            email: toTrimmedString(email),
            phone: toTrimmedString(phone),
            description: toTrimmedString(description),
            date: toTrimmedString(date),
            time: toTrimmedString(time),
            status: normalizedStatus
        };

        // Only associate the request with the authenticated user when available.
        if (req.user && req.user.id) {
            const userId = toPositiveInteger(req.user.id);
            if (userId === null) {
                return sendValidationError(res, 'Invalid user id.');
            }

            consultationData.user = { connect: { id: userId } };
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
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const { name, email, phone, description, date, time, status } = req.body;
        const updateData = {};

        if (name !== undefined) {
            if (!isNonEmptyString(name)) {
                return sendValidationError(res, 'Name is required.');
            }

            updateData.name = toTrimmedString(name);
        }

        if (email !== undefined) {
            if (!isValidEmail(email)) {
                return sendValidationError(res, 'A valid email is required.');
            }

            updateData.email = toTrimmedString(email);
        }

        if (phone !== undefined) {
            if (!isNonEmptyString(phone)) {
                return sendValidationError(res, 'Phone is required.');
            }

            updateData.phone = toTrimmedString(phone);
        }

        if (description !== undefined) {
            if (!isNonEmptyString(description)) {
                return sendValidationError(res, 'Description is required.');
            }

            updateData.description = toTrimmedString(description);
        }

        if (date !== undefined) {
            if (!isValidDate(date)) {
                return sendValidationError(res, 'A valid date is required.');
            }

            updateData.date = toTrimmedString(date);
        }

        if (time !== undefined) {
            if (!isValidTimeString(time)) {
                return sendValidationError(res, 'A valid time is required.');
            }

            updateData.time = toTrimmedString(time);
        }

        if (status !== undefined) {
            const normalizedStatus = normalizeStatus(status, CONSULTATION_STATUSES);
            if (!normalizedStatus) {
                return sendValidationError(res, 'Status must be Pending, Contacted, Completed, or Cancelled.');
            }

            updateData.status = normalizedStatus;
        }

        const updated = await prisma.privateConsultation.update({
            where: { id },
            data: updateData
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
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.privateConsultation.delete({ where: { id } });
        res.json({ msg: 'Consultation deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
