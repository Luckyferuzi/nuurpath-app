const prisma = require('../db');
const AppError = require('../utils/AppError');

// @route   POST api/flights
// @desc    Create a new flight booking
// @access  Private (User/Admin)
exports.createFlightBooking = async (req, res, next) => {
    const { from, to, departureDate, returnDate, cabinClass, passengerDetails, totalPrice } = req.body;

    try {
        const newBooking = await prisma.flightBooking.create({
            data: {
                userId: req.user.id,
                from,
                to,
                departureDate: new Date(departureDate),
                returnDate: returnDate ? new Date(returnDate) : null,
                cabinClass,
                passengerDetails,
                totalPrice,
                status: 'pending',
            },
        });

        res.status(201).json(newBooking);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error creating flight booking', 500));
    }
};

// @route   GET api/flights/me
// @desc    Get current user's flight bookings
// @access  Private (User)
exports.getMyFlightBookings = async (req, res, next) => {
    try {
        const bookings = await prisma.flightBooking.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching user flight bookings', 500));
    }
};

// @route   GET api/flights/:id
// @desc    Get a single flight booking by ID
// @access  Private (User must own, or Admin)
exports.getFlightBookingById = async (req, res, next) => {
    try {
        const booking = await prisma.flightBooking.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { user: { select: { name: true, email: true } } },
        });

        if (!booking) {
            return next(new AppError('Flight booking not found', 404));
        }

        if (booking.userId !== req.user.id && req.user.role !== 'admin') {
            return next(new AppError('Not authorized to view this booking', 403));
        }

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching flight booking', 500));
    }
};

// @route   GET api/flights
// @desc    Get all flight bookings (Admin only)
// @access  Private (Admin)
exports.getAllFlightBookings = async (req, res, next) => {
    try {
        const bookings = await prisma.flightBooking.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching all flight bookings', 500));
    }
};

// @route   PUT api/flights/:id/status
// @desc    Update flight booking status (Admin only)
// @access  Private (Admin)
exports.updateFlightBookingStatus = async (req, res, next) => {
    const { status } = req.body;

    try {
        const booking = await prisma.flightBooking.update({
            where: { id: parseInt(req.params.id) },
            data: { status },
        });

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error updating flight booking status', 500));
    }
};

// @route   DELETE api/flights/:id
// @desc    Cancel/Delete a flight booking (User must own or Admin)
// @access  Private (User/Admin)
exports.cancelFlightBooking = async (req, res, next) => {
    try {
        const booking = await prisma.flightBooking.findUnique({
            where: { id: parseInt(req.params.id) },
        });

        if (!booking) {
            return next(new AppError('Flight booking not found', 404));
        }

        if (booking.userId !== req.user.id && req.user.role !== 'admin') {
            return next(new AppError('Not authorized to cancel this booking', 403));
        }

        const updatedBooking = await prisma.flightBooking.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'cancelled' },
        });

        res.json({ msg: 'Flight booking cancelled', booking: updatedBooking });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error cancelling flight booking', 500));
    }
};
