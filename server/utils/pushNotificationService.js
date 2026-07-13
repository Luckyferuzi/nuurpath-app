const webpush = require('web-push');
const prisma = require('../db');
const env = require('../config/env');

const DEFAULT_PUSH_CONTACT = 'mailto:support@nuurpath.com';

function toPositiveInteger(value) {
    const normalized = Number.parseInt(value, 10);

    if (!Number.isInteger(normalized) || normalized <= 0) {
        return null;
    }

    return normalized;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function isPushNotificationsConfigured() {
    return Boolean(normalizeString(env.VAPID_PUBLIC_KEY) && normalizeString(env.VAPID_PRIVATE_KEY));
}

function ensureWebPushConfiguration() {
    if (!isPushNotificationsConfigured()) {
        return false;
    }

    webpush.setVapidDetails(
        normalizeString(env.PUSH_NOTIFICATIONS_CONTACT) || normalizeString(env.ADMIN_EMAIL) || DEFAULT_PUSH_CONTACT,
        normalizeString(env.VAPID_PUBLIC_KEY),
        normalizeString(env.VAPID_PRIVATE_KEY)
    );

    return true;
}

function getPushNotificationsPublicKey() {
    return isPushNotificationsConfigured() ? normalizeString(env.VAPID_PUBLIC_KEY) : null;
}

function normalizePushSubscription(subscription) {
    const endpoint = normalizeString(subscription?.endpoint);
    const p256dh = normalizeString(subscription?.keys?.p256dh);
    const auth = normalizeString(subscription?.keys?.auth);

    if (!endpoint) {
        throw new Error('Push subscription endpoint is required.');
    }

    if (!p256dh || !auth) {
        throw new Error('Push subscription keys are incomplete.');
    }

    return {
        endpoint,
        p256dh,
        auth,
    };
}

function resolveNotificationTargetUrl(notification, role) {
    const normalizedRole = normalizeString(role).toLowerCase();
    const normalizedType = normalizeString(notification?.type).toUpperCase();

    if (normalizedRole === 'admin' || normalizedRole === 'manager') {
        if (normalizedType === 'NEW_BOOKING' || normalizedType === 'PACKAGE_REQUEST' || normalizedType === 'BOOKING_UPDATE') {
            return '/admin/package-bookings';
        }

        if (normalizedType === 'NEW_FLIGHT_REQUEST') {
            return '/admin/flight-bookings';
        }

        if (normalizedType === 'NEW_SERVICE_INQUIRY') {
            return '/admin/service-inquiries';
        }

        if (normalizedType === 'NEW_CONSULTATION') {
            return '/admin/consultations';
        }

        return '/admin';
    }

    return '/dashboard?tab=notifications';
}

function buildPushPayload(notification, user) {
    return JSON.stringify({
        title: normalizeString(notification?.title) || 'NuurPath Alert',
        body: normalizeString(notification?.message) || 'You have a new notification.',
        tag: `nuurpath-notification-${notification.id}`,
        data: {
            notificationId: notification.id,
            type: notification.type || 'info',
            bookingId: notification.bookingId || null,
            createdAt: notification.createdAt,
            url: resolveNotificationTargetUrl(notification, user?.role),
        },
    });
}

async function upsertPushSubscription({ userId, subscription, userAgent }) {
    if (!ensureWebPushConfiguration()) {
        throw new Error('Push notifications are not configured on the server.');
    }

    const normalizedUserId = toPositiveInteger(userId);
    if (normalizedUserId === null) {
        throw new Error('Push subscription userId must be a positive integer.');
    }

    const normalizedSubscription = normalizePushSubscription(subscription);
    const normalizedUserAgent = normalizeString(userAgent) || null;

    return prisma.pushSubscription.upsert({
        where: {
            endpoint: normalizedSubscription.endpoint,
        },
        update: {
            userId: normalizedUserId,
            p256dh: normalizedSubscription.p256dh,
            auth: normalizedSubscription.auth,
            userAgent: normalizedUserAgent,
        },
        create: {
            userId: normalizedUserId,
            endpoint: normalizedSubscription.endpoint,
            p256dh: normalizedSubscription.p256dh,
            auth: normalizedSubscription.auth,
            userAgent: normalizedUserAgent,
        },
    });
}

async function removePushSubscription({ userId, endpoint }) {
    const normalizedEndpoint = normalizeString(endpoint);
    const normalizedUserId = userId === undefined || userId === null ? null : toPositiveInteger(userId);

    if (!normalizedEndpoint) {
        throw new Error('Push subscription endpoint is required.');
    }

    const where = {
        endpoint: normalizedEndpoint,
    };

    if (normalizedUserId !== null) {
        where.userId = normalizedUserId;
    }

    return prisma.pushSubscription.deleteMany({ where });
}

async function sendPushNotificationToUser(user, notification) {
    if (!ensureWebPushConfiguration()) {
        return { delivered: 0, failed: 0, skipped: true };
    }

    const normalizedUserId = toPositiveInteger(user?.id);
    if (normalizedUserId === null) {
        return { delivered: 0, failed: 0, skipped: true };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: normalizedUserId },
    });

    if (subscriptions.length === 0) {
        return { delivered: 0, failed: 0, skipped: true };
    }

    const payload = buildPushPayload(notification, user);
    let delivered = 0;
    let failed = 0;

    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            }, payload);
            delivered += 1;
        } catch (error) {
            failed += 1;

            const statusCode = Number(error?.statusCode || error?.status || 0);
            if (statusCode === 404 || statusCode === 410) {
                await prisma.pushSubscription.deleteMany({
                    where: { endpoint: subscription.endpoint },
                });
            } else {
                console.error('[PushNotificationService] Failed to send push notification:', error.message);
            }
        }
    }));

    return { delivered, failed, skipped: false };
}

module.exports = {
    getPushNotificationsPublicKey,
    isPushNotificationsConfigured,
    removePushSubscription,
    sendPushNotificationToUser,
    upsertPushSubscription,
};
