import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolioos';

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB runtime error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
}

export default mongoose;
