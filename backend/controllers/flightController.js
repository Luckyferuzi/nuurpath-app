const FlightBooking = require('../models/FlightBooking');
const AppError = require('../utils/AppError');
const User = require('../models/User'); // Required for admin checks and user population

// @route   POST api/flights
// @desc    Create a new flight booking
// @access  Private (User/Admin)
exports.createFlightBooking = async (req, res, next) => {
    // In a real application, you'd have extensive validation for all fields
    // and likely interact with a GDS/flight API here before saving.
    const { passengers, flights, totalPrice, currency, bookingReference, paymentStatus, transactionId } = req.body;

    try {
        // Basic validation (more comprehensive validation with express-validator/Joi is recommended)
        if (!passengers || passengers.length === 0) {
            return next(new AppError('At least one passenger is required', 400));
        }
        if (!flights || flights.length === 0) {
            return next(new AppError('At least one flight segment is required', 400));
        }
        if (!totalPrice || !bookingReference) {
            return next(new AppError('Total price and booking reference are required', 400));
        }

        // Check for duplicate booking reference (important for uniqueness from GDS)
        const existingBooking = await FlightBooking.findOne({ bookingReference });
        if (existingBooking) {
            return next(new AppError('Booking reference already exists', 409));
        }

        const newBooking = new FlightBooking({
            user: req.user.id, // User ID from JWT
            passengers,
            flights,
            totalPrice,
            currency,
            bookingReference,
            paymentStatus: paymentStatus || 'unpaid', // Default to unpaid
            transactionId,
            bookingStatus: paymentStatus === 'paid' ? 'ticketed' : 'pending', // Assume ticketed if paid immediately
        });

        const flightBooking = await newBooking.save();
        res.status(201).json(flightBooking);
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
        const bookings = await FlightBooking.find({ user: req.user.id })
            .populate('user', ['name', 'email']) // Optionally populate user details
            .sort({ bookedAt: -1 });
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
        const booking = await FlightBooking.findById(req.params.id).populate('user', ['name', 'email']);

        if (!booking) {
            return next(new AppError('Flight booking not found', 404));
        }

        // Check if the requesting user is the owner or an admin
        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return next(new AppError('Not authorized to view this booking', 403));
        }

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Flight booking not found', 404));
        }
        next(new AppError('Server Error fetching flight booking', 500));
    }
};

// @route   GET api/flights
// @desc    Get all flight bookings (Admin only)
// @access  Private (Admin)
exports.getAllFlightBookings = async (req, res, next) => {
    try {
        const bookings = await FlightBooking.find()
            .populate('user', ['name', 'email'])
            .sort({ bookedAt: -1 });
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
    const { bookingStatus, paymentStatus } = req.body; // Can update both

    try {
        let booking = await FlightBooking.findById(req.params.id);

        if (!booking) {
            return next(new AppError('Flight booking not found', 404));
        }

        // Only allow specific status updates or implement stricter logic
        if (bookingStatus && FlightBooking.schema.path('bookingStatus').enumValues.includes(bookingStatus)) {
            booking.bookingStatus = bookingStatus;
        } else if (bookingStatus) {
            return next(new AppError(`Invalid booking status: ${bookingStatus}`, 400));
        }

        if (paymentStatus && FlightBooking.schema.path('paymentStatus').enumValues.includes(paymentStatus)) {
            booking.paymentStatus = paymentStatus;
        } else if (paymentStatus) {
            return next(new AppError(`Invalid payment status: ${paymentStatus}`, 400));
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Flight booking not found', 404));
        }
        next(new AppError('Server Error updating flight booking status', 500));
    }
};

// @route   DELETE api/flights/:id
// @desc    Cancel/Delete a flight booking (User must own or Admin)
// @access  Private (User/Admin)
exports.cancelFlightBooking = async (req, res, next) => {
    try {
        let booking = await FlightBooking.findById(req.params.id);

        if (!booking) {
            return next(new AppError('Flight booking not found', 404));
        }

        // Check if user is the owner or an admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return next(new AppError('Not authorized to cancel this booking', 403));
        }

        // In a real app, cancellation would involve interacting with the airline/GDS
        // and potentially refund processing before simply deleting or marking as cancelled.
        if (booking.bookingStatus === 'cancelled') {
            return next(new AppError('Booking is already cancelled', 400));
        }

        booking.bookingStatus = 'cancelled';
        // Optionally update payment status if a refund is processed
        // booking.paymentStatus = 'refunded';
        await booking.save();
        res.json({ msg: 'Flight booking cancelled', booking });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Flight booking not found', 404));
        }
        next(new AppError('Server Error cancelling flight booking', 500));
    }
};
