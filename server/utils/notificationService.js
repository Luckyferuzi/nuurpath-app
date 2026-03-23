const prisma = require('../db');

/**
 * Creates a notification in the database and emits a real-time event.
 * 
 * @param {Object} app - The Express app object (req.app) to access Socket.IO
 * @param {Object} params - Notification details
 * @param {number} params.userId - ID of the user to notify
 * @param {string} params.message - Notification message
 * @param {string} [params.type='INFO'] - Type of notification
 * @param {number} [params.bookingId] - Associated booking ID (optional)
 */
const sendNotification = async (app, { userId, message, type = 'INFO', bookingId = null }) => {
    try {
        // 1. Create Notification in DB
        const notification = await prisma.notification.create({
            data: {
                userId: parseInt(userId),
                message,
                type,
                bookingId: bookingId ? parseInt(bookingId) : null,
                read: false
            }
        });

        // 2. Emit Real-time Event
        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        const io = app.get('io');
        
        if (io && targetUser && targetUser.email) {
            io.to(targetUser.email).emit('receive_notification', notification);
        }

        return notification;
    } catch (err) {
        console.error('Notification Service Error:', err.message);
        throw err;
    }
};

module.exports = { sendNotification };