import { MonthlyUpdate } from '../models/MonthlyUpdate';
import { Startup } from '../models/Startup';
import { createAppError } from '../middleware/errorHandler';
import { writeAuditLog } from '../middleware/auditLog';
import { calculateRunway } from './financials.service';
import { runAlertEngine } from './alerts.service';
import { invalidateAnalyticsCache } from './analytics.service';

export async function getUpdates(investorId: string, startupId: string) {
    // Verify startup belongs to investor
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    return MonthlyUpdate.find({ startupId }).sort({ month: -1 });
}

export async function getAllUpdates(investorId: string) {
    const startups = await Startup.find({ investorId }).select('_id name');
    const startupIds = startups.map(s => s._id);

    const updates = await MonthlyUpdate.find({ startupId: { $in: startupIds } })
        .populate('startupId', 'name sector')
        .sort({ month: -1 });

    return updates;
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
    const startup = await Startup.findOne({ _id: startupId, investorId });
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
        const update = await MonthlyUpdate.create({
            startupId,
            submittedBy: investorId,
            month: data.month,
            revenue: revenuePaise,
            burnRate: burnRatePaise,
            cashBalance: cashBalancePaise,
            runwayMonths,
            valuationUpdate: data.valuationUpdate ? Math.round(data.valuationUpdate * 100) : undefined,
            notes: data.notes,
        });

        // Update startup valuation if provided
        if (data.valuationUpdate) {
            startup.currentValuation = Math.round(data.valuationUpdate * 100);
            await startup.save();
            invalidateAnalyticsCache();
        }

        // Run alert engine
        await runAlertEngine(investorId, startupId);

        await writeAuditLog({
            investorId,
            action: 'CREATE_MONTHLY_UPDATE',
            entityType: 'monthly_update',
            entityId: update._id.toString(),
            newValue: { month: data.month, revenue: data.revenue, burnRate: data.burnRate, cashBalance: data.cashBalance },
        });

        return update;
    } catch (error: any) {
        if (error.code === 11000) {
            throw createAppError('An update for this month already exists', 409, 'DUPLICATE');
        }
        throw error;
    }
}
