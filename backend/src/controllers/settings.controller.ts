import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Investor } from '../models/Investor';
import { AuditLog } from '../models/AuditLog';
import { Startup } from '../models/Startup';
import { Cashflow } from '../models/Cashflow';
import { MonthlyUpdate } from '../models/MonthlyUpdate';
import { DocumentModel } from '../models/Document';
import { DilutionEvent } from '../models/DilutionEvent';
import { Alert } from '../models/Alert';
import { AlertConfiguration } from '../models/AlertConfiguration';
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
            AuditLog.find({ investorId: req.investor!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments({ investorId: req.investor!.id }),
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
            Investor.findById(investorId).select('-passwordHash -passwordResetToken -passwordResetExpires -twoFactorSecret'),
            Startup.find({ investorId }),
            Cashflow.find({ investorId }),
            MonthlyUpdate.find({ submittedBy: investorId }),
            DocumentModel.find({ investorId }),
            DilutionEvent.find({ investorId }),
            Alert.find({ investorId }),
            AlertConfiguration.findOne({ investorId }),
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
