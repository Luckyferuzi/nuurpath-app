const request = require('supertest');
const { loadRouterWithMocks } = require('./helpers/routerHarness');

describe('guest-first public request flows', () => {
    test('guest package request works without a login and keeps sensitive optional fields optional', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/bookingRoutes', '/bookings');

        mockPrisma.package.findUnique.mockResolvedValue({
            id: 1,
            title: 'Premium Umrah',
        });
        mockPrisma.packageBooking.create.mockImplementation(async ({ data }) => ({
            id: 101,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
            package: {
                id: 1,
                title: 'Premium Umrah',
            },
        }));

        const response = await request(app)
            .post('/bookings')
            .send({
                packageId: 1,
                passengers: 2,
                travelDate: '2026-12-20',
                contactName: 'Guest Traveler',
                contactEmail: 'guest@example.com',
                contactPhone: '+255700000001',
            });

        expect(response.status).toBe(201);
        expect(response.body.contactName).toBe('Guest Traveler');
        expect(response.body.contactEmail).toBe('guest@example.com');
        expect(response.body.contactPhone).toBe('+255700000001');
        expect(response.body.packageTitle).toBe('Premium Umrah');
        expect(response.body).not.toHaveProperty('passportCopy');
        expect(mockPrisma.packageBooking.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: null,
                passportNumber: null,
                passportExpiryDate: null,
                dateOfBirth: null,
                nationality: null,
                passportCopy: null,
            }),
        }));
    });

    test('logged-in package requests are linked back to the current user', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/bookingRoutes', '/bookings');

        mockPrisma.package.findUnique.mockResolvedValue({
            id: 3,
            title: 'Family Package',
        });
        mockPrisma.packageBooking.create.mockImplementation(async ({ data }) => ({
            id: 102,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
            package: {
                id: 3,
                title: 'Family Package',
            },
        }));
        mockPrisma.notification.create.mockResolvedValue({
            id: 500,
        });

        const response = await request(app)
            .post('/bookings')
            .set('x-test-user-id', '42')
            .set('x-test-user-role', 'user')
            .send({
                packageId: 3,
                passengers: 4,
                travelDate: '2026-12-24',
                contactName: 'Member Traveler',
                contactEmail: 'member@example.com',
                contactPhone: '+255700000002',
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.packageBooking.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: 42,
            }),
        }));
    });

    test('package requests reject invalid package ids with a clear not-found response', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/bookingRoutes', '/bookings');

        mockPrisma.package.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post('/bookings')
            .send({
                packageId: 999,
                passengers: 2,
                travelDate: '2026-12-20',
                contactName: 'Guest Traveler',
                contactEmail: 'guest@example.com',
                contactPhone: '+255700000001',
            });

        expect(response.status).toBe(404);
        expect(response.body.msg).toBe('Selected package does not exist.');
    });

    test('guest flight requests work without a login and store route plus contact details', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        mockPrisma.flightBooking.create.mockImplementation(async ({ data }) => ({
            id: 201,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
        }));

        const response = await request(app)
            .post('/flights')
            .send({
                from: 'DAR',
                to: 'JED',
                departureDate: '2026-11-15',
                passengers: 1,
                travelClass: 'Economy',
                contactName: 'Flight Guest',
                contactEmail: 'flight@example.com',
                contactPhone: '+255700000003',
            });

        expect(response.status).toBe(201);
        expect(response.body.contactName).toBe('Flight Guest');
        expect(response.body.tripType).toBe('One Way');
        expect(mockPrisma.flightBooking.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: null,
                from: 'DAR',
                to: 'JED',
                contactEmail: 'flight@example.com',
            }),
        }));
    });

    test('flight requests reject missing required fields with a 400 response', async () => {
        const { app } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        const response = await request(app)
            .post('/flights')
            .send({
                from: 'DAR',
                departureDate: '2026-11-15',
                passengers: 1,
                travelClass: 'Economy',
                contactName: 'Flight Guest',
                contactEmail: 'flight@example.com',
                contactPhone: '+255700000003',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('Origin and destination are required.');
    });

    test('logged-in flight requests are linked to the active account', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/flightRoutes', '/flights');

        mockPrisma.flightBooking.create.mockImplementation(async ({ data }) => ({
            id: 202,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
        }));

        const response = await request(app)
            .post('/flights')
            .set('x-test-user-id', '55')
            .set('x-test-user-role', 'user')
            .send({
                from: 'DAR',
                to: 'MED',
                departureDate: '2026-11-15',
                returnDate: '2026-11-28',
                passengers: 2,
                travelClass: 'Business',
                contactName: 'Member Flight',
                contactEmail: 'memberflight@example.com',
                contactPhone: '+255700000004',
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.flightBooking.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: 55,
            }),
        }));
    });

    test('guest service inquiries work without a login and keep admin endpoints protected', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/serviceRoutes', '/services');

        mockPrisma.serviceInquiry.create.mockImplementation(async ({ data }) => ({
            id: 301,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
            service: null,
        }));

        const createResponse = await request(app)
            .post('/services/inquiries')
            .send({
                serviceType: 'Visa Assistance',
                contactName: 'Service Guest',
                contactEmail: 'service@example.com',
                contactPhone: '+255700000005',
                country: 'Saudi Arabia',
                message: 'Need help with visa processing.',
            });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.contactName).toBe('Service Guest');
        expect(createResponse.body.serviceTitle).toBe('Visa Assistance');
        expect(mockPrisma.serviceInquiry.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: null,
                serviceType: 'Visa Assistance',
            }),
        }));

        const protectedResponse = await request(app)
            .get('/services/inquiries')
            .set('x-test-user-id', '77')
            .set('x-test-user-role', 'user');

        expect(protectedResponse.status).toBe(403);
    });

    test('logged-in service inquiries are linked to the active account', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/serviceRoutes', '/services');

        mockPrisma.serviceInquiry.create.mockImplementation(async ({ data }) => ({
            id: 302,
            createdAt: new Date('2026-07-09T00:00:00.000Z'),
            updatedAt: new Date('2026-07-09T00:00:00.000Z'),
            ...data,
            service: null,
        }));

        const response = await request(app)
            .post('/services/inquiries')
            .set('x-test-user-id', '66')
            .set('x-test-user-role', 'user')
            .send({
                serviceType: 'Passport Support',
                contactName: 'Service Member',
                contactEmail: 'memberservice@example.com',
                contactPhone: '+255700000006',
                country: 'Tanzania',
                message: 'Need help with a passport renewal.',
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.serviceInquiry.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: 66,
            }),
        }));
    });

    test('service inquiries reject missing required fields with a 400 response', async () => {
        const { app } = loadRouterWithMocks('../../routes/serviceRoutes', '/services');

        const response = await request(app)
            .post('/services/inquiries')
            .send({
                serviceType: '',
                contactName: 'Service Guest',
                contactEmail: 'service@example.com',
                contactPhone: '+255700000005',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('A service selection is required.');
    });
});
