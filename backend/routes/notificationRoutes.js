const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// @route POST api/notifications
// @desc Create a notification for a user
// @access Private
router.post(
    '/',
    authMiddleware,
    [
        check('userId', 'User ID is required').not().isEmpty(),
        check('title', 'Title is required').not().isEmpty(),
        check('message', 'Message is required').not().isEmpty(),
    ],
    notificationController.createNotification
);

// @route GET api/notifications
// @desc Get current user's notifications
// @access Private
router.get('/', authMiddleware, notificationController.getUserNotifications);

// @route GET api/notifications/unread
// @desc Get current user's unread notifications
// @access Private
router.get('/unread', authMiddleware, notificationController.getUnreadNotifications);

// @route PUT api/notifications/:notificationId/read
// @desc Mark notification as read
// @access Private
router.put('/:notificationId/read', authMiddleware, notificationController.markNotificationAsRead);

// @route PUT api/notifications/read-all
// @desc Mark all notifications as read
// @access Private
router.put('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead);

// @route DELETE api/notifications/:notificationId
// @desc Delete a notification
// @access Private
router.delete('/:notificationId', authMiddleware, notificationController.deleteNotification);

// @route DELETE api/notifications/clear-all
// @desc Clear all notifications
// @access Private
router.delete('/clear-all', authMiddleware, notificationController.clearAllNotifications);

module.exports = router;
