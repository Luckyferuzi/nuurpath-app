const express = require('express');

function createModelMock() {
    return {
        count: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
    };
}

function createMockPrisma() {
    return {
        user: createModelMock(),
        newsletterSubscriber: createModelMock(),
        emailSuppression: createModelMock(),
        emailCampaign: createModelMock(),
        emailCampaignRecipient: createModelMock(),
        package: createModelMock(),
        packageBooking: createModelMock(),
        flightBooking: createModelMock(),
        service: createModelMock(),
        serviceInquiry: createModelMock(),
        notification: createModelMock(),
        privateConsultation: createModelMock(),
        chatMessage: createModelMock(),
        storedFile: createModelMock(),
        $transaction: jest.fn(async (operations) => {
            if (Array.isArray(operations)) {
                return Promise.all(operations);
            }

            return operations;
        }),
    };
}

function createUserFromHeaders(req) {
    const rawId = req.header('x-test-user-id');
    if (!rawId) {
        return null;
    }

    const numericId = Number(rawId);
    const resolvedId = Number.isNaN(numericId) ? rawId : numericId;

    return {
        id: resolvedId,
        userId: resolvedId,
        role: String(req.header('x-test-user-role') || 'user').trim().toLowerCase(),
        email: String(req.header('x-test-user-email') || `user${rawId}@example.com`).trim(),
        name: String(req.header('x-test-user-name') || `Test User ${rawId}`).trim(),
    };
}

function createNoOpMiddleware() {
    return (req, res, next) => next();
}

function loadRouterWithMocks(routerModulePath, basePath, options = {}) {
    const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
    const originalAdminSetupToken = process.env.ADMIN_SETUP_TOKEN;

    if (Object.prototype.hasOwnProperty.call(options, 'googleClientId')) {
        if (options.googleClientId) {
            process.env.GOOGLE_CLIENT_ID = options.googleClientId;
        } else {
            delete process.env.GOOGLE_CLIENT_ID;
        }
    }

    if (Object.prototype.hasOwnProperty.call(options, 'adminSetupToken')) {
        if (options.adminSetupToken) {
            process.env.ADMIN_SETUP_TOKEN = options.adminSetupToken;
        } else {
            delete process.env.ADMIN_SETUP_TOKEN;
        }
    }

    jest.resetModules();

    const mockPrisma = createMockPrisma();
    const mockSendEmail = jest.fn().mockResolvedValue({ skipped: false });
    const mockSendBookingConfirmationEmail = jest.fn().mockResolvedValue(undefined);
    const mockGetEmailServiceAvailability = jest.fn().mockReturnValue({ configured: true });
    const mockNotifyAdmins = jest.fn().mockResolvedValue(undefined);
    const mockSendNotification = jest.fn().mockImplementation(async (app, payload) => ({
        id: 999,
        read: false,
        createdAt: new Date('2026-07-09T00:00:00.000Z'),
        ...payload,
    }));
    const mockJwtSign = jest.fn((payload, secret, jwtOptions, callback) => callback(null, 'signed-jwt'));
    const mockVerifyIdToken = jest.fn();

    jest.doMock('../../db', () => mockPrisma);
    jest.doMock('../../config/env', () => ({
        NODE_ENV: 'test',
        isProduction: false,
        PORT: 5000,
        CLIENT_URL: 'http://localhost:3000',
        API_BASE_URL: 'http://localhost:5000',
        DATABASE_URL: 'postgresql://test-db',
        JWT_SECRET: 'test-jwt-secret-1234567890123456',
        ALLOWED_ORIGINS: ['http://localhost:3000'],
        UPLOAD_ROOT: '',
        EMAIL_HOST: '',
        EMAIL_PORT: '',
        EMAIL_USER: '',
        EMAIL_PASS: '',
        EMAIL_FROM: '',
        ADMIN_EMAIL: '',
        ADMIN_SETUP_TOKEN: process.env.ADMIN_SETUP_TOKEN || '',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    }));
    jest.doMock('../../utils/emailService', () => ({
        sendEmail: mockSendEmail,
        sendBookingConfirmationEmail: mockSendBookingConfirmationEmail,
        getEmailServiceAvailability: mockGetEmailServiceAvailability,
    }));
    jest.doMock('../../utils/adminNotifier', () => ({
        notifyAdmins: mockNotifyAdmins,
    }));
    jest.doMock('../../utils/notificationService', () => ({
        sendNotification: mockSendNotification,
    }));
    jest.doMock('../../middleware/rateLimitMiddleware', () => ({
        registerLimiter: createNoOpMiddleware(),
        loginLimiter: createNoOpMiddleware(),
        forgotPasswordLimiter: createNoOpMiddleware(),
        resendVerificationLimiter: createNoOpMiddleware(),
        contactFormLimiter: createNoOpMiddleware(),
        privateConsultationLimiter: createNoOpMiddleware(),
        packageRequestLimiter: createNoOpMiddleware(),
        flightRequestLimiter: createNoOpMiddleware(),
        serviceInquiryLimiter: createNoOpMiddleware(),
    }));
    jest.doMock('../../middleware/auth', () => {
        const auth = (req, res, next) => {
            const user = createUserFromHeaders(req);

            if (!user) {
                return res.status(401).json({
                    msg: 'Authentication required',
                    message: 'Authentication required',
                });
            }

            req.user = user;
            return next();
        };

        auth.auth = auth;
        auth.getTokenFromRequest = jest.fn(() => null);
        auth.getVerifiedUserFromToken = jest.fn();
        auth.normalizeAuthenticatedUser = jest.fn((value) => value);

        return auth;
    });
    jest.doMock('../../middleware/softAuth', () => {
        const softAuth = (req, res, next) => {
            const user = createUserFromHeaders(req);
            if (user) {
                req.user = user;
            }

            return next();
        };

        softAuth.softAuth = softAuth;

        return softAuth;
    });
    jest.doMock('jsonwebtoken', () => ({
        sign: mockJwtSign,
        verify: jest.fn(),
    }));
    jest.doMock('google-auth-library', () => ({
        OAuth2Client: jest.fn(() => ({
            verifyIdToken: mockVerifyIdToken,
        })),
    }));

    if (options.mockSecurity) {
        jest.doMock('../../utils/security', () => ({
            ...jest.requireActual('../../utils/security'),
            ...options.mockSecurity,
        }));
    }

    const router = require(routerModulePath);
    const app = express();
    app.use(express.json());
    app.use(basePath, router);
    app.use((err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Server Error';

        return res.status(statusCode).json({
            success: false,
            message,
            msg: message,
        });
    });

    if (originalGoogleClientId === undefined) {
        delete process.env.GOOGLE_CLIENT_ID;
    } else {
        process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }

    if (originalAdminSetupToken === undefined) {
        delete process.env.ADMIN_SETUP_TOKEN;
    } else {
        process.env.ADMIN_SETUP_TOKEN = originalAdminSetupToken;
    }

    return {
        app,
        mockJwtSign,
        mockNotifyAdmins,
        mockGetEmailServiceAvailability,
        mockPrisma,
        mockSendBookingConfirmationEmail,
        mockSendEmail,
        mockSendNotification,
        mockVerifyIdToken,
    };
}

module.exports = {
    createMockPrisma,
    createUserFromHeaders,
    loadRouterWithMocks,
};
