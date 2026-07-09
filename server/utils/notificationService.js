const prisma = require('../db');
const { getNotificationRoomForUser } = require('./socketRooms');

function toPositiveInteger(value) {
    const normalized = Number.parseInt(value, 10);

    if (!Number.isInteger(normalized) || normalized <= 0) {
        return null;
    }

    return normalized;
}

function requireNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${fieldName} is required.`);
    }

    return value.trim();
}

function normalizeOptionalString(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${fieldName} must be a non-empty string.`);
    }

    return value.trim();
}

async function createNotification({ userId, title, message, type, bookingId }) {
    try {
        const normalizedUserId = toPositiveInteger(userId);
        if (normalizedUserId === null) {
            throw new Error('Notification userId must be a positive integer.');
        }

        const normalizedTitle = requireNonEmptyString(title, 'Notification title');
        const normalizedMessage = requireNonEmptyString(message, 'Notification message');
        const normalizedType = normalizeOptionalString(type, 'Notification type');

        const data = {
            userId: normalizedUserId,
            title: normalizedTitle,
            message: normalizedMessage,
        };

        if (normalizedType) {
            data.type = normalizedType;
        }

        if (bookingId !== undefined && bookingId !== null && bookingId !== '') {
            const normalizedBookingId = toPositiveInteger(bookingId);
            if (normalizedBookingId === null) {
                throw new Error('Notification bookingId must be a positive integer.');
            }

            data.bookingId = normalizedBookingId;
        }

        return prisma.notification.create({ data });
    } catch (error) {
        console.error('[NotificationService] Failed to create notification:', error.message);
        throw error;
    }
}

async function sendNotification(app, params) {
    const notification = await createNotification(params);

    try {
        const targetUser = await prisma.user.findUnique({
            where: { id: notification.userId },
            select: { id: true },
        });
        const io = app && typeof app.get === 'function' ? app.get('io') : null;

        if (io && targetUser) {
            io.to(getNotificationRoomForUser(targetUser.id)).emit('receive_notification', notification);
        }
    } catch (error) {
        console.error('[NotificationService] Failed to emit notification:', error.message);
    }

    return notification;
}

module.exports = {
    createNotification,
    sendNotification,
};
