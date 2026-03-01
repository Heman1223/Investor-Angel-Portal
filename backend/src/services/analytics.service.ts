import { prisma } from '../db';
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
    sectorAllocation: { sector: string; invested: number; currentValue: number; avgIRR: number | null; avgMOIC: number; count: number }[];
    bestSector: { sector: string; avgMOIC: number } | null;
    worstSector: { sector: string; avgMOIC: number } | null;
    startupMetrics: StartupMetric[];
}

// Per-investor in-memory cache with 30-second TTL
const analyticsCacheMap = new Map<string, { data: PortfolioAnalytics; expiresAt: number }>();

export function invalidateAnalyticsCache(): void {
    analyticsCacheMap.clear();
}

export async function getPortfolioAnalytics(investorId: string): Promise<PortfolioAnalytics> {
    // Check per-investor cache
    const cached = analyticsCacheMap.get(investorId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const startups = await prisma.startup.findMany({ where: { investorId } });
    const allCashflows = await prisma.cashflow.findMany({
        where: { investorId },
        orderBy: { date: 'asc' }
    });

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
            cf => cf.startupId === startup.id
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
            startupId: startup.id,
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

    const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, data]) => {
        const sectorStartups = startupMetrics.filter(sm => sm.sector === sector);
        const irrValues = sectorStartups.map(sm => sm.xirr).filter((v): v is number => v !== null);
        const avgIRR = irrValues.length > 0 ? irrValues.reduce((a, b) => a + b, 0) / irrValues.length : null;
        const avgMOIC = sectorStartups.length > 0 ? sectorStartups.reduce((sum, sm) => sum + sm.moic, 0) / sectorStartups.length : 0;
        return {
            sector,
            invested: data.invested,
            currentValue: data.currentValue,
            avgIRR,
            avgMOIC,
            count: sectorStartups.length,
        };
    });

    const sortedSectors = [...sectorAllocation].sort((a, b) => b.avgMOIC - a.avgMOIC);
    const bestSector = sortedSectors.length > 0 ? { sector: sortedSectors[0].sector, avgMOIC: sortedSectors[0].avgMOIC } : null;
    const worstSector = sortedSectors.length > 1 ? { sector: sortedSectors[sortedSectors.length - 1].sector, avgMOIC: sortedSectors[sortedSectors.length - 1].avgMOIC } : null;

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
        bestSector,
        worstSector,
        startupMetrics,
    };

    // Cache per investor for 30 seconds
    analyticsCacheMap.set(investorId, { data: result, expiresAt: Date.now() + 30000 });

    return result;
}
