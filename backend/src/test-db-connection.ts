import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('Connected successfully.');
        
        console.log('Checking for Investor table...');
        const count = await prisma.investor.count();
        console.log(`Investor table exists. Current count: ${count}`);
    } catch (error: any) {
        console.error('Error during test:');
        console.error(error.message);
        if (error.code) console.error('Error code:', error.code);
    } finally {
        await prisma.$disconnect();
    }
}

test();
