import request from 'supertest';
import app from '../app';
import { prisma } from '../db';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

jest.setTimeout(30000);

let investorToken: string;
let companyToken: string;
let testStartupId: string;
let otherStartupId: string;
let testCompanyUserId: string;

async function cleanDatabase() {
    const testEmails = ['test.investor@example.com', 'test.company@example.com'];
    const testStartupNames = ['Test Startup 1', 'Test Startup 2'];

    // 1. Find all potential users and startups
    const users = await prisma.investor.findMany({
        where: { email: { in: testEmails } },
        select: { id: true }
    });
    const userIds = users.map(u => u.id);

    const startups = await prisma.startup.findMany({
        where: { OR: [{ investorId: { in: userIds } }, { name: { in: testStartupNames } }] },
        select: { id: true }
    });
    const startupIds = startups.map(s => s.id);

    // 2. Clear Startup-related leaves
    if (startupIds.length > 0) {
        await prisma.startupMessageRead.deleteMany({ where: { message: { conversation: { startupId: { in: startupIds } } } } });
        await prisma.startupMessageAttachment.deleteMany({ where: { message: { conversation: { startupId: { in: startupIds } } } } });
        await prisma.startupMessage.deleteMany({ where: { conversation: { startupId: { in: startupIds } } } });
        await prisma.startupConversation.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.startupUpdateRead.deleteMany({ where: { update: { startupId: { in: startupIds } } } });
        await prisma.startupUpdateRevision.deleteMany({ where: { originalUpdate: { startupId: { in: startupIds } } } });
        await prisma.monthlyUpdate.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.dilutionEvent.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.cashflow.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.investment.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.companyMembership.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.companyInvite.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.alert.deleteMany({ where: { startupId: { in: startupIds } } });
        await prisma.document.deleteMany({ where: { startupId: { in: startupIds } } });
    }

    // 3. Clear User-related leaves (that remain after startup cleanup)
    if (userIds.length > 0) {
        await prisma.startupMessageRead.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.startupUpdateRead.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.startupUpdateRevision.deleteMany({ where: { submittedBy: { in: userIds } } });
        await prisma.startupMessage.deleteMany({ where: { senderUserId: { in: userIds } } });
        await prisma.companyMembership.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.investment.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.companyInvite.deleteMany({ where: { OR: [{ invitedBy: { in: userIds } }, { email: { in: testEmails } }] } });
        await prisma.alert.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.alertConfiguration.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.auditLog.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.cashflow.deleteMany({ where: { OR: [{ investorId: { in: userIds } }, { createdBy: { in: userIds } }] } });
        await prisma.dilutionEvent.deleteMany({ where: { investorId: { in: userIds } } });
        await prisma.document.deleteMany({ where: { OR: [{ investorId: { in: userIds } }, { uploadedBy: { in: userIds } }] } });
        await prisma.monthlyUpdate.deleteMany({ where: { submittedBy: { in: userIds } } });
    }

    // 4. Delete Startups
    if (startupIds.length > 0) {
        await prisma.startup.deleteMany({ where: { id: { in: startupIds } } });
    }

    // 5. Delete Users
    if (userIds.length > 0) {
        await prisma.investor.deleteMany({ where: { id: { in: userIds } } });
    }

    // 6. Final safety by email/name
    await prisma.investor.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.startup.deleteMany({ where: { name: { in: testStartupNames } } });
}

beforeAll(async () => {
    await cleanDatabase();

    // 1. Create a test investor
    const investorRes = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Test Investor',
            email: 'test.investor@example.com',
            password: 'Password123'
        });
    console.log('Investor Register Status:', investorRes.status);
    if (investorRes.status !== 201) console.log('Investor Register Error:', investorRes.body);

    investorToken = investorRes.body.data.accessToken;
    const investorId = investorRes.body.data.investor._id;

    // 2. Create two test startups
    const startup1Res = await request(app)
        .post('/api/startups')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({
            name: 'Test Startup 1',
            sector: 'Tech',
            stage: 'Seed',
            investmentDate: '2023-01-01',
            entryValuation: 1000000,
            investedAmount: 100000,
            equityPercent: 10
        });
    testStartupId = startup1Res.body.data._id;

    const startup2Res = await request(app)
        .post('/api/startups')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({
            name: 'Test Startup 2',
            sector: 'Tech',
            stage: 'Seed',
            investmentDate: '2023-01-01',
            entryValuation: 1000000,
            investedAmount: 100000,
            equityPercent: 10
        });
    otherStartupId = startup2Res.body.data._id;

    // 3. Create an invite for Startup 1
    const inviteRes = await request(app)
        .post(`/api/startups/${testStartupId}/company-invites`)
        .set('Authorization', `Bearer ${investorToken}`)
        .send({ email: 'test.company@example.com' });

    console.log('Invite Create Status:', inviteRes.status);
    if (inviteRes.status !== 201) console.log('Invite Create Error:', inviteRes.body);

    const inviteToken = inviteRes.body.data.token;

    // 4. Register the company user using the invite
    const companyRes = await request(app)
        .post('/api/auth/register/company')
        .send({
            name: 'Test Company User',
            email: 'test.company@example.com',
            password: 'Password123',
            inviteToken
        });
    companyToken = companyRes.body.data.accessToken;
    testCompanyUserId = companyRes.body.data.investor._id;
}, 120000);

afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
}, 120000);

describe('Company Portal API Role Guards', () => {

    it('should block company user from accessing investor routes', async () => {
        const res = await request(app)
            .get('/api/startups')
            .set('Authorization', `Bearer ${companyToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/This action requires one of the following roles: INVESTOR/);
    });

    it('should block investor from accessing company routes', async () => {
        const res = await request(app)
            .get('/api/company/me/startups')
            .set('Authorization', `Bearer ${investorToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/This action requires one of the following roles: COMPANY_USER/);
    });

    it('should block company user from accessing a startup they are not a member of', async () => {
        // Try to get updates for otherStartupId
        const res = await request(app)
            .get(`/api/company/startups/${otherStartupId}/updates`)
            .set('Authorization', `Bearer ${companyToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/You do not have access to this startup/);
    });

    it('should allow company user to access a startup they are a member of', async () => {
        const res = await request(app)
            .get(`/api/company/startups/${testStartupId}/updates`)
            .set('Authorization', `Bearer ${companyToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

describe('Drafts & Update Submission', () => {
    let draftUpdateId: string;

    it('should allow company user to create a draft update', async () => {
        const res = await request(app)
            .post(`/api/company/startups/${testStartupId}/updates`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({
                month: '2024-05',
                revenue: 50000,
                burnRate: 10000,
                cashBalance: 100000
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('DRAFT');
        expect(res.body.data.source).toBe('COMPANY_SUBMITTED');
        draftUpdateId = res.body.data._id;
    });

    it('should not allow creating a duplicate draft for the same month', async () => {
        const res = await request(app)
            .post(`/api/company/startups/${testStartupId}/updates`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({
                month: '2024-05',
                revenue: 60000,
                burnRate: 10000,
                cashBalance: 100000
            });

        expect(res.status).toBe(409);
    });

    it('should allow editing a draft update', async () => {
        const res = await request(app)
            .put(`/api/company/updates/${draftUpdateId}`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({
                revenue: 55000, // changed
                notes: 'Updated draft notes'
            });

        expect(res.status).toBe(200);
        expect(res.body.data.revenue).toBe(5500000); // 55000 * 100
        expect(res.body.data.notes).toBe('Updated draft notes');
    });

    it('should allow submitting a draft update', async () => {
        const res = await request(app)
            .post(`/api/company/updates/${draftUpdateId}/submit`)
            .set('Authorization', `Bearer ${companyToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('should block editing after submission', async () => {
        const res = await request(app)
            .put(`/api/company/updates/${draftUpdateId}`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({ notes: 'Try editing again' });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/Only draft updates can be edited/);
    });
});

describe('Messaging Scoping', () => {
    it('should allow investor to send message in test startup', async () => {
        const res = await request(app)
            .post(`/api/messaging/startups/${testStartupId}/messages`)
            .set('Authorization', `Bearer ${investorToken}`)
            .send({ body: 'Hello Founder!' });

        expect(res.status).toBe(201);
        expect(res.body.data.body).toBe('Hello Founder!');
    });

    it('should allow company user to read message in test startup', async () => {
        const res = await request(app)
            .get(`/api/messaging/startups/${testStartupId}/messages`)
            .set('Authorization', `Bearer ${companyToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].body).toBe('Hello Founder!');
    });

    it('should allow company user to reply', async () => {
        const res = await request(app)
            .post(`/api/messaging/startups/${testStartupId}/messages`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({ body: 'Hi Investor!' });

        expect(res.status).toBe(201);
        expect(res.body.data.body).toBe('Hi Investor!');
    });

    it('should block company user from messaging other startup', async () => {
        const res = await request(app)
            .post(`/api/messaging/startups/${otherStartupId}/messages`)
            .set('Authorization', `Bearer ${companyToken}`)
            .send({ body: 'Snooping...' });

        expect(res.status).toBe(403);
    });
});
