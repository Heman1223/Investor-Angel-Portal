import { prisma } from './src/db';
import * as inviteService from './src/services/companyInvite.service';

async function test() {
    try {
        console.log('--- Testing Create Invite ---');

        // Let's find first investor and first startup
        const investor = await prisma.investor.findFirst({
            where: { role: 'INVESTOR' }
        });
        const startup = await prisma.startup.findFirst();

        if (!investor || !startup) {
            console.log('No seed data found.');
            return;
        }

        console.log(`Testing with Investor ID: ${investor.id} and Startup ID: ${startup.id}`);
        console.log(`Startup current investorId: ${startup.investorId}`);

        try {
            const result = await inviteService.createInvite(investor.id, startup.id, 'test-invite@test.com');
            console.log('Success!', result.token);
        } catch (err: any) {
            console.error('Error in createInvite:', err.message);
        }

        // Test with a random startup ID
        try {
            await inviteService.createInvite(investor.id, 'random-id', 'test-invite@test.com');
        } catch (err: any) {
            console.log('Expected error with random ID:', err.message);
        }

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
