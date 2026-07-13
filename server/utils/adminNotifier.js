const prisma = require('../db');
const { createNotification, deliverNotification } = require('./notificationService');

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
            select: { id: true, email: true, role: true },
        });
        const results = await Promise.allSettled(admins.map(async (admin) => {
            const notification = await createNotification({
                userId: admin.id,
                title,
                message,
                type,
                bookingId,
            });

            await deliverNotification(app, notification, admin);

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
