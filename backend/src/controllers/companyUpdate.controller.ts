import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as companyUpdateService from '../services/companyUpdate.service';

export async function getMyStartups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startups = await companyUpdateService.getCompanyStartups(req.investor!.id);
        res.json({ success: true, data: startups });
    } catch (error) { next(error); }
}

export async function getUpdates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const updates = await companyUpdateService.getCompanyUpdates(req.investor!.id, req.params.id);
        res.json({ success: true, data: updates });
    } catch (error) { next(error); }
}

export async function getAllCompanyUpdates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const updates = await companyUpdateService.getAllCompanyUpdates(req.investor!.id);
        res.json({ success: true, data: updates });
    } catch (error) { next(error); }
}

export async function createDraft(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const update = await companyUpdateService.createDraft(req.investor!.id, req.params.id, req.body);
        res.status(201).json({ success: true, data: update });
    } catch (error) { next(error); }
}

export async function editDraft(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const update = await companyUpdateService.editDraft(req.investor!.id, req.params.updateId, req.body);
        res.json({ success: true, data: update });
    } catch (error) { next(error); }
}

export async function submitUpdate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const update = await companyUpdateService.submitUpdate(req.investor!.id, req.params.updateId);
        res.json({ success: true, data: update });
    } catch (error) { next(error); }
}

export async function submitCorrection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const revision = await companyUpdateService.submitCorrection(req.investor!.id, req.params.updateId, req.body);
        res.status(201).json({ success: true, data: revision });
    } catch (error) { next(error); }
}

export async function getRevisions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const revisions = await companyUpdateService.getRevisions(req.params.id, req.params.updateId);
        res.json({ success: true, data: revisions });
    } catch (error) { next(error); }
}
