import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { writeAuditLog } from '../middleware/auditLog';
import { calculateRunway } from './financials.service';
import { runAlertEngine } from './alerts.service';
import { invalidateAnalyticsCache } from './analytics.service';

export async function getUpdates(investorId: string, startupId: string) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const updates = await prisma.monthlyUpdate.findMany({
        where: { startupId },
        orderBy: { month: 'desc' },
        include: {
            reads: {
                where: { investorId },
                select: { seenAt: true }
            },
            revisions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            }
        }
    });

    return updates.map(u => {
        const { reads, revisions, ...rest } = u;
        return {
            ...rest,
            createdAt: u.createdAt.toISOString(),
            isRead: reads.length > 0,
            seenAt: reads[0]?.seenAt?.toISOString() || null,
            latestRevision: revisions[0] || null,
        };
    });
}

export async function getAllUpdates(investorId: string) {
    const updates = await prisma.monthlyUpdate.findMany({
        where: { startup: { investorId } },
        include: {
            startup: {
                select: { id: true, name: true, sector: true }
            },
            reads: {
                where: { investorId },
                select: { seenAt: true }
            }
        },
        orderBy: { month: 'desc' }
    });

    return updates.map(u => {
        const { startup, reads, ...rest } = u;
        return {
            ...rest,
            createdAt: u.createdAt.toISOString(),
            isRead: reads.length > 0,
            seenAt: reads[0]?.seenAt?.toISOString() || null,
            startupId: startup ? {
                id: startup.id,
                name: startup.name,
                sector: startup.sector
            } : u.startupId
        };
    });
}

export async function createUpdate(
    investorId: string,
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
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const revenuePaise = Math.round(data.revenue * 100);
    const burnRatePaise = Math.round(data.burnRate * 100);
    const cashBalancePaise = Math.round(data.cashBalance * 100);
    const runwayMonths = calculateRunway(cashBalancePaise, burnRatePaise);

    try {
        const update = await prisma.monthlyUpdate.create({
            data: {
                startupId,
                submittedBy: investorId,
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
                source: 'INVESTOR_ENTERED',
                status: 'SUBMITTED',
            }
        });

        if (data.valuationUpdate) {
            await prisma.startup.update({
                where: { id: startup.id },
                data: { currentValuation: Math.round(data.valuationUpdate * 100) }
            });
            invalidateAnalyticsCache();
        }

        await runAlertEngine(investorId, startupId);

        await writeAuditLog({
            investorId,
            action: 'CREATE_MONTHLY_UPDATE',
            entityType: 'monthly_update',
            entityId: update.id,
            newValue: { month: data.month, revenue: data.revenue, burnRate: data.burnRate, cashBalance: data.cashBalance },
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
 * Mark an update as seen by the investor.
 */
export async function markUpdateSeen(investorId: string, updateId: string) {
    const update = await prisma.monthlyUpdate.findUnique({ where: { id: updateId } });
    if (!update) {
        throw createAppError('Update not found', 404, 'NOT_FOUND');
    }

    // Verify investor has access to the startup
    const startup = await prisma.startup.findFirst({
        where: { id: update.startupId, investorId }
    });
    const investment = await prisma.investment.findUnique({
        where: { investorId_startupId: { investorId, startupId: update.startupId } }
    });
    if (!startup && !investment) {
        throw createAppError('You do not have access to this update', 403, 'FORBIDDEN');
    }

    await prisma.startupUpdateRead.upsert({
        where: { updateId_investorId: { updateId, investorId } },
        create: { updateId, investorId },
        update: { seenAt: new Date() },
    });

    return { marked: true };
}

/**
 * Get unread update count for the investor.
 */
export async function getUnreadUpdateCount(investorId: string) {
    // Get all startup IDs the investor has access to
    const investments = await prisma.investment.findMany({
        where: { investorId },
        select: { startupId: true }
    });
    const ownedStartups = await prisma.startup.findMany({
        where: { investorId },
        select: { id: true }
    });
    const startupIds = new Set([
        ...investments.map(i => i.startupId),
        ...ownedStartups.map(s => s.id)
    ]);

    if (startupIds.size === 0) return { count: 0 };

    // Count updates that have NO read record for this investor
    const count = await prisma.monthlyUpdate.count({
        where: {
            startupId: { in: Array.from(startupIds) },
            status: 'SUBMITTED',
            reads: {
                none: { investorId }
            }
        }
    });

    return { count };
}

