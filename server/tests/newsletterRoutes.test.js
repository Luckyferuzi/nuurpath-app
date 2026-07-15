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

    test('preview renders personalized campaign content safely', async () => {
        const { app } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        const response = await request(app)
            .post('/newsletter/campaigns/preview')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-email', 'admin@example.com')
            .send({
                internalName: 'Offer Draft',
                subject: 'A selected offer for {firstName}',
                audienceType: 'BOTH',
                messageType: 'OFFER',
                greetingStyle: 'DEAR',
                title: 'A selected offer from NuurPath',
                preheader: 'Preview line for {fullName}',
                body: 'Dear {fullName},\n\nThis offer was prepared for {email}.',
                highlightTitle: 'Offer highlight',
                highlightBody: 'Travel with calm planning and a clearer next step.',
                ctaLabel: 'View Offer',
                ctaUrl: 'https://example.com/offers/selected',
                signature: 'NuurPath International\nTravel Support Team',
                previewRecipient: {
                    name: 'Asha Ali',
                    email: 'asha@example.com',
                },
            });

        expect(response.status).toBe(200);
        expect(response.body.subject).toBe('A selected offer for Asha');
        expect(response.body.greeting).toBe('Dear Asha Ali,');
        expect(response.body.html).toContain('View Offer');
        expect(response.body.html).toContain('asha@example.com');
        expect(response.body.preferencesUrl).toContain('/newsletter/preferences?email=asha%40example.com');
        expect(response.body.html).toContain('manage your email preference here');
    });

    test('create campaign draft stores structured composer fields', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.emailCampaign.create.mockResolvedValue({
            id: 12,
            internalName: 'Campaign Draft',
            subject: 'A clear campaign update',
            audienceType: 'BOTH',
            messageType: 'CAMPAIGN',
            greetingStyle: 'HELLO',
            title: 'A focused message for your selected audience',
            preheader: 'A short preview line.',
            body: 'Hello {firstName},\n\nA clean campaign message.',
            highlightTitle: 'Why this matters',
            highlightBody: 'A short reason block.',
            ctaLabel: 'Learn More',
            ctaUrl: 'https://example.com/campaign',
            signature: 'NuurPath International\nTravel Support Team',
            status: 'Draft',
            createdAt: new Date('2026-07-15T00:00:00.000Z'),
            updatedAt: new Date('2026-07-15T00:00:00.000Z'),
            createdBy: {
                id: 91,
                name: 'Admin User',
                email: 'admin@example.com',
            },
            updatedBy: {
                id: 91,
                name: 'Admin User',
                email: 'admin@example.com',
            },
        });

        const response = await request(app)
            .post('/newsletter/campaigns')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-email', 'admin@example.com')
            .send({
                internalName: 'Campaign Draft',
                subject: 'A clear campaign update',
                audienceType: 'BOTH',
                messageType: 'CAMPAIGN',
                greetingStyle: 'HELLO',
                title: 'A focused message for your selected audience',
                preheader: 'A short preview line.',
                body: 'Hello {firstName},\n\nA clean campaign message.',
                highlightTitle: 'Why this matters',
                highlightBody: 'A short reason block.',
                ctaLabel: 'Learn More',
                ctaUrl: 'https://example.com/campaign',
                signature: 'NuurPath International\nTravel Support Team',
            });

        expect(response.status).toBe(201);
        expect(mockPrisma.emailCampaign.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                internalName: 'Campaign Draft',
                audienceType: 'BOTH',
                messageType: 'CAMPAIGN',
                greetingStyle: 'HELLO',
                createdByUserId: 91,
                updatedByUserId: 91,
                status: 'Draft',
            }),
        }));
    });

    test('preview recipients merge users and subscribers without duplicate emails', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
            { name: 'Asha Ali', email: 'shared@example.com' },
            { name: 'Subscriber Only', email: 'subscriber@example.com' },
        ]);
        mockPrisma.user.findMany.mockResolvedValue([
            { name: 'Asha Ali', email: 'shared@example.com' },
            { name: 'User Only', email: 'user@example.com' },
        ]);
        mockPrisma.emailSuppression.findMany.mockResolvedValue([
            { email: 'blocked@example.com' },
        ]);

        const response = await request(app)
            .get('/newsletter/preview-recipients')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-email', 'admin@example.com');

        expect(response.status).toBe(200);
        expect(response.body.recipients).toEqual(expect.arrayContaining([
            expect.objectContaining({
                email: 'shared@example.com',
                sourceLabel: 'Both audiences',
            }),
            expect.objectContaining({
                email: 'subscriber@example.com',
                sourceLabel: 'Subscriber',
            }),
            expect.objectContaining({
                email: 'user@example.com',
                sourceLabel: 'Registered user',
            }),
        ]));
    });

    test('campaign test-send delivers to the current admin email and records the result', async () => {
        const { app, mockPrisma, mockSendEmail } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.emailCampaign.findUnique.mockResolvedValue({
            id: 12,
            internalName: 'Offer Draft',
            subject: 'A selected offer for {firstName}',
            audienceType: 'BOTH',
            messageType: 'OFFER',
            greetingStyle: 'DEAR',
            title: 'A selected offer from NuurPath',
            preheader: 'A short preview line.',
            body: 'Peace be upon you {fullName}.\n\nThis is a test delivery.',
            highlightTitle: 'Offer highlight',
            highlightBody: 'A short note.',
            ctaLabel: 'View Offer',
            ctaUrl: 'https://example.com/offers/selected',
            signature: 'NuurPath International\nTravel Support Team',
            status: 'Draft',
        });
        mockPrisma.emailCampaignRecipient.create.mockResolvedValue({
            id: 80,
        });
        mockPrisma.emailCampaign.update.mockResolvedValue({
            id: 12,
            internalName: 'Offer Draft',
            subject: 'A selected offer for {firstName}',
            audienceType: 'BOTH',
            messageType: 'OFFER',
            greetingStyle: 'DEAR',
            title: 'A selected offer from NuurPath',
            preheader: 'A short preview line.',
            body: 'Peace be upon you {fullName}.\n\nThis is a test delivery.',
            highlightTitle: 'Offer highlight',
            highlightBody: 'A short note.',
            ctaLabel: 'View Offer',
            ctaUrl: 'https://example.com/offers/selected',
            signature: 'NuurPath International\nTravel Support Team',
            status: 'Draft',
            recipientCount: 0,
            sentCount: 0,
            failedCount: 0,
            lastSentAt: null,
            lastTestSentAt: new Date('2026-07-15T08:00:00.000Z'),
            lastError: null,
            createdAt: new Date('2026-07-15T00:00:00.000Z'),
            updatedAt: new Date('2026-07-15T08:00:00.000Z'),
            recipients: [{
                id: 80,
                email: 'admin@example.com',
                name: 'Admin User',
                source: 'admin_test',
                deliveryType: 'TEST',
                status: 'Sent',
                errorMessage: null,
                sentAt: new Date('2026-07-15T08:00:00.000Z'),
                createdAt: new Date('2026-07-15T08:00:00.000Z'),
            }],
            createdBy: null,
            updatedBy: {
                id: 91,
                name: 'Admin User',
                email: 'admin@example.com',
            },
        });

        const response = await request(app)
            .post('/newsletter/campaigns/12/test-send')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-name', 'Admin User')
            .set('x-test-user-email', 'admin@example.com');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Test email sent to admin@example.com.');
        expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'admin@example.com',
        }));
        expect(mockPrisma.emailCampaignRecipient.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                campaignId: 12,
                email: 'admin@example.com',
                source: 'admin_test',
                deliveryType: 'TEST',
                status: 'Sent',
            }),
        });
    });

    test('campaign send delivers to the resolved audience and stores delivery counts', async () => {
        const { app, mockPrisma, mockSendEmail } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.emailCampaign.findUnique.mockResolvedValue({
            id: 18,
            internalName: 'Campaign Draft',
            subject: 'A clear campaign update',
            audienceType: 'BOTH',
            messageType: 'CAMPAIGN',
            greetingStyle: 'HELLO',
            title: 'A focused message for your selected audience',
            preheader: 'A short preview line.',
            body: 'Hello {firstName},\n\nA clean campaign message.',
            highlightTitle: 'Why this matters',
            highlightBody: 'A short reason block.',
            ctaLabel: 'Learn More',
            ctaUrl: 'https://example.com/campaign',
            signature: 'NuurPath International\nTravel Support Team',
            status: 'Draft',
        });
        mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
            { name: 'Asha Ali', email: 'shared@example.com' },
            { name: 'Subscriber Only', email: 'subscriber@example.com' },
        ]);
        mockPrisma.user.findMany.mockResolvedValue([
            { name: 'Asha Ali', email: 'shared@example.com' },
            { name: 'User Only', email: 'user@example.com' },
        ]);
        mockPrisma.emailSuppression.findMany.mockResolvedValue([
            { email: 'blocked@example.com' },
        ]);
        mockPrisma.emailCampaign.update
            .mockResolvedValueOnce({
                id: 18,
                status: 'Sending',
            })
            .mockResolvedValueOnce({
                id: 18,
                internalName: 'Campaign Draft',
                subject: 'A clear campaign update',
                audienceType: 'BOTH',
                messageType: 'CAMPAIGN',
                greetingStyle: 'HELLO',
                title: 'A focused message for your selected audience',
                preheader: 'A short preview line.',
                body: 'Hello {firstName},\n\nA clean campaign message.',
                highlightTitle: 'Why this matters',
                highlightBody: 'A short reason block.',
                ctaLabel: 'Learn More',
                ctaUrl: 'https://example.com/campaign',
                signature: 'NuurPath International\nTravel Support Team',
                status: 'Sent',
                recipientCount: 3,
                sentCount: 3,
                failedCount: 0,
                lastSentAt: new Date('2026-07-15T09:00:00.000Z'),
                lastTestSentAt: null,
                lastError: null,
                createdAt: new Date('2026-07-15T00:00:00.000Z'),
                updatedAt: new Date('2026-07-15T09:00:00.000Z'),
                recipients: [{
                    id: 100,
                    email: 'user@example.com',
                    name: 'User Only',
                    source: 'user',
                    deliveryType: 'LIVE',
                    status: 'Sent',
                    errorMessage: null,
                    sentAt: new Date('2026-07-15T09:00:00.000Z'),
                    createdAt: new Date('2026-07-15T09:00:00.000Z'),
                }],
                createdBy: null,
                updatedBy: {
                    id: 91,
                    name: 'Admin User',
                    email: 'admin@example.com',
                },
            });
        mockPrisma.emailCampaignRecipient.create.mockResolvedValue({
            id: 100,
        });

        const response = await request(app)
            .post('/newsletter/campaigns/18/send')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-name', 'Admin User')
            .set('x-test-user-email', 'admin@example.com');

        expect(response.status).toBe(200);
        expect(response.body.campaign.status).toBe('Sent');
        expect(response.body.campaign.sentCount).toBe(3);
        expect(response.body.campaign.failedCount).toBe(0);
        expect(mockSendEmail).toHaveBeenCalledTimes(3);
        expect(mockPrisma.emailCampaign.update).toHaveBeenNthCalledWith(1, {
            where: { id: 18 },
            data: expect.objectContaining({
                status: 'Sending',
                recipientCount: 3,
            }),
        });
        expect(mockPrisma.emailCampaignRecipient.create).toHaveBeenCalledTimes(3);
    });

    test('sent campaigns cannot be updated as drafts', async () => {
        const { app, mockPrisma } = loadRouterWithMocks('../../routes/newsletterRoutes', '/newsletter');

        mockPrisma.emailCampaign.findUnique.mockResolvedValue({
            id: 12,
            status: 'Sent',
        });

        const response = await request(app)
            .put('/newsletter/campaigns/12')
            .set('x-test-user-id', '91')
            .set('x-test-user-role', 'admin')
            .set('x-test-user-email', 'admin@example.com')
            .send({
                internalName: 'Campaign Draft',
                subject: 'A clear campaign update',
                audienceType: 'BOTH',
                messageType: 'CAMPAIGN',
                greetingStyle: 'HELLO',
                title: 'A focused message for your selected audience',
                preheader: 'A short preview line.',
                body: 'Hello {firstName},\n\nA clean campaign message.',
                highlightTitle: 'Why this matters',
                highlightBody: 'A short reason block.',
                ctaLabel: 'Learn More',
                ctaUrl: 'https://example.com/campaign',
                signature: 'NuurPath International\nTravel Support Team',
            });

        expect(response.status).toBe(409);
        expect(response.body.msg).toBe('Only draft campaigns can be updated.');
    });
});
