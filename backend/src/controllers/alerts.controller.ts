import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as alertsService from '../services/alerts.service';
import { alertConfigSchema } from '../validators/startup.validators';

export async function getAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
        const alerts = await alertsService.getAlerts(req.investor!.id, isRead);
        res.json({ success: true, data: alerts });
    } catch (error) { next(error); }
}

export async function markAlertRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const alert = await alertsService.markAlertRead(req.investor!.id, req.params.id);
        res.json({ success: true, data: alert });
    } catch (error) { next(error); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await alertsService.markAllRead(req.investor!.id);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getAlertConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const config = await alertsService.getAlertConfig(req.investor!.id);
        res.json({ success: true, data: config });
    } catch (error) { next(error); }
}

export async function updateAlertConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = alertConfigSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
            return;
        }
        const config = await alertsService.updateAlertConfig(req.investor!.id, parsed.data);
        res.json({ success: true, data: config });
    } catch (error) { next(error); }
}
