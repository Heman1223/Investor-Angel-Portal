import { loginInvestor } from './src/services/auth.service';
import { prisma, connectDB } from './src/db';

async function test() {
    try {
        await connectDB();
        console.log('Database connected.');

        const email = 'investor@portfolioos.com';
        const password = 'Demo@2024';

        console.log(`Attempting login for: ${email}`);

        // Find user first
        const user = await prisma.investor.findUnique({ where: { email } });
        if (!user) {
            console.error('User not found in database!');
            await prisma.$disconnect();
            return;
        }
        console.log('User found in database.');

        const result = await loginInvestor(email, password);
        console.log('Login successful!', result.investor);
    } catch (error: any) {
        console.error('Login failed:', error.message);
        if (error.statusCode) console.error('Status code:', error.statusCode);
        if (error.code) console.error('Error code:', error.code);
    } finally {
        await prisma.$disconnect();
    }
}

test();
