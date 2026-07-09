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

    test('customer login redirects staff accounts to the staff portal after password verification', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth');
        const hashedPassword = await bcrypt.hash('password123', 10);

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 17,
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
        });

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'admin@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(403);
        expect(response.body.msg).toBe('Staff accounts must sign in from the staff portal.');
        expect(response.body.redirectTo).toBe('/staff/login');
    });

    test('staff login succeeds for manager accounts', async () => {
        const { app, mockPrisma, mockJwtSign } = loadRouterWithMocks('../../routes/authRoutes', '/auth');
        const hashedPassword = await bcrypt.hash('password123', 10);

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 9,
            email: 'manager@example.com',
            password: hashedPassword,
            role: 'manager',
            isVerified: true,
        });

        const response = await request(app)
            .post('/auth/staff/login')
            .send({
                email: 'manager@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(200);
        expect(response.body.token).toBe('signed-jwt');
        expect(mockJwtSign).toHaveBeenCalled();
    });

    test('staff login redirects customer accounts to the customer portal', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth');
        const hashedPassword = await bcrypt.hash('password123', 10);

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 11,
            email: 'member@example.com',
            password: hashedPassword,
            role: 'user',
            isVerified: true,
        });

        const response = await request(app)
            .post('/auth/staff/login')
            .send({
                email: 'member@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(403);
        expect(response.body.msg).toBe('Customer accounts must sign in from the customer login page.');
        expect(response.body.redirectTo).toBe('/login');
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

    test('admin setup status shows availability only when no admin exists and setup token is configured', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            adminSetupToken: 'setup-secret-token',
        });

        mockPrisma.user.count.mockResolvedValue(0);

        const response = await request(app).get('/auth/admin-setup/status');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            adminExists: false,
            setupConfigured: true,
            setupAvailable: true,
        });
    });

    test('admin setup creates the first admin exactly once and returns an auth token', async () => {
        const { app, mockPrisma, mockJwtSign } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            adminSetupToken: 'setup-secret-token',
        });

        mockPrisma.user.count.mockResolvedValue(0);
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue({
            id: 100,
            name: 'Owner',
            email: 'owner@example.com',
            role: 'admin',
        });

        const response = await request(app)
            .post('/auth/admin-setup/register')
            .send({
                name: 'Owner',
                email: 'owner@example.com',
                password: 'password123',
                setupToken: 'setup-secret-token',
            });

        expect(response.status).toBe(201);
        expect(response.body.msg).toBe('Admin setup complete.');
        expect(response.body.token).toBe('signed-jwt');
        expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'admin',
                isVerified: true,
            }),
        }));
        expect(mockJwtSign).toHaveBeenCalled();
    });

    test('admin setup is blocked after the first admin already exists', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/authRoutes', '/auth', {
            adminSetupToken: 'setup-secret-token',
        });

        mockPrisma.user.count.mockResolvedValue(1);

        const response = await request(app)
            .post('/auth/admin-setup/register')
            .send({
                name: 'Second Owner',
                email: 'second-owner@example.com',
                password: 'password123',
                setupToken: 'setup-secret-token',
            });

        expect(response.status).toBe(409);
        expect(response.body.msg).toBe('Admin setup has already been completed.');
        expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
});
