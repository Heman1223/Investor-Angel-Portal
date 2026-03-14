import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { calculateRunway } from './financials.service';
import { runAlertEngine } from './alerts.service';
import { invalidateAnalyticsCache } from './analytics.service';
import { getIO } from '../socket';
import { sendNewUpdateEmail } from './notification.service';

/**
 * Get all startups the company user is a member of.
 */
export async function getCompanyStartups(userId: string) {
    const memberships = await prisma.companyMembership.findMany({
        where: { userId },
        include: {
            startup: {
                include: {
                    monthlyUpdates: {
                        orderBy: { month: 'desc' },
                        take: 1,
                    },
                    investor: {
                        select: { id: true, name: true, email: true }
                    },
                    investments: {
                        select: {
                            investor: { select: { id: true, name: true, email: true } }
                        }
                    }
                }
            }
        }
    });

    return memberships.map(m => {
        const primaryInvestor = m.startup.investor;
        const otherInvestors = m.startup.investments.map(inv => inv.investor);

        const allInvestorsMap = new Map();
        if (primaryInvestor) allInvestorsMap.set(primaryInvestor.email, primaryInvestor);
        for (const inv of otherInvestors) {
            allInvestorsMap.set(inv.email, inv);
        }

        return {
            ...m.startup,
            investors: Array.from(allInvestorsMap.values()),
            membershipRole: m.role,
            latestUpdate: m.startup.monthlyUpdates[0] || null,
        };
    });
}

/**
 * Get updates for a startup (company user must have membership).
 */
