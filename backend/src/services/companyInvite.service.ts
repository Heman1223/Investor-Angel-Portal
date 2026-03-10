import crypto from 'crypto';
import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { sendInviteEmail } from './notification.service';

const INVITE_EXPIRY_DAYS = 7;

/**
 * Create a company invite for a startup.
 * Only the startup's investor can send invites.
 */
export async function createInvite(investorId: string, startupId: string, email: string, companyRole: string = 'member') {
    console.log(`[DEBUG] createInvite: investorId=${investorId}, startupId=${startupId}`);

    // Verify startup exists first
    const startupEntity = await prisma.startup.findUnique({ where: { id: startupId } });
    if (!startupEntity) {
        console.log(`[DEBUG] Startup matching ID ${startupId} not found in database.`);
        throw createAppError('Referenced startup not found', 404, 'NOT_FOUND');
    }

    // Verify investor has access
    const hasInvestment = await prisma.investment.findFirst({
        where: { investorId, startupId }
    });
    const isOwner = startupEntity.investorId === investorId;

    if (!hasInvestment && !isOwner) {
        console.log(`[DEBUG] Access denied for investorId=${investorId} on startupId=${startupId}. (Owner=${startupEntity.investorId})`);
        throw createAppError('You do not have permission to invite users to this startup', 403, 'FORBIDDEN');
    }

    // Check if email already belongs to an investor (role confusion prevention)
    const existingUser = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser && existingUser.role === 'INVESTOR') {
        throw createAppError(
            'This email belongs to an investor account. Company invites cannot be sent to investor emails.',
            400, 'VALIDATION_ERROR'
        );
    }

    // Check for existing pending invite to same email for same startup
    const existingInvite = await prisma.companyInvite.findFirst({
        where: {
            startupId,
            email: email.toLowerCase(),
            status: 'PENDING',
        }
    });
    if (existingInvite) {
        throw createAppError('A pending invite already exists for this email and startup. Use resend instead.', 409, 'CONFLICT');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invite = await prisma.companyInvite.create({
        data: {
            startupId,
            invitedBy: investorId,
            email: email.toLowerCase(),
            token,
            companyRole,
            expiresAt,
        }
    });

    // Send email notification (stub)
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;
    await sendInviteEmail(email, startupEntity?.name || 'a startup', inviteUrl).catch(console.error);

    return { invite, token };
}

/**
 * Accept an invite using the token. For existing company users, just creates membership.
 * For new users, handled via auth.service.registerCompanyUser instead.
 */
export async function acceptInvite(token: string, userId: string) {
    const invite = await prisma.companyInvite.findUnique({ where: { token } });
    if (!invite) {
        throw createAppError('Invalid invite token', 400, 'VALIDATION_ERROR');
    }
    if (invite.status !== 'PENDING') {
        throw createAppError(`Invite has already been ${invite.status.toLowerCase()}`, 400, 'VALIDATION_ERROR');
    }
    if (new Date() > invite.expiresAt) {
        await prisma.companyInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
        throw createAppError('Invite has expired. Please ask the investor to resend.', 400, 'VALIDATION_ERROR');
    }

    // Verify the user matches the invite email
    const user = await prisma.investor.findUnique({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw createAppError('Your email does not match this invite', 403, 'FORBIDDEN');
    }

    const result = await prisma.$transaction(async (tx) => {
        // Create membership
        await tx.companyMembership.create({
            data: {
                userId,
                startupId: invite.startupId,
                role: invite.companyRole,
            }
        });

        // Mark invite accepted
        const updated = await tx.companyInvite.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
        });

        return updated;
    });

    return result;
}

/**
 * Accept an invite directly by ID (for logged-in company users).
 */
