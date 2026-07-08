const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');
const {
    isNonEmptyString,
    isValidDate,
    isValidEmail,
    normalizeStatus,
    parseOptionalDate,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

const FLIGHT_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];

// @route   GET api/flights
// @desc    Get flight bookings (User sees theirs, Admin sees all)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Check user role
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        let where = {};
        if (user.role !== 'admin' && user.role !== 'manager') {
            where = { userId: userId };
        }

        const bookings = await prisma.flightBooking.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/flights
// @desc    Create a flight booking request (Public/User)
// @access  Public
router.post('/', softAuth, async (req, res) => {
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

        // Only link to the authenticated user attached by softAuth.
        let validUserId = null;
        if (req.user && req.user.id) {
            validUserId = toPositiveInteger(req.user.id);
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
                userId: validUserId
            }
        });

        // Notify Admins about the new flight request
        await notifyAdmins(req.app, {
            title: 'New Flight Request',
            message: `New flight request #${booking.id} from ${contactName} (${from} to ${to})`,
            type: 'NEW_FLIGHT_REQUEST',
            bookingId: booking.id
        });

        res.json(booking);
    } catch (err) {
        console.error("Flight booking error:", err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/flights/:id
// @desc    Get a single flight booking (User sees own, Admin sees any)
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
            include: { user: true }
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        if (user.role !== 'admin' && user.role !== 'manager' && booking.userId !== userId) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/flights/:id
// @desc    Update flight booking status (Admin)
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const { status } = req.body;
        const normalizedStatus = normalizeStatus(status, FLIGHT_STATUSES);
        if (!normalizedStatus) {
            return sendValidationError(res, 'Status must be Pending, Confirmed, or Cancelled.');
        }

        const booking = await prisma.flightBooking.update({
            where: { id },
            data: { status: normalizedStatus }
        });
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/flights/:id
// @desc    Delete flight booking (Admin)
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.flightBooking.delete({
            where: { id }
        });
        res.json({ msg: 'Booking deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/flights/:id/cancel
// @desc    Cancel a flight booking
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
            where: { id }
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // Ensure user owns the booking
        if (booking.userId !== userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.flightBooking.update({
            where: { id },
            data: { status: 'Cancelled' }
        });

        // Create Notification for the user
        await prisma.notification.create({
            data: {
                userId,
                title: 'Flight Cancellation',
                message: `Flight Booking #${updatedBooking.id} (${updatedBooking.from} to ${updatedBooking.to}) cancelled by user`,
                type: 'FLIGHT_CANCELLED',
                bookingId: updatedBooking.id
            }
        });

        res.json(updatedBooking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
