const prisma = require('../db');
const { createNotification } = require('./notificationService');
const { getNotificationRoomForUser } = require('./socketRooms');

function requireNotificationText(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${fieldName} is required.`);
    }

    return value.trim();
}

async function notifyAdmins(app, data) {
    try {
        const title = requireNotificationText(data?.title, 'Admin notification title');
        const message = requireNotificationText(data?.message, 'Admin notification message');
        const type = typeof data?.type === 'string' && data.type.trim() ? data.type.trim() : undefined;
        const bookingId = data?.bookingId;

        const admins = await prisma.user.findMany({
            where: { role: { in: ['admin', 'manager'] } },
            select: { id: true, email: true },
        });

        const io = app && typeof app.get === 'function' ? app.get('io') : null;
        const results = await Promise.allSettled(admins.map(async (admin) => {
            const notification = await createNotification({
                userId: admin.id,
                title,
                message,
                type,
                bookingId,
            });

            if (io) {
                try {
                    io.to(getNotificationRoomForUser(admin.id)).emit('receive_notification', notification);
                } catch (emitError) {
                    console.error(`[AdminNotifier] Failed to emit notification to ${admin.email}:`, emitError.message);
                }
            }

            return notification;
        }));

        const notifications = results
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value);
        const failures = results.filter((result) => result.status === 'rejected');

        if (failures.length > 0) {
            const error = new Error(`Failed to notify ${failures.length} admin user(s).`);
            console.error('[AdminNotifier] Some admin notifications failed:', failures.map((failure) => failure.reason?.message || String(failure.reason)));
            return { success: false, error, notifications };
        }

        return { success: true, notifications };
    } catch (error) {
        console.error('[AdminNotifier] Failed to notify admins:', error.message);
        return { success: false, error };
    }
}

module.exports = { notifyAdmins };