export async function acceptInviteForUser(userId: string, email: string, inviteId: string) {
    const invite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
        throw createAppError('Invite not found', 404, 'NOT_FOUND');
    }
    if (invite.status !== 'PENDING') {
        throw createAppError(`Invite has already been ${invite.status.toLowerCase()}`, 400, 'VALIDATION_ERROR');
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw createAppError('Email does not match this invite', 403, 'FORBIDDEN');
    }

    const result = await prisma.$transaction(async (tx) => {
        // Create membership
        await tx.companyMembership.create({
            data: {
                userId,
                startupId: invite.startupId,
                role: invite.companyRole,
            }
        });

        // Mark invite accepted
        const updated = await tx.companyInvite.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
        });

        return updated;
    });

    return result;
}

/**
 * Decline an invite directly by ID (for logged-in company users).
 */
export async function declineInvite(email: string, inviteId: string) {
    const invite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
        throw createAppError('Invite not found', 404, 'NOT_FOUND');
    }
    if (invite.status !== 'PENDING') {
        throw createAppError(`Cannot decline invite with status: ${invite.status}`, 400, 'VALIDATION_ERROR');
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw createAppError('Email does not match this invite', 403, 'FORBIDDEN');
    }

    const updated = await prisma.companyInvite.update({
        where: { id: invite.id },
        data: { status: 'REVOKED', revokedAt: new Date() } // Using REVOKED to signify declined
    });

    return updated;
}

/**
 * Get all pending invites for a specific email address.
 */
export async function getPendingInvitesForEmail(email: string) {
    return prisma.companyInvite.findMany({
        where: {
            email: email.toLowerCase(),
            status: 'PENDING'
        },
        orderBy: { invitedAt: 'desc' },
        include: {
            startup: {
                select: {
                    name: true,
                    sector: true,
                    stage: true
                }
            },
            inviter: {
                select: {
                    name: true
                }
            }
        }
    });
}

/**
 * Resend an invite — invalidates old token, generates new one.
 */
export async function resendInvite(investorId: string, startupId: string, inviteId: string) {
    const invite = await prisma.companyInvite.findFirst({
        where: {
            id: inviteId,
            startupId,
            invitedBy: investorId,
        }
    });
    if (!invite) {
        throw createAppError('Invite not found', 404, 'NOT_FOUND');
    }
    if (invite.status === 'ACCEPTED') {
        throw createAppError('Cannot resend an already accepted invite', 400, 'VALIDATION_ERROR');
    }
    if (invite.status === 'REVOKED') {
        throw createAppError('Cannot resend a revoked invite. Create a new one.', 400, 'VALIDATION_ERROR');
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const updated = await prisma.companyInvite.update({
        where: { id: invite.id },
        data: {
            token: newToken,
            expiresAt: newExpiry,
            resentAt: new Date(),
            status: 'PENDING',
        }
    });

    return { invite: updated, token: newToken };
}

/**
 * Revoke a pending invite.
 */
export async function revokeInvite(investorId: string, startupId: string, inviteId: string) {
    const invite = await prisma.companyInvite.findFirst({
        where: {
            id: inviteId,
            startupId,
            invitedBy: investorId,
        }
    });
    if (!invite) {
        throw createAppError('Invite not found', 404, 'NOT_FOUND');
    }
    if (invite.status !== 'PENDING') {
        throw createAppError(`Cannot revoke invite with status: ${invite.status}`, 400, 'VALIDATION_ERROR');
    }

    return prisma.companyInvite.update({
        where: { id: invite.id },
        data: { status: 'REVOKED', revokedAt: new Date() }
    });
}

/**
 * Get all company members for a startup.
 */
export async function getMembers(startupId: string) {
    return prisma.companyMembership.findMany({
        where: { startupId },
        include: {
            user: {
                select: { id: true, name: true, email: true, role: true }
            }
        }
    });
}

/**
 * Get all invites for a startup.
 */
export async function getInvites(investorId: string, startupId: string) {
    // Verify access
    const hasAccess = await prisma.investment.findFirst({
        where: { investorId, startupId }
    }) || await prisma.startup.findFirst({ where: { id: startupId, investorId } });

    if (!hasAccess) {
        throw createAppError('Startup not found or you do not have access', 404, 'NOT_FOUND');
    }

    return prisma.companyInvite.findMany({
        where: { startupId },
        orderBy: { invitedAt: 'desc' }
    });
}
