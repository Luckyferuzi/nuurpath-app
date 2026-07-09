const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const { ADMIN_ROLE, USER_ROLE, normalizeRole } = require('../utils/roles');
const {
    isActiveFollowUpStatus,
    isLostOperationalStatus,
    isNewOperationalStatus,
    isWonOperationalStatus,
} = require('../utils/operationalPipeline');
const { sendInvalidId, sendValidationError, toPositiveInteger } = require('../utils/validation');

async function countAdmins() {
    return prisma.user.count({
        where: {
            role: {
                equals: ADMIN_ROLE,
                mode: 'insensitive',
            },
        },
    });
}

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin/Manager)
router.get('/stats', auth, requireAdminOrManager, async (req, res) => {
    try {
        const totalUsers = await prisma.user.count({
            where: {
                role: {
                    equals: USER_ROLE,
                    mode: 'insensitive',
                },
            },
        });

        // Calculate Booking Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [packageBookings, flightBookings, consultations, serviceInquiries] = await prisma.$transaction([
            prisma.packageBooking.findMany({
                include: {
                    package: {
                        select: {
                            id: true,
                            price: true,
                        },
                    },
                },
            }),
            prisma.flightBooking.findMany({
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma.privateConsultation.findMany({
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma.serviceInquiry.findMany({
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        const allOperationalRecords = [
            ...packageBookings.map((record) => ({ type: 'package', ...record })),
            ...flightBookings.map((record) => ({ type: 'flight', ...record })),
            ...consultations.map((record) => ({ type: 'consultation', ...record })),
            ...serviceInquiries.map((record) => ({ type: 'service', ...record })),
        ];

        const pipelineValue = packageBookings.reduce((total, booking) => {
            if (isLostOperationalStatus(booking.status)) {
                return total;
            }

            return total + (Number(booking.package?.price || 0) * Number(booking.passengers || 1));
        }, 0);

        const newRequests = allOperationalRecords.filter((record) => isNewOperationalStatus(record.status)).length;
        const activeFollowUps = allOperationalRecords.filter((record) => isActiveFollowUpStatus(record.status)).length;
        const completedRequests = allOperationalRecords.filter((record) => isWonOperationalStatus(record.status)).length;
        const lostOrCancelled = allOperationalRecords.filter((record) => isLostOperationalStatus(record.status)).length;

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

            const monthlyFlights = flightBookings.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            });

            const monthlyConsultations = consultations.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            });

            const monthlyServices = serviceInquiries.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            });

            const monthlyPipelineValue = monthlyPackages.reduce((acc, curr) => {
                if (isLostOperationalStatus(curr.status)) {
                    return acc;
                }

                return acc + (Number(curr.package?.price || 0) * Number(curr.passengers || 1));
            }, 0);

            trends.push({
                name: key,
                Packages: monthlyPackages.length,
                Flights: monthlyFlights.length,
                Consultations: monthlyConsultations.length,
                Services: monthlyServices.length,
                PipelineValue: monthlyPipelineValue,
            });
        }

        res.json({
            totalUsers,
            pipelineValue,
            newRequests,
            activeFollowUps,
            completedRequests,
            lostOrCancelled,
            totalPackageRequests: packageBookings.length,
            totalFlightRequests: flightBookings.length,
            totalConsultations: consultations.length,
            totalServiceInquiries: serviceInquiries.length,
            trends,
            requestDistribution: [
                { name: 'Package Requests', value: packageBookings.length },
                { name: 'Flight Requests', value: flightBookings.length },
                { name: 'Consultations', value: consultations.length },
                { name: 'Service Inquiries', value: serviceInquiries.length },
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
router.get('/users', auth, requireAdmin, async (req, res) => {
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
router.put('/users/:id/role', auth, requireAdmin, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.params.id);
        if (userId === null) {
            return sendInvalidId(res);
        }

        const { role } = req.body;
        const normalizedRole = normalizeRole(role, '');
        if (!['user', 'admin', 'manager'].includes(normalizedRole)) {
            return sendValidationError(res, 'Role must be user, manager, or admin.');
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!existingUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (normalizeRole(existingUser.role, USER_ROLE) === ADMIN_ROLE && normalizedRole !== ADMIN_ROLE) {
            const adminCount = await countAdmins();
            if (adminCount <= 1) {
                return res.status(400).json({ msg: 'You cannot demote the last remaining admin.' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: normalizedRole },
            select: { id: true, name: true, email: true, role: true },
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
router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.params.id);
        const requestorId = toPositiveInteger(req.user.id);
        if (userId === null || requestorId === null) {
            return sendInvalidId(res);
        }

        if (userId === requestorId) {
            return res.status(400).json({ msg: 'Cannot delete yourself' });
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!userToDelete) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (normalizeRole(userToDelete.role, USER_ROLE) === ADMIN_ROLE) {
            const adminCount = await countAdmins();
            if (adminCount <= 1) {
                return res.status(400).json({ msg: 'You cannot delete the last remaining admin.' });
            }
        }

        await prisma.user.delete({
            where: { id: userId },
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
router.get('/wishlists', auth, requireAdmin, async (req, res) => {
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
