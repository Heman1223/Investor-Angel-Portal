import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    const investorId = 'cmmasi73h0000q7x6lms6l6l6'; // Use a real ID if possible, or just any search that hits the issue

    console.log('--- Testing MonthlyUpdate.findMany ---');
    try {
        const updates = await prisma.monthlyUpdate.findMany({
            where: { startup: { investorId: { not: '' } } }, // broad search
            take: 5
        });
        console.log('MonthlyUpdate OK, count:', updates.length);
    } catch (e) {
        console.error('MonthlyUpdate FAILED:', e.message);
    }

    console.log('\n--- Testing Cashflow.findMany ---');
    try {
        const cashflows = await prisma.cashflow.findMany({
            where: { investorId: { not: '' } },
            take: 5
        });
        console.log('Cashflow OK, count:', cashflows.length);
    } catch (e) {
        console.error('Cashflow FAILED:', e.message);
    }

    console.log('\n--- Testing Document.findMany ---');
    try {
        const docs = await prisma.document.findMany({
            // where: { investorId: { not: '' } },
            take: 5
        });
        console.log('Document OK, count:', docs.length);
    } catch (e) {
        console.error('Document FAILED:', e.message);
    }
    
    console.log('\n--- Testing Document.findMany with include ---');
    try {
        const docs = await prisma.document.findMany({
            take: 5,
            include: { startup: { select: { name: true } } }
        });
        console.log('Document with include OK, count:', docs.length);
    } catch (e) {
        console.error('Document with include FAILED:', e.message);
    }

    await prisma.$disconnect();
}

diagnose();
