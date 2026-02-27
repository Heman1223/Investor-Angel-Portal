import { Startup } from '../models/Startup';
import { Cashflow } from '../models/Cashflow';
import { DilutionEvent } from '../models/DilutionEvent';
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

export async function createStartup(
    investorId: string,
    data: {
        name: string; sector: string; stage: string; investmentDate: string;
        entryValuation: number; investedAmount: number; equityPercent: number;
        description?: string; website?: string; founderName?: string; founderEmail?: string;
    }
) {
    // Convert to paise
    const entryValuationPaise = Math.round(data.entryValuation * 100);
    const investedAmountPaise = Math.round(data.investedAmount * 100);

    const startup = await Startup.create({
        investorId,
        name: data.name,
        sector: data.sector,
        stage: data.stage,
        status: 'active',
        entryValuation: entryValuationPaise,
        currentValuation: entryValuationPaise,
        equityPercent: data.equityPercent,
        currentEquityPercent: data.equityPercent,
        investmentDate: new Date(data.investmentDate),
        description: data.description,
        website: data.website,
        founderName: data.founderName,
        founderEmail: data.founderEmail,
    });

    // Create initial investment cashflow (negative = outflow)
    await Cashflow.create({
        investorId,
        startupId: startup._id,
        amount: -investedAmountPaise,
        date: new Date(data.investmentDate),
        type: 'investment',
        roundName: 'Initial Investment',
        valuationAtTime: entryValuationPaise,
        equityAcquired: data.equityPercent,
        currency: 'INR',
        notes: `Initial investment in ${data.name}`,
        createdBy: investorId,
    });

    await writeAuditLog({
        investorId,
        action: 'CREATE_INVESTMENT',
        entityType: 'startup',
        entityId: startup._id.toString(),
        newValue: { name: data.name, invested: data.investedAmount, equity: data.equityPercent },
    });

    invalidateAnalyticsCache();

    return startup;
}

export async function getAllStartups(investorId: string, status?: string) {
    const filter: any = { investorId };
    if (status) filter.status = status;

    const startups = await Startup.find(filter).sort({ investmentDate: -1 });
    const cashflows = await Cashflow.find({ investorId }).sort({ date: 1 });

    return startups.map(startup => {
        const startupCashflows = cashflows.filter(
            cf => cf.startupId.toString() === startup._id.toString()
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
        if (startup.status === 'active' || startup.status === 'watchlist') {
            xirrCashflows.push({ amount: currentValue, date: new Date() });
        }

        return {
            ...startup.toObject(),
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
        };
    });
}

export async function getStartupById(investorId: string, startupId: string) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const cashflows = await Cashflow.find({ startupId }).sort({ date: 1 });
    const dilutionEvents = await DilutionEvent.find({ startupId }).sort({ date: 1 });

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
        ...startup.toObject(),
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
        cashflows,
        dilutionEvents,
    };
}

export async function updateStartup(
    investorId: string,
    startupId: string,
    data: { name?: string; sector?: string; stage?: string; description?: string; website?: string; founderName?: string; founderEmail?: string },
    req?: { ip?: string; headers?: Record<string, any> }
) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const oldValue = startup.toObject();
    Object.assign(startup, data);
    await startup.save();

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
    return startup;
}

export async function updateValuation(investorId: string, startupId: string, currentValuation: number) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const oldValuation = startup.currentValuation;
    const valuationPaise = Math.round(currentValuation * 100);
    startup.currentValuation = valuationPaise;
    await startup.save();

    await writeAuditLog({
        investorId,
        action: 'UPDATE_VALUATION',
        entityType: 'startup',
        entityId: startupId,
        oldValue: { currentValuation: oldValuation },
        newValue: { currentValuation: valuationPaise },
    });

    invalidateAnalyticsCache();
    return startup;
}

export async function recordExit(
    investorId: string,
    startupId: string,
    data: { exitDate: string; exitValue: number; exitType: string }
) {
    const startup = await Startup.findOne({ _id: startupId, investorId, status: 'active' });
    if (!startup) {
        throw createAppError('Active startup not found', 404, 'NOT_FOUND');
    }

    const exitValuePaise = Math.round(data.exitValue * 100);

    // Create exit cashflow (positive = inflow)
    await Cashflow.create({
        investorId,
        startupId,
        amount: exitValuePaise,
        date: new Date(data.exitDate),
        type: 'exit',
        roundName: data.exitType,
        currency: 'INR',
        notes: `Exit via ${data.exitType}`,
        createdBy: investorId,
    });

    startup.status = 'exited';
    await startup.save();

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
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const amountPaise = Math.round(data.amount * 100);
    const valuationPaise = Math.round(data.valuationAtTime * 100);

    // Create follow-on cashflow
    await Cashflow.create({
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
    });

    // Create dilution event
    const preDilution = startup.currentEquityPercent;
    const postDilution = preDilution + data.equityAcquired;

    await DilutionEvent.create({
        startupId,
        investorId,
        roundName: data.roundName,
        date: new Date(data.date),
        preDilutionEquity: preDilution,
        postDilutionEquity: Math.min(postDilution, 100),
        roundValuation: valuationPaise,
    });

    startup.currentEquityPercent = Math.min(postDilution, 100);
    startup.currentValuation = valuationPaise;
    await startup.save();

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

export async function softDeleteStartup(investorId: string, startupId: string) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    startup.status = 'written_off';
    await startup.save();

    await writeAuditLog({
        investorId,
        action: 'WRITE_OFF_STARTUP',
        entityType: 'startup',
        entityId: startupId,
        newValue: { status: 'written_off' },
    });

    invalidateAnalyticsCache();
    return startup;
}
