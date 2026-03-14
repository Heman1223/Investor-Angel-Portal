import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { writeAuditLog } from '../middleware/auditLog';
import { invalidateAnalyticsCache } from './analytics.service';
import { runAlertEngine } from './alerts.service';
import {
    calculateXIRR,
    calculateMOIC,
    calculateCAGR,
    calculateCurrentValue,
    calculateYearsHeld,
    calculateUnrealisedGain,
} from './financials.service';
import crypto from 'crypto';
import { sendInviteEmail } from './notification.service';

export async function createStartup(
    investorId: string,
    data: {
        name: string; sector: string; stage: string; investmentDate: string;
        entryValuation: number; investedAmount: number; equityPercent: number;
        description?: string; website?: string; founderName?: string; founderEmail?: string;
        coInvestors?: string;
    }
) {
    const entryValuationPaise = Math.round(data.entryValuation * 100);
    const investedAmountPaise = Math.round(data.investedAmount * 100);

    let startupId: string;
    let existingStartup = null;

    if (data.founderEmail) {
        existingStartup = await prisma.startup.findFirst({
            where: { founderEmail: data.founderEmail.toLowerCase() }
        });
    }

    if (existingStartup) {
        startupId = existingStartup.id;

        // Check if investment link already exists, if not create it
        const existingInv = await prisma.investment.findFirst({
            where: { investorId, startupId }
        });

        if (!existingInv) {
            await prisma.investment.create({
                data: {
                    investorId,
                    startupId,
                    amount: investedAmountPaise,
                    date: new Date(data.investmentDate)
                }
            });
        }
    } else {
        const startup = await prisma.startup.create({
            data: {
                investorId,
                name: data.name,
                sector: data.sector,
                stage: data.stage,
                status: data.founderEmail ? 'pending' : 'active',
                entryValuation: entryValuationPaise,
                currentValuation: entryValuationPaise,
                equityPercent: data.equityPercent,
                currentEquityPercent: data.equityPercent,
                investmentDate: new Date(data.investmentDate),
                description: data.description,
                website: data.website,
                founderName: data.founderName,
                founderEmail: data.founderEmail ? data.founderEmail.toLowerCase() : null,
                coInvestors: data.coInvestors,
            }
        });
        startupId = startup.id;

        if (data.founderEmail) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await prisma.companyInvite.create({
                data: {
                    startupId: startup.id,
                    invitedBy: investorId,
                    email: data.founderEmail.toLowerCase(),
                    token,
                    status: 'PENDING',
                    companyRole: 'admin',
                    expiresAt,
                }
            });

            // Send the invite email to the founder
            const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;
            await sendInviteEmail(data.founderEmail, data.name, inviteUrl).catch(console.error);
        }
    }

    // Create initial investment cashflow (negative = outflow)
    await prisma.cashflow.create({
        data: {
            investorId,
            startupId: startupId,
            amount: -investedAmountPaise,
            date: new Date(data.investmentDate),
            type: 'investment',
            roundName: 'Initial Investment',
            valuationAtTime: entryValuationPaise,
            equityAcquired: data.equityPercent,
            currency: 'INR',
            notes: `Initial investment in ${data.name}`,
            createdBy: investorId,
        }
    });

    await writeAuditLog({
        investorId,
        action: 'CREATE_INVESTMENT',
        entityType: 'startup',
        entityId: startupId,
        newValue: { name: data.name, invested: data.investedAmount, equity: data.equityPercent },
    });

    invalidateAnalyticsCache();
    runAlertEngine(investorId, startupId).catch(() => { });

    return prisma.startup.findUniqueOrThrow({ where: { id: startupId } });
}

