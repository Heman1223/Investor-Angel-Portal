import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as inviteService from '../services/companyInvite.service';
import { logAudit } from '../utils/auditLogger';

export async function createInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, companyRole } = req.body;
        if (!email || typeof email !== 'string') {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
            return;
        }
        const result = await inviteService.createInvite(req.investor!.id, req.params.id, email, companyRole);

        await logAudit(req.investor!.id, 'CREATE_INVITE', 'CompanyInvite', result.invite.id, null, result.invite, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function resendInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await inviteService.resendInvite(req.investor!.id, req.params.id, req.params.inviteId);

        await logAudit(req.investor!.id, 'RESEND_INVITE', 'CompanyInvite', req.params.inviteId, null, null, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function revokeInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await inviteService.revokeInvite(req.investor!.id, req.params.id, req.params.inviteId);

        await logAudit(req.investor!.id, 'REVOKE_INVITE', 'CompanyInvite', req.params.inviteId, null, null, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const members = await inviteService.getMembers(req.params.id);
        res.json({ success: true, data: members });
    } catch (error) { next(error); }
}

export async function getInvites(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const invites = await inviteService.getInvites(req.investor!.id, req.params.id);
        res.json({ success: true, data: invites });
    } catch (error) { next(error); }
}

export async function acceptInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token } = req.params;
        const result = await inviteService.acceptInvite(token, req.investor!.id);

        await logAudit(req.investor!.id, 'ACCEPT_INVITE', 'CompanyInvite', token, null, null, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function getPendingInvites(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const invites = await inviteService.getPendingInvitesForEmail(req.investor!.email);
        res.json({ success: true, data: invites });
    } catch (error) { next(error); }
}

export async function acceptInviteDirect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { inviteId } = req.params;
        const result = await inviteService.acceptInviteForUser(req.investor!.id, req.investor!.email, inviteId);
        await logAudit(req.investor!.id, 'ACCEPT_INVITE_DIRECT', 'CompanyInvite', inviteId, null, null, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function declineInviteDirect(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { inviteId } = req.params;
        const result = await inviteService.declineInvite(req.investor!.email, inviteId);
        await logAudit(req.investor!.id, 'DECLINE_INVITE_DIRECT', 'CompanyInvite', inviteId, null, null, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}
