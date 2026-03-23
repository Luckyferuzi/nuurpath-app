const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');

// @route   GET api/flights
// @desc    Get flight bookings (User sees theirs, Admin sees all)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Check user role
        const userId = parseInt(req.user.id);
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
        const { from, to, departureDate, returnDate, passengers, travelClass, contactName, contactEmail, contactPhone, userId } = req.body;
        
        // Validate required fields
        if (!from || !to || !departureDate || !contactName || !contactEmail || !contactPhone) {
            return res.status(400).json({ msg: 'Please enter all required fields' });
        }

        const depDate = new Date(departureDate);
        if (isNaN(depDate.getTime())) {
            return res.status(400).json({ msg: 'Invalid departure date' });
        }

        // Automatically link to user if authenticated via softAuth, otherwise check body
        let validUserId = null;
        if (req.user && req.user.id) {
            validUserId = parseInt(req.user.id);
        } else if (userId) {
            const parsedId = parseInt(userId);
            if (!isNaN(parsedId)) validUserId = parsedId;
        }

        const booking = await prisma.flightBooking.create({
            data: {
                from,
                to,
                departureDate: depDate,
                returnDate: returnDate && returnDate !== '' && !isNaN(new Date(returnDate).getTime()) ? new Date(returnDate) : null,
                passengers: parseInt(passengers) || 1,
                travelClass,
                contactName,
                contactEmail,
                contactPhone,
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

// @route   PUT api/flights/:id
// @desc    Update flight booking status (Admin)
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await prisma.flightBooking.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
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
        await prisma.flightBooking.delete({
            where: { id: parseInt(req.params.id) }
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
        const id = parseInt(req.params.id);

        const booking = await prisma.flightBooking.findUnique({
            where: { id }
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // Ensure user owns the booking
        if (booking.userId !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.flightBooking.update({
            where: { id },
            data: { status: 'Cancelled' }
        });

        // Create Notification for the user
        await prisma.notification.create({
            data: {
                userId: parseInt(req.user.id),
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