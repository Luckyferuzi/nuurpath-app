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
const {
    STAFF_USER_SUMMARY_SELECT,
    buildRequestWorkflowSignals,
    buildStaffWhereClause,
} = require('../utils/staffRequestIntelligence');
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

function normalizeFreeText(value) {
    return String(value || '').trim().toLowerCase();
}

function packageRequestNeedsDocuments(booking) {
    if ((booking.status || '').toLowerCase() === 'docs requested') {
        return true;
    }

    return !booking.locationFrom ||
        !booking.travelDate ||
        !booking.passportNumber ||
        !booking.passportExpiryDate ||
        !booking.dateOfBirth ||
        !booking.nationality ||
        !booking.passportCopy;
}

function serviceRequestPriorityLabel(urgency) {
    const normalizedUrgency = normalizeFreeText(urgency);

    if (
        normalizedUrgency.includes('urgent') ||
        normalizedUrgency.includes('asap') ||
        normalizedUrgency.includes('high') ||
        normalizedUrgency.includes('immediate') ||
        normalizedUrgency.includes('today')
    ) {
        return 'High';
    }

    if (
        normalizedUrgency.includes('soon') ||
        normalizedUrgency.includes('medium') ||
        normalizedUrgency.includes('this week')
    ) {
        return 'Medium';
    }

    return normalizedUrgency ? 'Normal' : 'Standard';
}

function serviceRequestNeedsDocuments(inquiry) {
    const normalizedStatus = normalizeFreeText(inquiry.status);
    const normalizedDocumentStatus = normalizeFreeText(inquiry.documentStatus);

    if (normalizedStatus === 'docs requested') {
        return true;
    }

    return normalizedDocumentStatus.includes('missing') ||
        normalizedDocumentStatus.includes('need') ||
        normalizedDocumentStatus.includes('expired') ||
        normalizedDocumentStatus.includes('renew');
}

function buildOperationalWorkflow(record) {
    switch (record.type) {
        case 'package':
            return buildRequestWorkflowSignals(record, {
                waitingForDocuments: packageRequestNeedsDocuments(record),
            });
        case 'service':
            return buildRequestWorkflowSignals(record, {
                waitingForDocuments: serviceRequestNeedsDocuments(record),
                priorityLabel: serviceRequestPriorityLabel(record.urgency),
            });
        default:
            return buildRequestWorkflowSignals(record);
    }
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

        const [packageBookings, flightBookings, consultations, serviceInquiries, publishedMediaPosts, activeNewsletterSubscribers, staffMembers] = await prisma.$transaction([
            prisma.packageBooking.findMany({
                include: {
                    package: {
                        select: {
                            id: true,
                            price: true,
                        },
                    },
                    assignedStaff: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                    lastUpdatedBy: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                },
            }),
            prisma.flightBooking.findMany({
                include: {
                    assignedStaff: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                    lastUpdatedBy: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                },
            }),
            prisma.privateConsultation.findMany({
                include: {
                    assignedStaff: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                    lastUpdatedBy: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                },
            }),
            prisma.serviceInquiry.findMany({
                include: {
                    assignedStaff: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                    lastUpdatedBy: {
                        select: STAFF_USER_SUMMARY_SELECT,
                    },
                },
            }),
            prisma.mediaPost.count({
                where: {
                    isPublished: true,
                },
            }),
            prisma.newsletterSubscriber.count({
                where: {
                    isActive: true,
                },
            }),
            prisma.user.findMany({
                where: buildStaffWhereClause(),
                select: STAFF_USER_SUMMARY_SELECT,
                orderBy: [
                    { role: 'asc' },
                    { name: 'asc' },
                ],
            }),
        ]);

        const allOperationalRecords = [
            ...packageBookings.map((record) => ({ type: 'package', ...record })),
            ...flightBookings.map((record) => ({ type: 'flight', ...record })),
            ...consultations.map((record) => ({ type: 'consultation', ...record })),
            ...serviceInquiries.map((record) => ({ type: 'service', ...record })),
        ];
        const workflowRecords = allOperationalRecords.map((record) => ({
            ...record,
            workflow: buildOperationalWorkflow(record),
        }));
        const openRecords = workflowRecords.filter((record) => (
            !isWonOperationalStatus(record.status) && !isLostOperationalStatus(record.status)
        ));

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
        const overdueFollowUps = openRecords.filter((record) => record.workflow.isOverdueFollowUp).length;
        const waitingForDocuments = openRecords.filter((record) => record.workflow.isWaitingForDocuments).length;
        const unassignedOpenRequests = openRecords.filter((record) => record.workflow.isUnassigned).length;

        const handledRequestsCount = completedRequests + lostOrCancelled;
        const conversionRate = handledRequestsCount > 0
            ? Math.round((completedRequests / handledRequestsCount) * 100)
            : 0;

        const openRequestBreakdown = [
            { name: 'Package Requests', value: openRecords.filter((record) => record.type === 'package').length },
            { name: 'Flight Requests', value: openRecords.filter((record) => record.type === 'flight').length },
            { name: 'Consultations', value: openRecords.filter((record) => record.type === 'consultation').length },
            { name: 'Service Inquiries', value: openRecords.filter((record) => record.type === 'service').length },
        ];

        const teamWorkload = staffMembers.map((staffMember) => {
            const assignedRecords = workflowRecords.filter((record) => record.workflow.assignedStaff?.id === staffMember.id);
            const assignedOpenRecords = assignedRecords.filter((record) => (
                !isWonOperationalStatus(record.status) && !isLostOperationalStatus(record.status)
            ));

            return {
                ...staffMember,
                openRequests: assignedOpenRecords.length,
                overdueFollowUps: assignedOpenRecords.filter((record) => record.workflow.isOverdueFollowUp).length,
                waitingForDocuments: assignedOpenRecords.filter((record) => record.workflow.isWaitingForDocuments).length,
                wonRequests: assignedRecords.filter((record) => isWonOperationalStatus(record.status)).length,
                recentlyUpdatedRequests: assignedOpenRecords.filter((record) => (record.workflow.daysSinceLastAction ?? 99) <= 2).length,
            };
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
            overdueFollowUps,
            waitingForDocuments,
            unassignedOpenRequests,
            totalPackageRequests: packageBookings.length,
            totalFlightRequests: flightBookings.length,
            totalConsultations: consultations.length,
            totalServiceInquiries: serviceInquiries.length,
            publishedMediaPosts,
            activeNewsletterSubscribers,
            conversionSummary: {
                wonCount: completedRequests,
                lostCount: lostOrCancelled,
                conversionRate,
            },
            attentionSummary: [
                { name: 'New requests', value: newRequests },
                { name: 'Unassigned open', value: unassignedOpenRequests },
                { name: 'Waiting documents', value: waitingForDocuments },
                { name: 'Overdue follow-up', value: overdueFollowUps },
            ],
            openRequestBreakdown,
            teamWorkload,
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

// @route   GET api/admin/staff-directory
// @desc    Get assignable staff accounts
// @access  Private (Admin/Manager)
router.get('/staff-directory', auth, requireAdminOrManager, async (req, res) => {
    try {
        const staffMembers = await prisma.user.findMany({
            where: buildStaffWhereClause(),
            select: STAFF_USER_SUMMARY_SELECT,
            orderBy: [
                { role: 'asc' },
                { name: 'asc' },
            ],
        });

        res.json(staffMembers);
    } catch (err) {
        console.error('Error fetching staff directory:', err.message);
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
