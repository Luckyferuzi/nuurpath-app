const request = require('supertest');
const { loadRouterWithMocks } = require('./helpers/routerHarness');

describe('admin, manager, and protected pipeline behavior', () => {
    test('manager cannot access the admin user-management route', async () => {
        const { app } = loadRouterWithMocks('../../routes/users', '/users');

        const response = await request(app)
            .post('/users')
            .set('x-test-user-id', '21')
            .set('x-test-user-role', 'manager')
            .send({
                name: 'Should Fail',
                email: 'blocked@example.com',
                password: 'password123',
                role: 'admin',
            });

        expect(response.status).toBe(403);
    });

    test('normal users cannot access admin-only user-management routes', async () => {
        const { app } = loadRouterWithMocks('../../routes/users', '/users');

        const response = await request(app)
            .get('/users')
            .set('x-test-user-id', '22')
            .set('x-test-user-role', 'user');

        expect(response.status).toBe(403);
    });

    test('admin can create manager accounts', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/users', '/users');

        mockPrisma.user.findUnique.mockResolvedValueOnce(null);
        mockPrisma.user.create.mockResolvedValue({
            id: 23,
            name: 'Ops Manager',
            email: 'manager@example.com',
            role: 'manager',
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
        });

        const response = await request(app)
            .post('/users')
            .set('x-test-user-id', '1')
            .set('x-test-user-role', 'admin')
            .send({
                name: 'Ops Manager',
                email: 'manager@example.com',
                password: 'password123',
                role: 'manager',
            });

        expect(response.status).toBe(201);
        expect(response.body.role).toBe('manager');
    });

    test('admin cannot create admin accounts from the user-management page', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/users', '/users');

        const response = await request(app)
            .post('/users')
            .set('x-test-user-id', '1')
            .set('x-test-user-role', 'admin')
            .send({
                name: 'Blocked Admin',
                email: 'blocked-admin@example.com',
                password: 'password123',
                role: 'admin',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('Admins can create only user or manager accounts from this page.');
        expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    test('the last admin cannot be demoted', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/users', '/users');

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'admin@example.com',
            role: 'admin',
        });
        mockPrisma.user.count.mockResolvedValue(1);

        const response = await request(app)
            .put('/users/1')
            .set('x-test-user-id', '99')
            .set('x-test-user-role', 'admin')
            .send({
                role: 'user',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('You cannot demote the last remaining admin.');
    });

    test('the last admin cannot be deleted', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/users', '/users');

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 1,
            role: 'admin',
        });
        mockPrisma.user.count.mockResolvedValue(1);

        const response = await request(app)
            .delete('/users/1')
            .set('x-test-user-id', '2')
            .set('x-test-user-role', 'admin');

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('You cannot delete the last remaining admin.');
    });

    test('manager can update flight pipeline status and internal notes', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        mockPrisma.flightBooking.update.mockResolvedValue({
            id: 11,
            userId: 55,
            from: 'DAR',
            to: 'JED',
            departureDate: new Date('2026-11-15T00:00:00.000Z'),
            returnDate: null,
            passengers: 1,
            travelClass: 'Economy',
            contactName: 'Flight Guest',
            contactEmail: 'flight@example.com',
            contactPhone: '+255700000003',
            status: 'Quoted',
            adminNotes: 'Continue on WhatsApp',
            lastContactedAt: new Date('2026-07-09T00:00:00.000Z'),
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            user: null,
        });

        const response = await request(app)
            .put('/flights/11')
            .set('x-test-user-id', '3')
            .set('x-test-user-role', 'manager')
            .send({
                status: 'Quoted',
                adminNotes: 'Continue on WhatsApp',
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Quoted');
        expect(response.body.adminNotes).toBe('Continue on WhatsApp');
        expect(mockPrisma.flightBooking.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'Quoted',
                adminNotes: 'Continue on WhatsApp',
                lastContactedAt: expect.any(Date),
            }),
        }));
    });

    test('invalid flight pipeline statuses are rejected', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        const response = await request(app)
            .put('/flights/11')
            .set('x-test-user-id', '3')
            .set('x-test-user-role', 'manager')
            .send({
                status: 'Unknown Stage',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('Status must match the operational pipeline.');
        expect(mockPrisma.flightBooking.update).not.toHaveBeenCalled();
    });

    test('normal users can list only their own flight requests and do not see internal notes', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        mockPrisma.user.findUnique.mockResolvedValue({
            id: 7,
            role: 'user',
        });
        mockPrisma.flightBooking.findMany.mockResolvedValue([
            {
                id: 501,
                userId: 7,
                from: 'DAR',
                to: 'JED',
                departureDate: new Date('2026-11-15T00:00:00.000Z'),
                returnDate: null,
                passengers: 1,
                travelClass: 'Economy',
                contactName: 'Flight Guest',
                contactEmail: 'flight@example.com',
                contactPhone: '+255700000003',
                status: 'Quoted',
                adminNotes: 'Internal only',
                lastContactedAt: new Date('2026-07-09T00:00:00.000Z'),
                createdAt: new Date('2026-07-09T00:00:00.000Z'),
                updatedAt: new Date('2026-07-09T00:00:00.000Z'),
                user: {
                    id: 7,
                    email: 'flight@example.com',
                },
            },
        ]);

        const response = await request(app)
            .get('/flights')
            .set('x-test-user-id', '7')
            .set('x-test-user-role', 'user');

        expect(response.status).toBe(200);
        expect(mockPrisma.flightBooking.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 7 },
        }));
        expect(response.body[0]).not.toHaveProperty('adminNotes');
        expect(response.body[0]).not.toHaveProperty('lastContactedAt');
    });

    test('manager can update service inquiry pipeline notes', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/serviceRoutes', '/services');

        mockPrisma.serviceInquiry.update.mockResolvedValue({
            id: 61,
            inquiryId: 61,
            userId: null,
            serviceType: 'Visa Assistance',
            contactName: 'Service Guest',
            contactEmail: 'service@example.com',
            contactPhone: '+255700000005',
            country: 'Saudi Arabia',
            preferredDate: null,
            applicants: null,
            urgency: null,
            documentStatus: null,
            message: 'Need help with visa processing.',
            status: 'Docs Requested',
            adminNotes: 'Asked customer for passport copy.',
            lastContactedAt: new Date('2026-07-09T00:00:00.000Z'),
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            user: null,
            service: null,
        });

        const response = await request(app)
            .put('/services/inquiries/61')
            .set('x-test-user-id', '5')
            .set('x-test-user-role', 'manager')
            .send({
                status: 'Docs Requested',
                adminNotes: 'Asked customer for passport copy.',
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Docs Requested');
        expect(response.body.adminNotes).toBe('Asked customer for passport copy.');
    });
});
