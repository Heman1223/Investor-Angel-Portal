import app from './app';
import { connectDB } from './db';
import { logger } from './utils/logger';
import { startCronJobs } from './jobs/alertCron';
import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = process.env.PORT || 10000; // 🔥 use 10000 for Render safety

async function start() {
    try {
        const server = createServer(app);
        initSocket(server);

        // Start server FIRST
        server.listen(PORT, () => {
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