export async function getAllStartups(investorId: string, status?: string) {
    const filter: any = {
        OR: [
            { investorId },
            { investments: { some: { investorId } } }
        ]
    };
    if (status) filter.status = status;

    const startups = await prisma.startup.findMany({
        where: filter,
        orderBy: { investmentDate: 'desc' }
    });

    const cashflows = await prisma.cashflow.findMany({
        where: { investorId },
        orderBy: { date: 'asc' }
    });

    // Fetch latest monthly update per startup for runway data
    const latestUpdates = await prisma.monthlyUpdate.findMany({
        where: { startupId: { in: startups.map(s => s.id) } },
        orderBy: { month: 'desc' },
        distinct: ['startupId'],
    });
    const runwayMap = new Map<string, number>();
    for (const u of latestUpdates) {
        if (u.runwayMonths !== null) runwayMap.set(u.startupId, u.runwayMonths);
    }

    return startups.map(startup => {
        const startupCashflows = cashflows.filter(
            cf => cf.startupId === startup.id
        );

        const invested = startupCashflows
            .filter(cf => cf.amount < 0)
            .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

        const returns = startupCashflows
            .filter(cf => cf.amount > 0)
            .reduce((sum, cf) => sum + cf.amount, 0);

        let currentValue: number;
        if (startup.status === 'exited') {
            currentValue = returns;
        } else if (startup.status === 'written_off') {
            currentValue = 0;
        } else {
            currentValue = calculateCurrentValue(invested, startup.currentValuation, startup.entryValuation);
        }

        const xirrCashflows = startupCashflows.map(cf => ({ amount: cf.amount, date: cf.date }));
        if (startup.status === 'active' || startup.status === 'watchlist' || startup.status === 'pending') {
            xirrCashflows.push({ amount: currentValue, date: new Date() });
        }

        return {
            ...startup,
            investmentDate: startup.investmentDate.toISOString(),
            createdAt: startup.createdAt.toISOString(),
            updatedAt: startup.updatedAt.toISOString(),
            latestRunwayMonths: runwayMap.get(startup.id) ?? null,
            metrics: {
                invested,
                currentValue,
                moic: calculateMOIC(invested, currentValue),
                xirr: calculateXIRR(xirrCashflows),
                cagr: calculateCAGR(invested, currentValue, calculateYearsHeld(startup.investmentDate)),
                unrealisedGain: (startup.status === 'active' || startup.status === 'pending')
                    ? calculateUnrealisedGain(invested, startup.currentValuation, startup.entryValuation)
                    : 0,
            },
        };
    });
}

export async function getStartupById(investorId: string, startupId: string) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });

    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const cashflows = await prisma.cashflow.findMany({
        where: { startupId },
        orderBy: { date: 'asc' }
    });

    const dilutionEvents = await prisma.dilutionEvent.findMany({
        where: { startupId },
        orderBy: { date: 'asc' }
    });

    const invested = cashflows
        .filter(cf => cf.amount < 0)
        .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

    const returns = cashflows
        .filter(cf => cf.amount > 0)
        .reduce((sum, cf) => sum + cf.amount, 0);

    let currentValue: number;
    if (startup.status === 'exited') {
        currentValue = returns;
    } else if (startup.status === 'written_off') {
        currentValue = 0;
    } else {
        currentValue = calculateCurrentValue(invested, startup.currentValuation, startup.entryValuation);
    }

    const xirrCashflows = cashflows.map(cf => ({ amount: cf.amount, date: cf.date }));
    if (startup.status === 'active' || startup.status === 'watchlist') {
        xirrCashflows.push({ amount: currentValue, date: new Date() });
    }

    return {
        ...startup,
        investmentDate: startup.investmentDate.toISOString(),
        createdAt: startup.createdAt.toISOString(),
        updatedAt: startup.updatedAt.toISOString(),
        metrics: {
            invested,
            currentValue,
            moic: calculateMOIC(invested, currentValue),
            xirr: calculateXIRR(xirrCashflows),
            cagr: calculateCAGR(invested, currentValue, calculateYearsHeld(startup.investmentDate)),
            unrealisedGain: startup.status === 'active'
                ? calculateUnrealisedGain(invested, startup.currentValuation, startup.entryValuation)
                : 0,
        },
        cashflows: cashflows.map(cf => ({ ...cf, date: cf.date.toISOString(), createdAt: cf.createdAt.toISOString(), updatedAt: cf.updatedAt.toISOString() })),
        dilutionEvents: dilutionEvents.map(de => ({ ...de, date: de.date.toISOString(), createdAt: de.createdAt.toISOString() })),
    };
}

export async function updateStartup(
    investorId: string,
    startupId: string,
    data: {
        name?: string; sector?: string; stage?: string; description?: string;
        website?: string; founderName?: string; founderEmail?: string;
        coInvestors?: string; investmentDate?: string
    },
    req?: { ip?: string; headers?: Record<string, any> }
) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } },
                { companyMemberships: { some: { userId: investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const oldValue = { ...startup };

    // Convert string date to Date object if provided
    const updateData: any = { ...data };
    if (data.investmentDate) {
        updateData.investmentDate = new Date(data.investmentDate);
    }

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: updateData
    });

    await writeAuditLog({
        investorId,
        action: 'UPDATE_STARTUP',
        entityType: 'startup',
        entityId: startupId,
        oldValue,
        newValue: data,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
    });

    invalidateAnalyticsCache();
    return updatedStartup;
}

