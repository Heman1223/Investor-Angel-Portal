import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import * as authService from '../services/auth.service';
import { changePasswordSchema } from '../validators/auth.validators';

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const investor = await authService.getInvestorProfile(req.investor!.id);
        res.json({ success: true, data: investor });
    } catch (error) { next(error); }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const investor = await authService.updateProfile(req.investor!.id, { name: req.body.name });
        res.json({ success: true, data: investor });
    } catch (error) { next(error); }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
            return;
        }
        const result = await authService.changePassword(req.investor!.id, parsed.data.currentPassword, parsed.data.newPassword);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getAuditLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { investorId: req.investor!.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.auditLog.count({ where: { investorId: req.investor!.id } }),
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    } catch (error) { next(error); }
}

export async function exportData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const investorId = req.investor!.id;
        const [investor, startups, cashflows, updates, documents, dilutionEvents, alerts, alertConfig] = await Promise.all([
            prisma.investor.findUnique({
                where: { id: investorId },
                select: {
                    id: true, name: true, email: true, role: true,
                    subscriptionTier: true, lastLoginAt: true, createdAt: true, updatedAt: true
                }
            }),
            prisma.startup.findMany({ where: { investorId } }),
            prisma.cashflow.findMany({ where: { investorId } }),
            prisma.monthlyUpdate.findMany({ where: { submittedBy: investorId } }),
            prisma.document.findMany({ where: { investorId } }),
            prisma.dilutionEvent.findMany({ where: { investorId } }),
            prisma.alert.findMany({ where: { investorId } }),
            prisma.alertConfiguration.findUnique({ where: { investorId } }),
        ]);

        res.json({
            success: true,
            data: {
                exportedAt: new Date().toISOString(),
                investor,
                startups,
                cashflows,
                monthlyUpdates: updates,
                documents,
                dilutionEvents,
                alerts,
                alertConfiguration: alertConfig,
            },
        });
    } catch (error) { next(error); }
}
