const prisma = require('../db');

/**
 * Notifies all admins and managers about a new system event
 * @param {Object} app - Express app instance (to access Socket.IO)
 * @param {Object} data - Notification details { title, message, type, bookingId }
 */
const notifyAdmins = async (app, data) => {
    try {
        // 1. Find all admins and managers
        const admins = await prisma.user.findMany({
            where: { role: { in: ['admin', 'manager'] } },
            select: { id: true, email: true }
        });

        const io = app.get('io');

        // 2. Create notifications in parallel
        const notifications = await Promise.all(admins.map(async (admin) => {
            const notification = await prisma.notification.create({
                data: {
                    userId: admin.id,
                    title: data.title,
                    message: data.message,
                    type: data.type || 'ADMIN_ALERT',
                    bookingId: data.bookingId || null
                }
            });

            // 3. Emit real-time event to the admin's private room (joined by email)
            if (io) {
                io.to(admin.email).emit('receive_notification', notification);
            }

            return notification;
        }));

        return notifications;
    } catch (err) {
        console.error('Admin notification failed:', err);
    }
};

module.exports = { notifyAdmins };