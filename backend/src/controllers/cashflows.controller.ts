import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

export async function getStartupCashflows(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startup = await prisma.startup.findFirst({
            where: { id: req.params.id, investorId: req.investor!.id }
        });
        if (!startup) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Startup not found' } });
            return;
        }
        const cashflows = await prisma.cashflow.findMany({
            where: { startupId: req.params.id },
            orderBy: { date: 'asc' }
        });
        res.json({ success: true, data: cashflows });
    } catch (error) { next(error); }
}

export async function getAllCashflows(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const cashflows = await prisma.cashflow.findMany({
            where: { investorId: req.investor!.id },
            include: { startup: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' }
        });

        // Map to replicate Mongoose .populate() behavior
        const mappedCashflows = cashflows.map(cf => {
            const { startup, ...rest } = cf;
            return {
                ...rest,
                startupId: startup ? { _id: startup.id, name: startup.name } : cf.startupId
            };
        });

        res.json({ success: true, data: mappedCashflows });
    } catch (error) { next(error); }
}
