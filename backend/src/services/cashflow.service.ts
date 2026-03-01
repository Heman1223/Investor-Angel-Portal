import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { writeAuditLog } from '../middleware/auditLog';
import { invalidateAnalyticsCache } from './analytics.service';

/**
 * Add a new cashflow entry to a startup's ledger.
 */
export async function addCashflow(
    investorId: string,
    startupId: string,
    data: {
        amount: number; date: string; type: string;
        roundName?: string; notes?: string; reason?: string;
    }
) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    // Determine sign: investments & follow_ons are outflows (negative), exits & corrections can be either
    const isOutflow = data.type === 'investment' || data.type === 'follow_on';
    const amountPaise = Math.round(Math.abs(data.amount) * 100) * (isOutflow ? -1 : 1);

    const cashflow = await prisma.cashflow.create({
        data: {
            investorId,
            startupId,
            amount: amountPaise,
            date: new Date(data.date),
            type: data.type,
            roundName: data.roundName || null,
            notes: data.notes || null,
            currency: 'INR',
            createdBy: investorId,
        }
    });

    await writeAuditLog({
        investorId,
        action: 'ADD_CASHFLOW',
        entityType: 'cashflow',
        entityId: cashflow.id,
        newValue: {
            amount: data.amount,
            type: data.type,
            date: data.date,
            roundName: data.roundName,
            reason: data.reason || 'Manual entry',
        },
    });

    invalidateAnalyticsCache();
    return cashflow;
}

/**
 * Update an existing cashflow entry. Requires a reason for audit trail.
 */
export async function updateCashflow(
    investorId: string,
    cashflowId: string,
    data: {
        amount?: number; date?: string; type?: string;
        roundName?: string; notes?: string; reason: string;
    }
) {
    const cashflow = await prisma.cashflow.findFirst({
        where: { id: cashflowId, investorId }
    });
    if (!cashflow) {
        throw createAppError('Cashflow not found', 404, 'NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) {
        const isOutflow = (data.type || cashflow.type) === 'investment' || (data.type || cashflow.type) === 'follow_on';
        updateData.amount = Math.round(Math.abs(data.amount) * 100) * (isOutflow ? -1 : 1);
    }
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.roundName !== undefined) updateData.roundName = data.roundName;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const oldValue = {
        amount: cashflow.amount,
        date: cashflow.date,
        type: cashflow.type,
        roundName: cashflow.roundName,
        notes: cashflow.notes,
    };

    const updated = await prisma.cashflow.update({
        where: { id: cashflowId },
        data: updateData,
    });

    await writeAuditLog({
        investorId,
        action: 'UPDATE_CASHFLOW',
        entityType: 'cashflow',
        entityId: cashflowId,
        oldValue,
        newValue: { ...updateData, reason: data.reason },
    });

    invalidateAnalyticsCache();
    return updated;
}

/**
 * Delete a cashflow entry. Requires a reason for audit trail.
 */
export async function deleteCashflow(
    investorId: string,
    cashflowId: string,
    reason: string
) {
    const cashflow = await prisma.cashflow.findFirst({
        where: { id: cashflowId, investorId }
    });
    if (!cashflow) {
        throw createAppError('Cashflow not found', 404, 'NOT_FOUND');
    }

    await prisma.cashflow.delete({
        where: { id: cashflowId }
    });

    await writeAuditLog({
        investorId,
        action: 'DELETE_CASHFLOW',
        entityType: 'cashflow',
        entityId: cashflowId,
        oldValue: {
            amount: cashflow.amount,
            date: cashflow.date,
            type: cashflow.type,
            roundName: cashflow.roundName,
            startupId: cashflow.startupId,
        },
        newValue: { reason },
    });

    invalidateAnalyticsCache();
    return { deleted: true };
}
