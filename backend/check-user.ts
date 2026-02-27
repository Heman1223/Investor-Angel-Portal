import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/ACER/private-angel-portal/backend/.env' });
import mongoose from 'mongoose';
import { Investor } from './src/models/Investor';

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        const investor = await Investor.findOne({ email: 'investor@portfolioos.com' });
        if (investor) {
            console.log('User exists:', investor.email);
        } else {
            console.log('User NOT found');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('Check failed:', err);
    }
}

check();
