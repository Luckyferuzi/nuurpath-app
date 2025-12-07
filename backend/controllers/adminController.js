const User = require('../models/User');
const Booking = require('../models/Booking');
const TravelPackage = require('../models/TravelPackage');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
    try {
        const userCount = await User.countDocuments();
        const bookingCount = await Booking.countDocuments();
        const packageCount = await TravelPackage.countDocuments();
        const reviewCount = await Review.countDocuments();

        const recentUsers = await User.find()
            .sort({ date: -1 })
            .limit(5)
            .select('-password');

        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .populate('package', 'title');

        res.json({
            stats: {
                users: userCount,
                bookings: bookingCount,
                packages: packageCount,
                reviews: reviewCount,
            },
            recentUsers,
            recentBookings,
        });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching admin stats', 500));
    }
};

// @route   GET api/admin/users
// @desc    Get all users (admin only)
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching all users', 500));
    }
};

// @route   PUT api/admin/users/:userId/role
// @desc    Update user role (admin only)
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
    const { role } = req.body;

    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        if (!['user', 'admin'].includes(role)) {
            return next(new AppError('Invalid role', 400));
        }

        user.role = role;
        await user.save();

        res.json({ message: 'User role updated successfully', user });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error updating user role', 500));
    }
};

// @route   DELETE api/admin/users/:userId
// @desc    Delete user (admin only)
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error deleting user', 500));
    }
};

// @route   GET api/admin/bookings
// @desc    Get all bookings (admin only)
// @access  Private/Admin
exports.getAllBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'name email')
            .populate('package', 'title description price');

        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching all bookings', 500));
    }
};

// @route   DELETE api/admin/bookings/:bookingId
// @desc    Delete booking (admin only)
// @access  Private/Admin
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.bookingId);
        if (!booking) {
            return next(new AppError('Booking not found', 404));
        }

        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error deleting booking', 500));
    }
};
