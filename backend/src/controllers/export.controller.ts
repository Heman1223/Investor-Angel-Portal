import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { exportPortfolioCSV, exportCashflowsCSV } from '../services/export.service';

export async function downloadPortfolioCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const csv = await exportPortfolioCSV(req.investor!.id);
        const filename = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) { next(error); }
}

export async function downloadCashflowsCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startupId = req.query.startupId as string | undefined;
        const csv = await exportCashflowsCSV(req.investor!.id, startupId);
        const filename = `cashflows-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) { next(error); }
}
