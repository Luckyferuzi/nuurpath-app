const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// @route   POST api/notifications
// @desc    Create a notification for a user
// @access  Private
exports.createNotification = async (req, res, next) => {
    const { userId, title, message, type } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const notification = await prisma.notification.create({
            data: {
                userId: parseInt(userId),
                title,
                message,
                type: type || 'info',
            },
        });

        res.json(notification);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error creating notification', 500));
    }
};

// @route   GET api/notifications
// @desc    Get current user's notifications
// @access  Private
exports.getUserNotifications = async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching notifications', 500));
    }
};

// @route   GET api/notifications/unread
// @desc    Get current user's unread notifications
// @access  Private
exports.getUnreadNotifications = async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user.id,
                read: false,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching unread notifications', 500));
    }
};

// @route   PUT api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
exports.markNotificationAsRead = async (req, res, next) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: parseInt(req.params.notificationId) }
        });
        if (!notification) {
            return next(new AppError('Notification not found', 404));
        }

        // Check if notification belongs to current user
        if (notification.userId !== req.user.id) {
            return next(new AppError('Not authorized to mark this notification as read', 403));
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: parseInt(req.params.notificationId) },
            data: { read: true }
        });

        res.json(updatedNotification);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error marking notification as read', 500));
    }
};

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
exports.markAllNotificationsAsRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error marking all notifications as read', 500));
    }
};

// @route   DELETE api/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: parseInt(req.params.notificationId) }
        });
        if (!notification) {
            return next(new AppError('Notification not found', 404));
        }

        // Check if notification belongs to current user
        if (notification.userId !== req.user.id) {
            return next(new AppError('Not authorized to delete this notification', 403));
        }

        await prisma.notification.delete({
            where: { id: parseInt(req.params.notificationId) }
        });
        res.json({ message: 'Notification deleted successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error deleting notification', 500));
    }
};

// @route   DELETE api/notifications/clear-all
// @desc    Clear all notifications
// @access  Private
exports.clearAllNotifications = async (req, res, next) => {
    try {
        await prisma.notification.deleteMany({
            where: { userId: req.user.id }
        });
        res.json({ message: 'All notifications cleared successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error clearing all notifications', 500));
    }
};

// Admin function to send notification to all users
exports.sendNotificationToAllUsers = async (title, message, type = 'info') => {
    try {
        const users = await prisma.user.findMany();
        const notificationsData = users.map(user => ({
            userId: user.id,
            title,
            message,
            type,
        }));

        await prisma.notification.createMany({
            data: notificationsData
        });
        return { success: true, count: users.length };
    } catch (err) {
        console.error(err.message);
        return { success: false, error: err.message };
    }
};