export async function updateValuation(investorId: string, startupId: string, currentValuation: number) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const oldValuation = startup.currentValuation;
    const valuationPaise = Math.round(currentValuation * 100);

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: { currentValuation: valuationPaise }
    });

    await writeAuditLog({
        investorId,
        action: 'UPDATE_VALUATION',
        entityType: 'startup',
        entityId: startupId,
        oldValue: { currentValuation: oldValuation },
        newValue: { currentValuation: valuationPaise },
    });

    invalidateAnalyticsCache();
    return updatedStartup;
}

export async function recordExit(
    investorId: string,
    startupId: string,
    data: { exitDate: string; exitValue: number; exitType: string }
) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            status: 'active',
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Active startup not found', 404, 'NOT_FOUND');
    }

    const exitValuePaise = Math.round(data.exitValue * 100);

    // Create exit cashflow (positive = inflow)
    await prisma.cashflow.create({
        data: {
            investorId,
            startupId,
            amount: exitValuePaise,
            date: new Date(data.exitDate),
            type: 'exit',
            roundName: data.exitType,
            currency: 'INR',
            notes: `Exit via ${data.exitType}`,
            createdBy: investorId,
        }
    });

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: { status: 'exited' }
    });

    await writeAuditLog({
        investorId,
        action: 'RECORD_EXIT',
        entityType: 'startup',
        entityId: startupId,
        newValue: { exitDate: data.exitDate, exitValue: data.exitValue, exitType: data.exitType },
    });

    invalidateAnalyticsCache();

    // Return startup with metrics
    return getStartupById(investorId, startupId);
}

export async function addFollowOn(
    investorId: string,
    startupId: string,
    data: { amount: number; date: string; roundName: string; equityAcquired: number; valuationAtTime: number }
) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const amountPaise = Math.round(data.amount * 100);
    const valuationPaise = Math.round(data.valuationAtTime * 100);

    // Create follow-on cashflow
    await prisma.cashflow.create({
        data: {
            investorId,
            startupId,
            amount: -amountPaise,
            date: new Date(data.date),
            type: 'follow_on',
            roundName: data.roundName,
            valuationAtTime: valuationPaise,
            equityAcquired: data.equityAcquired,
            currency: 'INR',
            notes: `Follow-on: ${data.roundName}`,
            createdBy: investorId,
        }
    });

    // Create dilution event
    const preDilution = startup.currentEquityPercent;
    const postDilution = preDilution + data.equityAcquired;

    await prisma.dilutionEvent.create({
        data: {
            startupId,
            investorId,
            roundName: data.roundName,
            date: new Date(data.date),
            preDilutionEquity: preDilution,
            postDilutionEquity: Math.min(postDilution, 100),
            roundValuation: valuationPaise,
        }
    });

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: {
            currentEquityPercent: Math.min(postDilution, 100),
            currentValuation: valuationPaise
        }
    });

    await writeAuditLog({
        investorId,
        action: 'ADD_FOLLOW_ON',
        entityType: 'startup',
        entityId: startupId,
        newValue: { amount: data.amount, roundName: data.roundName, equityAcquired: data.equityAcquired },
    });

    invalidateAnalyticsCache();
    return getStartupById(investorId, startupId);
}

export async function addNote(investorId: string, startupId: string, text: string) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const existingNotes = (startup.notes as Array<{ text: string; createdAt: string }>) || [];
    const newNote = { text, createdAt: new Date().toISOString() };
    const updatedNotes = [newNote, ...existingNotes];

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: { notes: updatedNotes as any }
    });

    await writeAuditLog({
        investorId,
        action: 'ADD_NOTE',
        entityType: 'startup',
        entityId: startupId,
        newValue: { note: text },
    });

    return updatedStartup;
}

export async function softDeleteStartup(investorId: string, startupId: string) {
    const startup = await prisma.startup.findFirst({
        where: {
            id: startupId,
            OR: [
                { investorId },
                { investments: { some: { investorId } } }
            ]
        }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const updatedStartup = await prisma.startup.update({
        where: { id: startup.id },
        data: { status: 'written_off' }
    });

    await writeAuditLog({
        investorId,
        action: 'WRITE_OFF_STARTUP',
        entityType: 'startup',
        entityId: startupId,
        newValue: { status: 'written_off' },
    });

    invalidateAnalyticsCache();
    return updatedStartup;
}
