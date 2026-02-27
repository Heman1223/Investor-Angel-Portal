import { Startup } from '../models/Startup';
import { Cashflow } from '../models/Cashflow';
import {
    calculateXIRR,
    calculateMOIC,
    calculateCAGR,
    calculateTVPI,
    calculateCurrentValue,
    calculateYearsHeld,
    calculateUnrealisedGain,
} from './financials.service';

interface StartupMetric {
    startupId: string;
    name: string;
    sector: string;
    stage: string;
    status: string;
    invested: number;
    currentValue: number;
    moic: number;
    xirr: number | null;
    cagr: number;
    unrealisedGain: number;
    equityPercent: number;
    investmentDate: Date;
}

interface PortfolioAnalytics {
    totalInvested: number;
    currentPortfolioValue: number;
    unrealisedGain: number;
    portfolioMOIC: number;
    portfolioXIRR: number | null;
    portfolioTVPI: number;
    activeCount: number;
    exitedCount: number;
    sectorAllocation: { sector: string; invested: number; currentValue: number }[];
    startupMetrics: StartupMetric[];
}

// Simple in-memory cache with 30-second TTL
let analyticsCache: { data: PortfolioAnalytics; expiresAt: number } | null = null;

export function invalidateAnalyticsCache(): void {
    analyticsCache = null;
}

export async function getPortfolioAnalytics(investorId: string): Promise<PortfolioAnalytics> {
    // Check cache
    if (analyticsCache && analyticsCache.expiresAt > Date.now()) {
        return analyticsCache.data;
    }

    const startups = await Startup.find({ investorId });
    const allCashflows = await Cashflow.find({ investorId }).sort({ date: 1 });

    let totalInvested = 0;
    let currentPortfolioValue = 0;
    let realisedReturns = 0;
    const allPortfolioCashflows: { amount: number; date: Date }[] = [];
    const sectorMap = new Map<string, { invested: number; currentValue: number }>();
    const startupMetrics: StartupMetric[] = [];

    let activeCount = 0;
    let exitedCount = 0;

    for (const startup of startups) {
        const startupCashflows = allCashflows.filter(
            cf => cf.startupId.toString() === startup._id.toString()
        );

        // Sum invested amounts (negative cashflows = outflows)
        const invested = startupCashflows
            .filter(cf => cf.amount < 0)
            .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

        // Sum returns (positive cashflows = inflows)
        const returns = startupCashflows
            .filter(cf => cf.amount > 0)
            .reduce((sum, cf) => sum + cf.amount, 0);

        let currentValue: number;
        if (startup.status === 'exited') {
            currentValue = returns;
            realisedReturns += returns;
            exitedCount++;
        } else if (startup.status === 'written_off') {
            currentValue = 0;
            exitedCount++;
        } else {
            currentValue = calculateCurrentValue(invested, startup.currentValuation, startup.entryValuation);
            activeCount++;
        }

        totalInvested += invested;
        currentPortfolioValue += currentValue;

        // Sector allocation
        const sectorData = sectorMap.get(startup.sector) || { invested: 0, currentValue: 0 };
        sectorData.invested += invested;
        sectorData.currentValue += currentValue;
        sectorMap.set(startup.sector, sectorData);

        // Per-startup XIRR
        const xirrCashflows = startupCashflows.map(cf => ({ amount: cf.amount, date: cf.date }));
        if (startup.status === 'active' || startup.status === 'watchlist') {
            // Add synthetic terminal cashflow for active startups
            xirrCashflows.push({ amount: currentValue, date: new Date() });
        }

        const xirr = calculateXIRR(xirrCashflows);
        const moic = calculateMOIC(invested, currentValue);
        const yearsHeld = calculateYearsHeld(startup.investmentDate);
        const cagr = calculateCAGR(invested, currentValue, yearsHeld);
        const unrealisedGain = startup.status === 'active'
            ? calculateUnrealisedGain(invested, startup.currentValuation, startup.entryValuation)
            : 0;

        startupMetrics.push({
            startupId: startup._id.toString(),
            name: startup.name,
            sector: startup.sector,
            stage: startup.stage,
            status: startup.status,
            invested,
            currentValue,
            moic,
            xirr,
            cagr,
            unrealisedGain,
            equityPercent: startup.currentEquityPercent,
            investmentDate: startup.investmentDate,
        });

        // Add to portfolio-level cashflows
        allPortfolioCashflows.push(...xirrCashflows);
    }

    // Portfolio-level XIRR
    const portfolioXIRR = calculateXIRR(allPortfolioCashflows);
    const portfolioMOIC = calculateMOIC(totalInvested, currentPortfolioValue);

    const unrealisedValue = currentPortfolioValue - realisedReturns;
    const portfolioTVPI = calculateTVPI(
        unrealisedValue > 0 ? unrealisedValue : 0,
        realisedReturns,
        totalInvested
    );

    const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, data]) => ({
        sector,
        invested: data.invested,
        currentValue: data.currentValue,
    }));

    const result: PortfolioAnalytics = {
        totalInvested,
        currentPortfolioValue,
        unrealisedGain: currentPortfolioValue - totalInvested,
        portfolioMOIC,
        portfolioXIRR,
        portfolioTVPI,
        activeCount,
        exitedCount,
        sectorAllocation,
        startupMetrics,
    };

    // Cache for 30 seconds
    analyticsCache = { data: result, expiresAt: Date.now() + 30000 };

    return result;
}
