const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const { privateConsultationLimiter } = require('../middleware/rateLimitMiddleware');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');
const { isAdminOrManager } = require('../utils/roles');
const {
    normalizeOperationalStatus,
    shouldSetLastContactedAt,
} = require('../utils/operationalPipeline');
const {
    isNonEmptyString,
    isValidDate,
    isValidEmail,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    STAFF_USER_SUMMARY_SELECT,
    buildRequestWorkflowSignals,
    resolveAssignedStaffInput,
} = require('../utils/staffRequestIntelligence');

function isValidTimeString(value) {
    if (!isNonEmptyString(value)) {
        return false;
    }

    const trimmed = toTrimmedString(value);
    return /^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed) || /^(1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM)$/i.test(trimmed);
}

function serializePrivateConsultation(consultation, { includeInternalFields = false } = {}) {
    if (!consultation || typeof consultation !== 'object') {
        return consultation;
    }

    const normalizedStatus = normalizeOperationalStatus(consultation.status) || 'New';
    const serializedConsultation = {
        ...consultation,
        ...buildRequestWorkflowSignals(consultation),
        requestId: consultation.id,
        status: normalizedStatus,
    };

    if (!includeInternalFields) {
        delete serializedConsultation.adminNotes;
        delete serializedConsultation.assignedAt;
        delete serializedConsultation.assignedStaff;
        delete serializedConsultation.attentionLevel;
        delete serializedConsultation.attentionReasons;
        delete serializedConsultation.daysSinceLastAction;
        delete serializedConsultation.daysSinceLastFollowUp;
        delete serializedConsultation.isAssignedToStaff;
        delete serializedConsultation.isOverdueFollowUp;
        delete serializedConsultation.isUnassigned;
        delete serializedConsultation.isWaitingForDocuments;
        delete serializedConsultation.lastActionAt;
        delete serializedConsultation.lastContactedAt;
        delete serializedConsultation.lastStatusChangedAt;
        delete serializedConsultation.lastUpdatedBy;
        delete serializedConsultation.needsAttention;
        delete serializedConsultation.priorityLabel;
        delete serializedConsultation.queueBucket;
        delete serializedConsultation.queueLabel;
    }

    return serializedConsultation;
}

// @route   GET api/appointments/private
// @desc    Get private consultations (User sees theirs, Admin/Manager sees all)
// @access  Private
router.get('/private', auth, async (req, res) => {
    try {
        let where = {};
        const userId = toPositiveInteger(req.user.id);

        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const includeInternalFields = isAdminOrManager(req.user);
        if (!includeInternalFields) {
            where = { userId };
        }

        const consultations = await prisma.privateConsultation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                assignedStaff: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
                lastUpdatedBy: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
            },
        });

        return res.json(consultations.map((consultation) => serializePrivateConsultation(consultation, { includeInternalFields })));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   POST api/appointments/private
// @desc    Book a private consultation (Public)
// @access  Public
router.post('/private', privateConsultationLimiter, softAuth, async (req, res) => {
    try {
        const { name, email, phone, description, date, time } = req.body;

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

        const consultationData = {
            name: toTrimmedString(name),
            email: toTrimmedString(email),
            phone: toTrimmedString(phone),
            description: toTrimmedString(description),
            date: toTrimmedString(date),
            time: toTrimmedString(time),
            status: 'Pending',
            lastStatusChangedAt: new Date(),
        };

        if (req.user && req.user.id) {
            const userId = toPositiveInteger(req.user.id);
            if (userId === null) {
                return sendValidationError(res, 'Invalid user id.');
            }

            consultationData.user = { connect: { id: userId } };
        }

        const consultation = await prisma.privateConsultation.create({
            data: consultationData,
        });

        await notifyAdmins(req.app, {
            title: 'New Consultation Request',
            message: `New private consultation requested by ${name} for ${date} at ${time}`,
            type: 'NEW_CONSULTATION',
        });

        return res.json(serializePrivateConsultation(consultation));
    } catch (err) {
        console.error('Error creating consultation:', err);
        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/appointments/private/:id
// @desc    Update consultation pipeline details
// @access  Private (Admin/Manager)
router.put('/private/:id', auth, requireAdminOrManager, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const { name, email, phone, description, date, time, status, adminNotes, assignedStaffId } = req.body;
        const actorId = toPositiveInteger(req.user.id);
        if (actorId === null) {
            return sendValidationError(res, 'Invalid staff user id.');
        }

        const existingConsultation = await prisma.privateConsultation.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                assignedStaffId: true,
            },
        });

        if (!existingConsultation) {
            return res.status(404).json({ msg: 'Consultation request not found' });
        }

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
            const normalizedStatus = normalizeOperationalStatus(status);
            if (!normalizedStatus) {
                return sendValidationError(res, 'Status must match the operational pipeline.');
            }

            updateData.status = normalizedStatus;
            if (normalizedStatus !== (normalizeOperationalStatus(existingConsultation.status) || 'New')) {
                updateData.lastStatusChangedAt = new Date();
            }
            if (shouldSetLastContactedAt(normalizedStatus)) {
                updateData.lastContactedAt = new Date();
            }
        }

        if (adminNotes !== undefined) {
            updateData.adminNotes = isNonEmptyString(adminNotes) ? toTrimmedString(adminNotes) : null;
        }

        if (assignedStaffId !== undefined) {
            const assignmentResolution = await resolveAssignedStaffInput(prisma, assignedStaffId, req.user);
            if (assignmentResolution.hasAssignmentChange) {
                updateData.assignedStaffId = assignmentResolution.assignedStaffId;
                if (assignmentResolution.assignedStaffId !== existingConsultation.assignedStaffId) {
                    updateData.assignedAt = assignmentResolution.assignedStaffId ? new Date() : null;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return sendValidationError(res, 'No valid consultation fields were provided for update.');
        }

        updateData.lastUpdatedByUserId = actorId;

        const updated = await prisma.privateConsultation.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
                assignedStaff: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
                lastUpdatedBy: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
            },
        });

        return res.json(serializePrivateConsultation(updated, { includeInternalFields: true }));
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Consultation request not found' });
        }

        return res.status(500).send('Server Error');
    }
});

// @route   DELETE api/appointments/private/:id
// @desc    Delete consultation
// @access  Private (Admin)
router.delete('/private/:id', auth, requireAdmin, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.privateConsultation.delete({ where: { id } });
        return res.json({ msg: 'Consultation deleted' });
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Consultation request not found' });
        }

        return res.status(500).send('Server Error');
    }
});

module.exports = router;
