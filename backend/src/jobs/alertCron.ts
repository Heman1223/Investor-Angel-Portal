import cron from 'node-cron';
import { Investor } from '../models/Investor';
import { checkOverdueUpdates } from '../services/alerts.service';
import { logger } from '../utils/logger';

export function startCronJobs(): void {
    // Daily check at 08:00 for overdue updates
    cron.schedule('0 8 * * *', async () => {
        logger.info('Running daily alert check for overdue updates...');
        try {
            const investors = await Investor.find({}).select('_id');
            for (const investor of investors) {
                await checkOverdueUpdates(investor._id.toString());
            }
            logger.info('Daily alert check completed');
        } catch (error) {
            logger.error('Daily alert check failed:', error);
        }
    });

    logger.info('Cron jobs started: daily alert check at 08:00');
}
