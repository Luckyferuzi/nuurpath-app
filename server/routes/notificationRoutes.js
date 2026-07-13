const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdminOrManager } = require('../middleware/adminAuth');
const { sendNotification } = require('../utils/notificationService');
const {
    getPushNotificationsPublicKey,
    isPushNotificationsConfigured,
    removePushSubscription,
    upsertPushSubscription,
} = require('../utils/pushNotificationService');
const {
    isNonEmptyString,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

// @route   GET api/notifications
// @desc    Get notifications for the current user inbox, with optional staff-wide scope for admins/managers
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const page = req.query.page === undefined ? 1 : toPositiveInteger(req.query.page);
        const limit = req.query.limit === undefined ? 20 : toPositiveInteger(req.query.limit);
        const filter = req.query.filter; // 'unread' or 'all'
        const scope = req.query.scope === 'all' ? 'all' : 'mine';

        if (page === null || limit === null) {
            return sendValidationError(res, 'Page and limit must be positive integers.');
        }

        if (filter !== undefined && filter !== 'unread' && filter !== 'all') {
            return sendValidationError(res, 'Filter must be either unread or all.');
        }

        const skip = (page - 1) * limit;

        const where = {};
        
        // Check if user is admin
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const normalizedRole = String(user?.role || '').toLowerCase();
        const isStaffUser = normalizedRole === 'admin' || normalizedRole === 'manager';

        if (!isStaffUser || scope !== 'all') {
            where.userId = userId;
        }

        if (filter === 'unread') {
            where.read = false;
        }

        const [notifications, total, unreadCount] = await prisma.$transaction([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: limit
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { ...where, read: false } })
        ]);

        res.json({
            notifications,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalNotifications: total,
            unreadCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/notifications/push-settings
// @desc    Get browser push notification settings for the current user
// @access  Private
router.get('/push-settings', auth, async (req, res) => {
    try {
        res.json({
            isConfigured: isPushNotificationsConfigured(),
            publicKey: getPushNotificationsPublicKey(),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/notifications/push-subscriptions
// @desc    Save or update a browser push subscription
// @access  Private
router.post('/push-subscriptions', auth, async (req, res) => {
    try {
        if (!isPushNotificationsConfigured()) {
            return res.status(503).json({ msg: 'Push notifications are not configured on the server yet.' });
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const savedSubscription = await upsertPushSubscription({
            userId,
            subscription: req.body?.subscription,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            id: savedSubscription.id,
            endpoint: savedSubscription.endpoint,
        });
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ msg: err.message || 'Unable to save push subscription.' });
    }
});

// @route   DELETE api/notifications/push-subscriptions
// @desc    Remove a browser push subscription
// @access  Private
router.delete('/push-subscriptions', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        await removePushSubscription({
            userId,
            endpoint: req.body?.endpoint,
        });

        res.json({ msg: 'Push subscription removed.' });
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ msg: err.message || 'Unable to remove push subscription.' });
    }
});

// @route   PUT api/notifications/read-all
// @desc    Mark notifications as read for the current inbox, with optional staff-wide scope for admins/managers
// @access  Private
router.put('/read-all', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const scope = req.query.scope === 'all' ? 'all' : 'mine';
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const where = { read: false };

        const normalizedRole = String(user?.role || '').toLowerCase();
        const isStaffUser = normalizedRole === 'admin' || normalizedRole === 'manager';

        if (!isStaffUser || scope !== 'all') {
            where.userId = userId;
        }

        await prisma.notification.updateMany({
            where,
            data: { read: true }
        });
        res.json({ msg: 'All notifications marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/notifications/clear-all
// @desc    Clear all notifications for the current user
// @access  Private
router.delete('/clear-all', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const result = await prisma.notification.deleteMany({
            where: { userId }
        });

        res.json({ msg: 'Notifications cleared', count: result.count });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const notification = await prisma.notification.findUnique({ where: { id } });

        if (!notification) return res.status(404).json({ msg: 'Notification not found' });

        // Check ownership if not admin
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.role !== 'admin' && user.role !== 'manager' && notification.userId !== userId) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const notification = await prisma.notification.findUnique({ where: { id } });

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Check ownership for non-admin users
        if (user.role !== 'admin' && user.role !== 'manager' && notification.userId !== userId) {
            return res.status(403).json({ msg: 'User not authorized' });
        }

        await prisma.notification.delete({
            where: { id }
        });
        res.json({ msg: 'Notification removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/notifications
// @desc    Create a notification and emit real-time event
// @access  Private (Admin/Manager)
router.post('/', auth, requireAdminOrManager, async (req, res) => {
    try {
        const { userId, title, message, type, bookingId } = req.body;
        const normalizedUserId = toPositiveInteger(userId);
        if (normalizedUserId === null) {
            return sendValidationError(res, 'userId must be a positive integer.');
        }

        if (title !== undefined && title !== null && title !== '' && !isNonEmptyString(title)) {
            return sendValidationError(res, 'Title must be a non-empty string.');
        }

        if (!isNonEmptyString(message)) {
            return sendValidationError(res, 'Message is required.');
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: normalizedUserId },
            select: { id: true },
        });
        if (!targetUser) {
            return sendValidationError(res, 'Target user does not exist.');
        }

        let normalizedBookingId = null;
        if (bookingId !== undefined && bookingId !== null && bookingId !== '') {
            normalizedBookingId = toPositiveInteger(bookingId);
            if (normalizedBookingId === null) {
                return sendValidationError(res, 'bookingId must be a positive integer.');
            }
        }

        if (type !== undefined && type !== null && type !== '' && !isNonEmptyString(type)) {
            return sendValidationError(res, 'Type must be a non-empty string.');
        }
        
        const notification = await sendNotification(req.app, {
            userId: normalizedUserId,
            title: isNonEmptyString(title) ? toTrimmedString(title) : 'Notification',
            message: toTrimmedString(message),
            type: isNonEmptyString(type) ? toTrimmedString(type) : type,
            bookingId: normalizedBookingId
        });

        res.json(notification);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
