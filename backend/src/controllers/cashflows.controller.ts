import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import * as cashflowService from '../services/cashflow.service';
import { addCashflowSchema, updateCashflowSchema, deleteCashflowSchema } from '../validators/startup.validators';
import { ZodError } from 'zod';

function formatZodError(error: ZodError) {
    const fields: Record<string, string> = {};
    error.errors.forEach((err) => {
        fields[err.path.join('.')] = err.message;
    });
    return fields;
}

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

export async function addCashflow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = addCashflowSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const cashflow = await cashflowService.addCashflow(req.investor!.id, req.params.id, parsed.data);
        res.status(201).json({ success: true, data: cashflow });
    } catch (error) { next(error); }
}

export async function updateCashflow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = updateCashflowSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const cashflow = await cashflowService.updateCashflow(req.investor!.id, req.params.cfId, parsed.data);
        res.json({ success: true, data: cashflow });
    } catch (error) { next(error); }
}

export async function deleteCashflow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = deleteCashflowSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const result = await cashflowService.deleteCashflow(req.investor!.id, req.params.cfId, parsed.data.reason);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}
