import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("--- STARTUPS ---");
    const startups = await prisma.startup.findMany();
    console.log(JSON.stringify(startups, null, 2));

    console.log("--- USERS ---");
    const users = await prisma.investor.findMany({ select: { id: true, name: true, email: true, role: true } });
    console.log(JSON.stringify(users, null, 2));

    console.log("--- INVITES ---");
    const invites = await prisma.companyInvite.findMany();
    console.log(JSON.stringify(invites, null, 2));

    console.log("--- MEMBERSHIPS ---");
    const memberships = await prisma.companyMembership.findMany();
    console.log(JSON.stringify(memberships, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
