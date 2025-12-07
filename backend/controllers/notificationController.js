const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// @route   POST api/notifications
// @desc    Create a notification for a user
// @access  Private
exports.createNotification = async (req, res, next) => {
    const { userId, title, message, type } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const notification = new Notification({
            user: userId,
            title,
            message,
            type: type || 'info',
        });

        await notification.save();
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
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 });

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
        const notifications = await Notification.find({
            user: req.user.id,
            read: false,
        }).sort({ createdAt: -1 });

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
        const notification = await Notification.findById(req.params.notificationId);
        if (!notification) {
            return next(new AppError('Notification not found', 404));
        }

        // Check if notification belongs to current user
        if (notification.user.toString() !== req.user.id) {
            return next(new AppError('Not authorized to mark this notification as read', 403));
        }

        notification.read = true;
        await notification.save();

        res.json(notification);
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
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true } }
        );

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
        const notification = await Notification.findById(req.params.notificationId);
        if (!notification) {
            return next(new AppError('Notification not found', 404));
        }

        // Check if notification belongs to current user
        if (notification.user.toString() !== req.user.id) {
            return next(new AppError('Not authorized to delete this notification', 403));
        }

        await notification.remove();
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
        await Notification.deleteMany({ user: req.user.id });
        res.json({ message: 'All notifications cleared successfully' });
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error clearing all notifications', 500));
    }
};

// Admin function to send notification to all users
exports.sendNotificationToAllUsers = async (title, message, type = 'info') => {
    try {
        const users = await User.find();
        const notifications = users.map(user => ({
            user: user._id,
            title,
            message,
            type,
        }));

        await Notification.insertMany(notifications);
        return { success: true, count: users.length };
    } catch (err) {
        console.error(err.message);
        return { success: false, error: err.message };
    }
};
