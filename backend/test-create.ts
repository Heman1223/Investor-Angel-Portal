import { createStartup } from './src/services/startup.service';
import { prisma, connectDB } from './src/db';
import { createStartupSchema } from './src/validators/startup.validators';

async function test() {
    try {
        await connectDB();
        const email = 'investor@portfolioos.com';
        const user = await prisma.investor.findUnique({ where: { email } });
        if (!user) {
            console.error('User not found!');
            return;
        }

        const data = {
            name: 'Test Startup ' + Date.now(),
            sector: 'FinTech',
            stage: 'Seed',
            investmentDate: '2026-03-05',
            entryValuation: 1000000,
            investedAmount: 50000,
            equityPercent: 5,
            founderName: '',
            description: ''
        };

        const parsed = createStartupSchema.safeParse(data);
        if (!parsed.success) {
            console.log("Validation failed", JSON.stringify(parsed.error.errors, null, 2));
            return;
        }

        console.log("Validation passed! Creating startup...");
        const result = await createStartup(user.id, data);
        console.log("Created successfully!", result.id);
    } catch (error: any) {
        console.error('Create failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
