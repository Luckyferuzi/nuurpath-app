const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/stats', auth, adminAuth, async (req, res) => {
    try {
        const totalUsers = await prisma.user.count({
            where: { role: 'user' }
        });

        const totalPackageBookings = await prisma.packageBooking.count();
        const totalFlightBookings = await prisma.flightBooking.count();
        const totalBookings = totalPackageBookings + totalFlightBookings;

        const activePackageBookings = await prisma.packageBooking.count({
            where: { status: { not: 'Cancelled' } }
        });

        const activeFlightBookings = await prisma.flightBooking.count({
            where: { status: { not: 'Cancelled' } }
        });
        
        const pendingConsultations = await prisma.privateConsultation.count({
            where: { status: 'Pending' }
        });

        // Calculate Booking Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const packageBookings = await prisma.packageBooking.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            include: { package: true }
        });

        const flightBookings = await prisma.flightBooking.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true }
        });

        const trends = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            const key = `${month} ${year}`;
            
            const monthlyPackages = packageBookings.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            });

            const revenue = monthlyPackages.reduce((acc, curr) => {
                return acc + (Number(curr.package.price) * curr.passengers);
            }, 0);
            
            const fCount = flightBookings.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            }).length;

            trends.push({ name: key, Packages: monthlyPackages.length, Flights: fCount, Revenue: revenue });
        }

        const totalRevenue = trends.reduce((acc, curr) => acc + curr.Revenue, 0);

        res.json({
            totalUsers,
            totalBookings,
            totalRevenue,
            activeBookings: activePackageBookings + activeFlightBookings,
            pendingConsultations,
            trends,
            bookingDistribution: [
                { name: 'Packages', value: activePackageBookings },
                { name: 'Flights', value: activeFlightBookings }
            ]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/users
// @desc    Get all users for management
// @access  Private (Admin)
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isVerified: true,
                createdAt: true,
                profilePicture: true
            }
        });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.put('/users/:id/role', auth, adminAuth, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin', 'manager'].includes(role)) {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { role },
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(updatedUser);
    } catch (err) {
        console.error('Error updating user role:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/wishlists
// @desc    Get all wishlist items for management
// @access  Private (Admin)
router.get('/wishlists', auth, adminAuth, async (req, res) => {
    try {
        const wishlists = await prisma.wishlist.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                package: { select: { id: true, title: true, price: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(wishlists);
    } catch (err) {
        console.error('Error fetching wishlists:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;