export async function getCompanyUpdates(userId: string, startupId: string) {
    // Verify membership
    const membership = await prisma.companyMembership.findUnique({
        where: { userId_startupId: { userId, startupId } }
    });
    if (!membership) {
        throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
    }

    return prisma.monthlyUpdate.findMany({
        where: { startupId },
        orderBy: { month: 'desc' },
        include: {
            reads: {
                include: {
                    investor: { select: { id: true, name: true, email: true } }
                }
            },
            revisions: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

/**
 * Get all updates across all startups for a company user
 */
export async function getAllCompanyUpdates(userId: string) {
    const memberships = await prisma.companyMembership.findMany({
        where: { userId },
        select: { startupId: true }
    });

    const startupIds = memberships.map(m => m.startupId);

    if (startupIds.length === 0) return [];

    const updates = await prisma.monthlyUpdate.findMany({
        where: { startupId: { in: startupIds } },
        orderBy: { month: 'desc' },
        include: {
            startup: { select: { id: true, name: true } },
            reads: {
                include: {
                    investor: { select: { id: true, name: true, email: true } }
                }
            },
            revisions: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    return updates;
}

/**
 * Create a draft update (company user).
 */
export async function createDraft(
    userId: string,
    startupId: string,
    data: {
        month: string;
        revenue: number;
        burnRate: number;
        cashBalance: number;
        valuationUpdate?: number;
        notes?: string;
        headcount?: number;
        keyWins?: string;
        keyChallenges?: string;
        helpNeeded?: string;
    }
) {
    // Verify membership
    const membership = await prisma.companyMembership.findUnique({
        where: { userId_startupId: { userId, startupId } }
    });
    if (!membership) {
        throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
    }

    // Convert to paise
    const revenuePaise = Math.round(data.revenue * 100);
    const burnRatePaise = Math.round(data.burnRate * 100);
    const cashBalancePaise = Math.round(data.cashBalance * 100);
    const runwayMonths = calculateRunway(cashBalancePaise, burnRatePaise);

    try {
        const update = await prisma.monthlyUpdate.create({
            data: {
                startupId,
                submittedBy: userId,
                month: data.month,
                revenue: revenuePaise,
                burnRate: burnRatePaise,
                cashBalance: cashBalancePaise,
                runwayMonths,
                valuationUpdate: data.valuationUpdate ? Math.round(data.valuationUpdate * 100) : null,
                notes: data.notes,
                headcount: data.headcount ?? null,
                keyWins: data.keyWins,
                keyChallenges: data.keyChallenges,
                helpNeeded: data.helpNeeded,
                source: 'COMPANY_SUBMITTED',
                status: 'DRAFT',
            }
        });
        return update;
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw createAppError('An update for this month already exists', 409, 'DUPLICATE');
        }
        throw error;
    }
}

/**
 * Edit a draft update (only DRAFT status allowed).
 */
export async function editDraft(
    userId: string,
    updateId: string,
    data: {
        revenue?: number;
        burnRate?: number;
        cashBalance?: number;
        valuationUpdate?: number;
        notes?: string;
        headcount?: number;
        keyWins?: string;
        keyChallenges?: string;
        helpNeeded?: string;
    }
) {
    const update = await prisma.monthlyUpdate.findUnique({ where: { id: updateId } });
    if (!update) {
        throw createAppError('Update not found', 404, 'NOT_FOUND');
    }
    if (update.status !== 'DRAFT') {
        throw createAppError('Only draft updates can be edited', 400, 'VALIDATION_ERROR');
    }

    // Verify membership
    const membership = await prisma.companyMembership.findUnique({
        where: { userId_startupId: { userId, startupId: update.startupId } }
    });
    if (!membership) {
        throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
    }

    const updateData: any = {};
    if (data.revenue !== undefined) updateData.revenue = Math.round(data.revenue * 100);
    if (data.burnRate !== undefined) updateData.burnRate = Math.round(data.burnRate * 100);
    if (data.cashBalance !== undefined) updateData.cashBalance = Math.round(data.cashBalance * 100);
    if (data.valuationUpdate !== undefined) updateData.valuationUpdate = Math.round(data.valuationUpdate * 100);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.headcount !== undefined) updateData.headcount = data.headcount;
    if (data.keyWins !== undefined) updateData.keyWins = data.keyWins;
    if (data.keyChallenges !== undefined) updateData.keyChallenges = data.keyChallenges;
    if (data.helpNeeded !== undefined) updateData.helpNeeded = data.helpNeeded;

    // Recalculate runway if financial data changed
    if (data.cashBalance !== undefined || data.burnRate !== undefined) {
        const cashPaise = data.cashBalance !== undefined ? Math.round(data.cashBalance * 100) : update.cashBalance;
        const burnPaise = data.burnRate !== undefined ? Math.round(data.burnRate * 100) : update.burnRate;
        updateData.runwayMonths = calculateRunway(cashPaise, burnPaise);
    }

    return prisma.monthlyUpdate.update({
        where: { id: updateId },
        data: updateData,
    });
}

/**
 * Submit a draft update — transitions DRAFT → SUBMITTED.
 * Creates StartupUpdateRead for all linked investors and triggers alerts.
 */
export async function submitUpdate(userId: string, updateId: string, targetInvestorIds?: string[]) {
    const update = await prisma.monthlyUpdate.findUnique({ where: { id: updateId } });
    if (!update) {
        throw createAppError('Update not found', 404, 'NOT_FOUND');
    }
    if (update.status !== 'DRAFT') {
        throw createAppError('Only draft updates can be submitted', 400, 'VALIDATION_ERROR');
    }

    // Verify membership
    const membership = await prisma.companyMembership.findUnique({
        where: { userId_startupId: { userId, startupId: update.startupId } }
    });
    if (!membership) {
        throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
    }

    // Find all investors linked to this startup via Investment
    const investments = await prisma.investment.findMany({
        where: { startupId: update.startupId },
        include: { investor: true }
    });

    // Also include the legacy startup owner
    const startup = await prisma.startup.findUnique({
        where: { id: update.startupId },
        include: { investor: true }
    });

    const linkedInvestors = new Map<string, any>();
    investments.forEach(i => linkedInvestors.set(i.investorId, i.investor));
    if (startup) linkedInvestors.set(startup.investorId, startup.investor);

    // If targetInvestorIds is provided, filter the linked investors
    let finalInvestorIds = Array.from(linkedInvestors.keys());
    if (targetInvestorIds && targetInvestorIds.length > 0) {
        finalInvestorIds = finalInvestorIds.filter(id => targetInvestorIds.includes(id));
    }

    const result = await prisma.$transaction(async (tx) => {
        // Update status to SUBMITTED
        const submitted = await tx.monthlyUpdate.update({
            where: { id: updateId },
            data: { status: 'SUBMITTED' }
        });

        // Create unread records for target investors
        const readRecords = finalInvestorIds.map(investorId => ({
            updateId: submitted.id,
            investorId,
        }));

        if (readRecords.length > 0) {
            await tx.startupUpdateRead.createMany({
                data: readRecords,
                skipDuplicates: true,
            });
        }

        // Update startup valuation if provided
        if (submitted.valuationUpdate) {
            await tx.startup.update({
                where: { id: submitted.startupId },
                data: { currentValuation: submitted.valuationUpdate }
            });
        }

        return submitted;
    });

    // Post-transaction side effects
    invalidateAnalyticsCache();

    // Run alert engine for each target investor
    for (const investorId of finalInvestorIds) {
        await runAlertEngine(investorId, update.startupId).catch(() => { });
    }

    try {
        getIO().to(`startup_${update.startupId}`).emit('new_update_submitted', { startupId: update.startupId, updateId: result.id });
    } catch (err) { }

    // Dispatch emails to target investors
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const updateUrl = `${frontendUrl}/portfolio/${update.startupId}`;
    for (const investorId of finalInvestorIds) {
        const user = linkedInvestors.get(investorId);
        if (user && user.notificationPreference === 'IMMEDIATE') {
            await sendNewUpdateEmail(user.email, startup?.name || 'A Startup in your portfolio', updateUrl).catch(() => { });
        }
    }

    return result;
}

/**
 * Submit a correction to a published/submitted update.
 * Creates a StartupUpdateRevision record.
 */
export async function submitCorrection(
    userId: string,
    updateId: string,
    data: {
        correctionNote: string;
        revenue?: number;
        burnRate?: number;
        cashBalance?: number;
        notes?: string;
    }
) {
    const update = await prisma.monthlyUpdate.findUnique({ where: { id: updateId } });
    if (!update) {
        throw createAppError('Update not found', 404, 'NOT_FOUND');
    }
    if (update.status === 'DRAFT') {
        throw createAppError('Cannot correct a draft update. Edit it directly instead.', 400, 'VALIDATION_ERROR');
    }

    // Verify membership
    const membership = await prisma.companyMembership.findUnique({
        where: { userId_startupId: { userId, startupId: update.startupId } }
    });
    if (!membership) {
        throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
    }

    // Build changed fields summary
    const changedFields: Record<string, { old: number | string | null; new: number | string | null }> = {};
    if (data.revenue !== undefined) {
        changedFields.revenue = { old: update.revenue, new: Math.round(data.revenue * 100) };
    }
    if (data.burnRate !== undefined) {
        changedFields.burnRate = { old: update.burnRate, new: Math.round(data.burnRate * 100) };
    }
    if (data.cashBalance !== undefined) {
        changedFields.cashBalance = { old: update.cashBalance, new: Math.round(data.cashBalance * 100) };
    }
    if (data.notes !== undefined) {
        changedFields.notes = { old: update.notes, new: data.notes };
    }

    const revision = await prisma.startupUpdateRevision.create({
        data: {
            originalUpdateId: updateId,
            correctionNote: data.correctionNote,
            changedFields,
            revenue: data.revenue ? Math.round(data.revenue * 100) : null,
            burnRate: data.burnRate ? Math.round(data.burnRate * 100) : null,
            cashBalance: data.cashBalance ? Math.round(data.cashBalance * 100) : null,
            runwayMonths: data.cashBalance && data.burnRate
                ? calculateRunway(Math.round(data.cashBalance * 100), Math.round(data.burnRate * 100))
                : null,
            notes: data.notes,
            submittedBy: userId,
        }
    });

    return revision;
}

/**
 * Get revisions for an update.
 */
export async function getRevisions(startupId: string, updateId: string) {
    const update = await prisma.monthlyUpdate.findFirst({
        where: { id: updateId, startupId }
    });
    if (!update) {
        throw createAppError('Update not found', 404, 'NOT_FOUND');
    }

    return prisma.startupUpdateRevision.findMany({
        where: { originalUpdateId: updateId },
        orderBy: { createdAt: 'desc' }
    });
}
