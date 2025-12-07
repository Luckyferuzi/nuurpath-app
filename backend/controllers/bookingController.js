const Booking = require('../models/Booking');
const TravelPackage = require('../models/TravelPackage');
const User = require('../models/User');

// @route POST api/bookings
// @desc Create a new booking
// @access Private (User/Admin)
exports.createBooking = async (req, res) => {
    const { packageId, travelDate, numberOfTravelers } = req.body;

    try {
        const travelPackage = await TravelPackage.findById(packageId);
        if (!travelPackage) {
            return res.status(404).json({ msg: 'Travel package not found' });
        }

        // Calculate total price (simplified for this example)
        const totalPrice = travelPackage.price * numberOfTravelers;

        const newBooking = new Booking({
            user: req.user.id, // User ID from JWT
            package: packageId,
            travelDate,
            numberOfTravelers,
            totalPrice,
        });

        const booking = await newBooking.save();
        res.status(201).json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route GET api/bookings/me
// @desc Get current user's bookings
// @access Private (User)
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id }).populate('package', ['title', 'destination', 'price']);
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route GET api/bookings
// @desc Get all bookings (Admin only)
// @access Private (Admin)
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('user', ['name', 'email'])
            .populate('package', ['title', 'destination', 'price']);
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route PUT api/bookings/:id/status
// @desc Update booking status (Admin only)
// @access Private (Admin)
exports.updateBookingStatus = async (req, res) => {
    const { status } = req.body;

    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        booking.status = status;
        await booking.save();
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Booking not found' });
        }
        res.status(500).send('Server Error');
    }
};
