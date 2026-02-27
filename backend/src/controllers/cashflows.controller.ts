import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Cashflow } from '../models/Cashflow';
import { Startup } from '../models/Startup';

export async function getStartupCashflows(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startup = await Startup.findOne({ _id: req.params.id, investorId: req.investor!.id });
        if (!startup) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Startup not found' } });
            return;
        }
        const cashflows = await Cashflow.find({ startupId: req.params.id }).sort({ date: 1 });
        res.json({ success: true, data: cashflows });
    } catch (error) { next(error); }
}

export async function getAllCashflows(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const cashflows = await Cashflow.find({ investorId: req.investor!.id })
            .populate('startupId', 'name')
            .sort({ date: -1 });
        res.json({ success: true, data: cashflows });
    } catch (error) { next(error); }
}
