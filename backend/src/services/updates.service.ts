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

    return prisma.monthlyUpdate.findMany({
        where: { startupId },
        orderBy: { month: 'desc' }
    });
}

export async function getAllUpdates(investorId: string) {
    const updates = await prisma.monthlyUpdate.findMany({
        where: { startup: { investorId } },
        include: {
            startup: {
                select: { id: true, name: true, sector: true }
            }
        },
        orderBy: { month: 'desc' }
    });

    return updates.map(u => {
        const { startup, ...rest } = u;
        return {
            ...rest,
            // Replicate Mongoose `.populate('startupId')` behavior
            startupId: startup ? {
                _id: startup.id,
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
    }
) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    // Convert to paise
    const revenuePaise = Math.round(data.revenue * 100);
    const burnRatePaise = Math.round(data.burnRate * 100);
    const cashBalancePaise = Math.round(data.cashBalance * 100);

    // Compute runway
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
            }
        });

        // Update startup valuation if provided
        if (data.valuationUpdate) {
            await prisma.startup.update({
                where: { id: startup.id },
                data: { currentValuation: Math.round(data.valuationUpdate * 100) }
            });
            invalidateAnalyticsCache();
        }

        // Run alert engine
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
        // Prisma unique constraint violation code is P2002
        if (error.code === 'P2002') {
            throw createAppError('An update for this month already exists', 409, 'DUPLICATE');
        }
        throw error;
    }
}
