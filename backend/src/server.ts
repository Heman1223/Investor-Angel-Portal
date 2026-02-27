import app from './app';
import { connectDB } from './db';
import { logger } from './utils/logger';
import { startCronJobs } from './jobs/alertCron';

const PORT = process.env.PORT || 5000;

async function start() {
    await connectDB();

    // Start scheduled jobs
    startCronJobs();

    app.listen(PORT, () => {
        logger.info(`PortfolioOS server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

start().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
