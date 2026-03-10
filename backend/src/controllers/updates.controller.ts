import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as updatesService from '../services/updates.service';
import { monthlyUpdateSchema } from '../validators/startup.validators';

export async function getUpdates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const updates = await updatesService.getUpdates(req.investor!.id, req.params.id);
        res.json({ success: true, data: updates });
    } catch (error) { next(error); }
}

export async function getAllUpdates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const updates = await updatesService.getAllUpdates(req.investor!.id);
        res.json({ success: true, data: updates });
    } catch (error) { next(error); }
}

export async function createUpdate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = monthlyUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: {} }
            });
            return;
        }
        const update = await updatesService.createUpdate(req.investor!.id, req.params.id, parsed.data);
        res.status(201).json({ success: true, data: update });
    } catch (error) { next(error); }
}

export async function markSeen(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await updatesService.markUpdateSeen(req.investor!.id, req.params.updateId);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await updatesService.getUnreadUpdateCount(req.investor!.id);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

