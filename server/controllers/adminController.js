const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
    try {
        const userCount = await prisma.user.count();
        const packageBookingCount = await prisma.packageBooking.count();
        const flightBookingCount = await prisma.flightBooking.count();
        const appointmentCount = await prisma.appointment.count();
        const packageCount = await prisma.travelPackage.count();
        const reviewCount = await prisma.review.count();

        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        const recentBookings = await prisma.packageBooking.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                package: { select: { title: true } }
            }
        });

        res.json({
            stats: {
                users: userCount,
                bookings: packageBookingCount + flightBookingCount,
                appointments: appointmentCount,
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
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
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
        const user = await prisma.user.update({
            where: { id: req.params.userId },
            data: { role }
        });

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
        await prisma.user.delete({
            where: { id: req.params.userId }
        });

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
        const bookings = await prisma.packageBooking.findMany({
            include: {
                user: { select: { name: true, email: true } },
                package: { select: { title: true, description: true, price: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

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
        await prisma.packageBooking.delete({
            where: { id: req.params.bookingId }
        });

        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error deleting booking', 500));
    }
};
