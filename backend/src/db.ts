import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const prisma = new PrismaClient();

export async function connectDB(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info('PostgreSQL connected successfully via Prisma');
    } catch (error) {
        logger.error('PostgreSQL connection error:', error);
        // During deployment, we don't want to exit immediately 
        // as it might cause Render health check failures.
        // The server will still listen on the port.
    }
}

export { prisma };
