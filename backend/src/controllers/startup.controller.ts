import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as startupService from '../services/startup.service';
import { createStartupSchema, updateStartupSchema, exitStartupSchema, followOnSchema, updateValuationSchema } from '../validators/startup.validators';
import { ZodError } from 'zod';

function formatZodError(error: ZodError) {
    const fields: Record<string, string> = {};
    error.errors.forEach((err) => {
        fields[err.path.join('.')] = err.message;
    });
    return fields;
}

export async function createStartup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = createStartupSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const startup = await startupService.createStartup(req.investor!.id, parsed.data);
        res.status(201).json({ success: true, data: startup });
    } catch (error) { next(error); }
}

export async function getAllStartups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const status = req.query.status as string | undefined;
        const startups = await startupService.getAllStartups(req.investor!.id, status);
        res.json({ success: true, data: startups });
    } catch (error) { next(error); }
}

export async function getStartupById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startup = await startupService.getStartupById(req.investor!.id, req.params.id);
        res.json({ success: true, data: startup });
    } catch (error) { next(error); }
}

export async function updateStartup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = updateStartupSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const startup = await startupService.updateStartup(req.investor!.id, req.params.id, parsed.data, req);
        res.json({ success: true, data: startup });
    } catch (error) { next(error); }
}

export async function deleteStartup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startup = await startupService.softDeleteStartup(req.investor!.id, req.params.id);
        res.json({ success: true, data: startup });
    } catch (error) { next(error); }
}

export async function recordExit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = exitStartupSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const result = await startupService.recordExit(req.investor!.id, req.params.id, parsed.data);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function addFollowOn(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = followOnSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const result = await startupService.addFollowOn(req.investor!.id, req.params.id, parsed.data);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function updateValuation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = updateValuationSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) } });
            return;
        }
        const startup = await startupService.updateValuation(req.investor!.id, req.params.id, parsed.data.currentValuation);
        res.json({ success: true, data: startup });
    } catch (error) { next(error); }
}
