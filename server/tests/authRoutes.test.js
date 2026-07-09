const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('supertest');
const { loadRouterWithMocks } = require('./helpers/routerHarness');

function sha256(value) {
    return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

describe('auth routes', () => {
    test('public registration always creates a user role and does not fail when email sending is unavailable', async () => {
        const {
            app,
            mockPrisma,
            mockSendEmail,
        } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            mockSecurity: {
                createRandomToken: jest.fn(() => 'verify-raw-token'),
            },
        });

        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue({
            id: 10,
            name: 'New Customer',
            email: 'new@example.com',
            role: 'user',
        });
        mockSendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));

        const response = await request(app)
            .post('/auth/register')
            .send({
                name: 'New Customer',
                email: 'new@example.com',
                password: 'password123',
                role: 'admin',
            });

        expect(response.status).toBe(200);
        expect(response.body.msg).toBe('Registration successful! You can log in now.');
        expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'user',
                verificationToken: sha256('verify-raw-token'),
                verificationTokenExpires: expect.any(Date),
            }),
        }));
    });

    test('valid login succeeds even when the account is not verified', async () => {
        const { app, mockPrisma, mockJwtSign } = loadRouterWithMocks('../../routes/authRoutes', '/auth');
        const hashedPassword = await bcrypt.hash('password123', 10);

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 7,
            email: 'member@example.com',
            password: hashedPassword,
            role: 'user',
            isVerified: false,
        });

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'member@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(200);
        expect(response.body.token).toBe('signed-jwt');
        expect(mockJwtSign).toHaveBeenCalled();
    });

    test('invalid login stays generic for unknown emails', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth');

        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'missing@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('Invalid email or password.');
    });

    test('forgot password returns a generic response for unknown emails', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth');

        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'nobody@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.msg).toBe('If an account exists for this email, reset instructions have been sent.');
        expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    test('forgot password stores only a hashed reset token', async () => {
        const {
            app,
            mockPrisma,
            mockSendEmail,
        } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            mockSecurity: {
                createRandomToken: jest.fn(() => 'reset-raw-token'),
            },
        });

        const hashedPassword = await bcrypt.hash('password123', 10);
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 4,
            email: 'known@example.com',
            password: hashedPassword,
        });
        mockPrisma.user.update.mockResolvedValue({});

        const response = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'known@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.msg).toBe('If an account exists for this email, reset instructions have been sent.');
        expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 4 },
            data: expect.objectContaining({
                passwordResetToken: sha256('reset-raw-token'),
                passwordResetExpires: expect.any(Date),
            }),
        }));
        expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining('reset-raw-token'),
            text: expect.stringContaining('reset-raw-token'),
        }));
    });

    test('google auth creates customer accounts with the user role only', async () => {
        const {
            app,
            mockPrisma,
            mockVerifyIdToken,
        } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            googleClientId: 'test-google-client-id',
        });

        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => ({
                name: 'Google Customer',
                email: 'google@example.com',
                sub: 'google-sub-id',
                picture: 'https://example.com/avatar.png',
            }),
        });
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue({
            id: 88,
            name: 'Google Customer',
            email: 'google@example.com',
            role: 'user',
            googleId: 'google-sub-id',
        });

        const response = await request(app)
            .post('/auth/google')
            .send({ token: 'google-credential' });

        expect(response.status).toBe(200);
        expect(response.body.token).toBe('signed-jwt');
        expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'user',
                isVerified: true,
            }),
        }));
    });
});
