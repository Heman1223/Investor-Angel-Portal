import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/ACER/private-angel-portal/backend/.env' });
import mongoose from 'mongoose';
import * as authService from './src/services/auth.service';

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to DB');

        try {
            const result = await authService.loginInvestor('investor@portfolioos.com', 'Demo@2024');
            console.log('Login successful:', result.investor.email);
        } catch (loginErr: any) {
            console.error('Login failed with error:', loginErr.message);
            if (loginErr.stack) console.error(loginErr.stack);
        }

        await mongoose.disconnect();
    } catch (err: any) {
        console.error('Test failed:', err.message);
    }
}

test();
