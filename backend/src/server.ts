import app from './app';
import { connectDB } from './db';
import { logger } from './utils/logger';
import { startCronJobs } from './jobs/alertCron';

const PORT = process.env.PORT || 10000; // 🔥 use 10000 for Render safety

async function start() {
    try {
        // Start server FIRST
        app.listen(PORT, () => {
            logger.info(`PortfolioOS server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Then connect DB
        await connectDB();
        logger.info("Database connected successfully");

        // Start cron jobs
        startCronJobs();

    } catch (err) {
        logger.error('Failed during startup:', err);
        // ❌ DO NOT exit immediately in production
    }
}

start();