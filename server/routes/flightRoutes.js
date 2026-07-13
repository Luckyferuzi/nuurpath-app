const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const { flightRequestLimiter } = require('../middleware/rateLimitMiddleware');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');
const { sendNotification } = require('../utils/notificationService');
const { isAdminOrManager } = require('../utils/roles');
const {
    normalizeOperationalStatus,
    shouldSetLastContactedAt,
} = require('../utils/operationalPipeline');
const {
    isNonEmptyString,
    isValidDate,
    isValidEmail,
    parseOptionalDate,
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

function serializeFlightRequest(booking, { includeInternalFields = false } = {}) {
    if (!booking || typeof booking !== 'object') {
        return booking;
    }

    const normalizedStatus = normalizeOperationalStatus(booking.status) || 'New';
    const serializedBooking = {
        ...booking,
        ...buildRequestWorkflowSignals(booking),
        status: normalizedStatus,
        requestId: booking.id,
        tripType: booking.returnDate ? 'Round Trip' : 'One Way',
    };

    if (!includeInternalFields) {
        delete serializedBooking.adminNotes;
        delete serializedBooking.assignedAt;
        delete serializedBooking.assignedStaff;
        delete serializedBooking.attentionLevel;
        delete serializedBooking.attentionReasons;
        delete serializedBooking.daysSinceLastAction;
        delete serializedBooking.daysSinceLastFollowUp;
        delete serializedBooking.isAssignedToStaff;
        delete serializedBooking.isOverdueFollowUp;
        delete serializedBooking.isUnassigned;
        delete serializedBooking.isWaitingForDocuments;
        delete serializedBooking.lastActionAt;
        delete serializedBooking.lastContactedAt;
        delete serializedBooking.lastStatusChangedAt;
        delete serializedBooking.lastUpdatedBy;
        delete serializedBooking.needsAttention;
        delete serializedBooking.priorityLabel;
        delete serializedBooking.queueBucket;
        delete serializedBooking.queueLabel;
    }

    return serializedBooking;
}

// @route   GET api/flights
// @desc    Get flight requests (User sees theirs, Admin/Manager sees all)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const includeInternalFields = isAdminOrManager(user);
        const where = includeInternalFields ? {} : { userId };

        const bookings = await prisma.flightBooking.findMany({
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

        return res.json(bookings.map((booking) => serializeFlightRequest(booking, { includeInternalFields })));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   POST api/flights
// @desc    Create a flight request (Public/User)
// @access  Public
router.post('/', flightRequestLimiter, softAuth, async (req, res) => {
    try {
        const { from, to, departureDate, returnDate, passengers, travelClass, contactName, contactEmail, contactPhone } = req.body;

        if (!isNonEmptyString(from) || !isNonEmptyString(to)) {
            return sendValidationError(res, 'Origin and destination are required.');
        }

        if (!isValidDate(departureDate)) {
            return sendValidationError(res, 'Invalid departure date.');
        }

        const parsedReturnDate = parseOptionalDate(returnDate);
        if (returnDate && parsedReturnDate === null) {
            return sendValidationError(res, 'Invalid return date.');
        }

        if (!isNonEmptyString(contactName)) {
            return sendValidationError(res, 'Contact name is required.');
        }

        if (!isValidEmail(contactEmail)) {
            return sendValidationError(res, 'A valid contact email is required.');
        }

        if (!isNonEmptyString(contactPhone)) {
            return sendValidationError(res, 'Contact phone is required.');
        }

        const passengerCount = toPositiveInteger(passengers);
        if (passengerCount === null) {
            return sendValidationError(res, 'Passengers must be a positive integer.');
        }

        const depDate = new Date(departureDate);
        if (parsedReturnDate && parsedReturnDate < depDate) {
            return sendValidationError(res, 'Return date cannot be earlier than departure date.');
        }

        if (!isNonEmptyString(travelClass)) {
            return sendValidationError(res, 'Travel class is required.');
        }

        let validUserId = null;
        if (req.user && req.user.id) {
            validUserId = toPositiveInteger(req.user.id);
            if (validUserId === null) {
                return sendValidationError(res, 'Invalid user id.');
            }
        }

        const booking = await prisma.flightBooking.create({
            data: {
                from: toTrimmedString(from),
                to: toTrimmedString(to),
                departureDate: depDate,
                returnDate: parsedReturnDate,
                passengers: passengerCount,
                travelClass: toTrimmedString(travelClass),
                contactName: toTrimmedString(contactName),
                contactEmail: toTrimmedString(contactEmail),
                contactPhone: toTrimmedString(contactPhone),
                userId: validUserId,
                status: 'Pending',
                lastStatusChangedAt: new Date(),
            },
        });

        await notifyAdmins(req.app, {
            title: 'New Flight Request',
            message: `New flight request #${booking.id} from ${contactName} (${from} to ${to})`,
            type: 'NEW_FLIGHT_REQUEST',
            bookingId: booking.id,
        });

        return res.status(201).json(serializeFlightRequest(booking));
    } catch (err) {
        console.error('Flight request error:', err);
        return res.status(500).json({ msg: 'Unable to submit your flight request right now. Please try again.' });
    }
});

// @route   GET api/flights/:id
// @desc    Get a single flight request (User sees own, Admin/Manager sees any)
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const booking = await prisma.flightBooking.findUnique({
            where: { id },
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

        if (!booking) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        const includeInternalFields = isAdminOrManager(user);
        if (!includeInternalFields && booking.userId !== userId) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        return res.json(serializeFlightRequest(booking, { includeInternalFields }));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/flights/:id
// @desc    Update flight request pipeline status and internal notes
// @access  Private (Admin/Manager)
router.put('/:id', auth, requireAdminOrManager, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const { status, adminNotes, assignedStaffId } = req.body;
        const actorId = toPositiveInteger(req.user.id);
        if (actorId === null) {
            return sendValidationError(res, 'Invalid staff user id.');
        }

        const existingBooking = await prisma.flightBooking.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                assignedStaffId: true,
            },
        });

        if (!existingBooking) {
            return res.status(404).json({ msg: 'Flight request not found' });
        }

        const updateData = {};

        if (status !== undefined) {
            const normalizedStatus = normalizeOperationalStatus(status);
            if (!normalizedStatus) {
                return sendValidationError(res, 'Status must match the operational pipeline.');
            }

            updateData.status = normalizedStatus;
            if (normalizedStatus !== (normalizeOperationalStatus(existingBooking.status) || 'New')) {
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
                if (assignmentResolution.assignedStaffId !== existingBooking.assignedStaffId) {
                    updateData.assignedAt = assignmentResolution.assignedStaffId ? new Date() : null;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return sendValidationError(res, 'No valid flight request fields were provided for update.');
        }

        updateData.lastUpdatedByUserId = actorId;

        const booking = await prisma.flightBooking.update({
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

        return res.json(serializeFlightRequest(booking, { includeInternalFields: true }));
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Flight request not found' });
        }

        return res.status(500).send('Server Error');
    }
});

// @route   DELETE api/flights/:id
// @desc    Delete a flight request
// @access  Private (Admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.flightBooking.delete({
            where: { id },
        });
        return res.json({ msg: 'Request deleted' });
    } catch (err) {
        console.error(err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Flight request not found' });
        }

        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/flights/:id/cancel
// @desc    Cancel a flight request
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const booking = await prisma.flightBooking.findUnique({
            where: { id },
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.flightBooking.update({
            where: { id },
            data: { status: 'Cancelled' },
        });

        await sendNotification(req.app, {
            userId,
            title: 'Flight Request Cancelled',
            message: `Flight request #${updatedBooking.id} (${updatedBooking.from} to ${updatedBooking.to}) was cancelled.`,
            type: 'FLIGHT_CANCELLED',
            bookingId: updatedBooking.id,
        });

        return res.json(serializeFlightRequest(updatedBooking));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
