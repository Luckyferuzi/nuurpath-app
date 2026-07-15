const request = require('supertest');
const { loadRouterWithMocks } = require('./helpers/routerHarness');

describe('newsletter routes', () => {
    test('subscribe stores name and normalized email for new subscribers', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
        mockPrisma.newsletterSubscriber.create.mockResolvedValue({
            id: 1,
            name: 'Asha Ali',
            email: 'asha@example.com',
            isActive: true,
        });
        mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.emailSuppression.deleteMany.mockResolvedValue({ count: 0 });

        const response = await request(app)
            .post('/newsletter/subscribe')
            .send({
                name: '  Asha   Ali ',
                email: ' ASHA@example.com ',
            });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Subscribed successfully!');
        expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith({
            data: {
                email: 'asha@example.com',
                name: 'Asha Ali',
            },
        });
        expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
            where: { email: 'asha@example.com' },
            data: { emailSubscriptions: true },
        });
    });

    test('subscribe requires a name when no stored subscriber name exists yet', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post('/newsletter/subscribe')
            .send({
                email: 'missing-name@example.com',
            });

        expect(response.status).toBe(400);
        expect(response.body.msg).toBe('Your name is required to subscribe.');
    });

    test('unsubscribe applies shared suppression and disables matching user email subscriptions', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
            id: 7,
            email: 'member@example.com',
            isActive: true,
        });
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 4,
            emailSubscriptions: true,
        });
        mockPrisma.emailSuppression.findUnique.mockResolvedValue(null);
        mockPrisma.newsletterSubscriber.update.mockResolvedValue({
            id: 7,
            email: 'member@example.com',
            isActive: false,
        });
        mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.emailSuppression.upsert.mockResolvedValue({
            id: 1,
            email: 'member@example.com',
        });

        const response = await request(app)
            .post('/newsletter/unsubscribe')
            .send({
                email: 'member@example.com',
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('You have been unsubscribed successfully.');
        expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
            where: { email: 'member@example.com' },
            data: { emailSubscriptions: false },
        });
        expect(mockPrisma.emailSuppression.upsert).toHaveBeenCalledWith({
            where: { email: 'member@example.com' },
            update: {
                reason: 'campaign_opt_out',
                source: 'newsletter_unsubscribe',
            },
            create: {
                email: 'member@example.com',
                reason: 'campaign_opt_out',
                source: 'newsletter_unsubscribe',
            },
        });
    });

    test('admin subscriber listing returns audience readiness counts', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.newsletterSubscriber.findMany
            .mockResolvedValueOnce([{
                id: 1,
                name: 'Asha Ali',
                email: 'asha@example.com',
                isActive: true,
                createdAt: new Date('2026-07-01T00:00:00.000Z'),
                unsubscribedAt: null,
            }])
            .mockResolvedValueOnce([
                { email: 'asha@example.com' },
                { email: 'shared@example.com' },
            ]);
        mockPrisma.newsletterSubscriber.count
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(1);
        mockPrisma.user.findMany.mockResolvedValue([
            { email: 'user@example.com' },
            { email: 'shared@example.com' },
        ]);
        mockPrisma.emailSuppression.findMany.mockResolvedValue([
            { email: 'blocked@example.com' },
        ]);

        const response = await request(app)
            .get('/newsletter')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-email', 'admin@example.com');

        expect(response.status).toBe(200);
        expect(response.body.audienceReadiness).toEqual({
            subscribersReachable: 2,
            usersReachable: 2,
            combinedReachable: 3,
            suppressed: 1,
        });
    });
});
