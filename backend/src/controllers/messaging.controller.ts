import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as messagingService from '../services/messaging.service';

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const cursor = req.query.cursor as string | undefined;
        const targetInvestorId = req.query.investorId as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const result = await messagingService.getMessages(
            req.investor!.id,
            req.investor!.role,
            req.params.id,
            targetInvestorId,
            cursor,
            limit
        );
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { body, messageType, investorId } = req.body;
        if (!body || typeof body !== 'string' || body.trim().length === 0) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message body is required' } });
            return;
        }
        const message = await messagingService.sendMessage(
            req.investor!.id,
            req.investor!.role,
            req.params.id,
            body.trim(),
            investorId,
            messageType
        );
        res.status(201).json({ success: true, data: message });
    } catch (error) { next(error); }
}

export async function markSeen(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const targetInvestorId = req.query.investorId as string | undefined;
        const result = await messagingService.markMessagesSeen(
            req.investor!.id,
            req.investor!.role,
            req.params.id,
            targetInvestorId
        );
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await messagingService.getConversationsForStartup(
            req.investor!.id,
            req.investor!.role,
            req.params.id
        );
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const startupId = req.params.id || undefined;
        const result = await messagingService.getUnreadMessageCount(
            req.investor!.id,
            req.investor!.role,
            startupId
        );
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}
