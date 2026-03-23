const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sendNotification } = require('../utils/notificationService');

// @route   GET api/notifications
// @desc    Get notifications (Admin sees all/filtered, User sees theirs)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filter = req.query.filter; // 'unread' or 'all'
        const skip = (page - 1) * limit;

        const where = {};
        
        // Check if user is admin
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user.role !== 'admin' && user.role !== 'manager') {
            where.userId = req.user.id;
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
            prisma.notification.count({ where: { read: false } })
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

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private (Admin)
router.put('/read-all', auth, adminAuth, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true }
        });
        res.json({ msg: 'All notifications marked as read' });
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
        const id = parseInt(req.params.id);
        const notification = await prisma.notification.findUnique({ where: { id } });

        if (!notification) return res.status(404).json({ msg: 'Notification not found' });

        // Check ownership if not admin
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user.role !== 'admin' && user.role !== 'manager' && notification.userId !== req.user.id) {
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
        const id = parseInt(req.params.id);
        const notification = await prisma.notification.findUnique({ where: { id } });

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        // Check ownership
        if (notification.userId !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
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
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { userId, message, type, bookingId } = req.body;
        
        const notification = await sendNotification(req.app, {
            userId,
            message,
            type,
            bookingId
        });

        res.json(notification);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;