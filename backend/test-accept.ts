import { prisma } from './src/db';
import { acceptInviteForUser } from './src/services/companyInvite.service';

async function run() {
    try {
        console.log("Checking invites...");
        const invites = await prisma.companyInvite.findMany({ where: { status: 'PENDING' } });
        if (invites.length === 0) {
            console.log("No pending invites found.");
            return;
        }
        const invite = invites[0];
        console.log("Found invite:", invite);

        let user = await prisma.investor.findUnique({ where: { email: invite.email } });
        if (!user) {
            console.log("Creating user for invite email:", invite.email);
            user = await prisma.investor.create({
                data: {
                    name: 'Test Founder',
                    email: invite.email,
                    passwordHash: 'dummy',
                    role: 'COMPANY_USER'
                }
            });
        }

        console.log("Accepting invite...");
        const res = await acceptInviteForUser(user.id, user.email, invite.id);
        console.log("Success:", res);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
