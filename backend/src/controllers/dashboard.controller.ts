import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getPortfolioAnalytics } from '../services/analytics.service';

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const analytics = await getPortfolioAnalytics(req.investor!.id);
        res.json({ success: true, data: analytics });
    } catch (error) { next(error); }
}
