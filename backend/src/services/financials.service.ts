/**
 * PortfolioOS Financial Calculations Engine
 * ALL financial logic lives here — zero financial logic anywhere else.
 * All monetary values are in paise (smallest currency unit).
 */

/**
 * Calculate XIRR using bisection method.
 * @param cashflows [{amount: number, date: Date}] — sorted ascending by date
 *   Investments = NEGATIVE amounts. Exits/current value = POSITIVE amounts.
 * @returns Rate as decimal (0.25 = 25%) or null if calculation fails
 */
export function calculateXIRR(cashflows: { amount: number; date: Date }[]): number | null {
    if (cashflows.length < 2) return null;

    // Check if all cashflows share the same date
    const firstDate = cashflows[0].date.getTime();
    const allSameDate = cashflows.every(cf => cf.date.getTime() === firstDate);
    if (allSameDate) return null;

    // Check for write-off: all outflows and no inflows
    const totalInflow = cashflows.filter(cf => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);
    const totalOutflow = cashflows.filter(cf => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);

    if (totalInflow === 0) return -1.0; // Complete write-off
    if (totalInflow === totalOutflow) return 0.0; // Break even

    const referenceDate = cashflows[0].date;

    function yearFrac(d: Date): number {
        const ms = d.getTime() - referenceDate.getTime();
        return ms / (365.25 * 24 * 60 * 60 * 1000);
    }

    function npv(rate: number): number {
        return cashflows.reduce((sum, cf) => {
            const yf = yearFrac(cf.date);
            return sum + cf.amount / Math.pow(1 + rate, yf);
        }, 0);
    }

    // Bisection between lo and hi
    let lo = -0.999;
    let hi = 10.0;

    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const npvMid = npv(mid);

        if (Math.abs(npvMid) < 0.001) {
            return Math.round(mid * 10000) / 10000; // Round to 4 decimal places
        }

        if (npv(lo) * npvMid < 0) {
            hi = mid;
        } else {
            lo = mid;
        }
    }

    return null; // Non-convergence
}

/**
 * Calculate MOIC (Multiple on Invested Capital)
 * MOIC = currentValue / totalInvested
 */
export function calculateMOIC(totalInvested: number, currentValue: number): number {
    if (totalInvested === 0) return 0;
    return Math.round((currentValue / totalInvested) * 100) / 100;
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * CAGR = (currentValue / investedAmount)^(1 / yearsHeld) - 1
 */
export function calculateCAGR(invested: number, current: number, yearsHeld: number): number {
    if (invested <= 0 || current <= 0) return 0;
    const years = Math.max(yearsHeld, 0.1); // Minimum 0.1 to avoid division artifacts
    return Math.pow(current / invested, 1 / years) - 1;
}

/**
 * Calculate TVPI (Total Value to Paid-In)
 * TVPI = (unrealisedValue + realisedReturns) / totalPaidIn
 */
export function calculateTVPI(unrealisedValue: number, realisedReturns: number, totalPaidIn: number): number {
    if (totalPaidIn === 0) return 0;
    return Math.round(((unrealisedValue + realisedReturns) / totalPaidIn) * 100) / 100;
}

/**
 * Calculate Runway in months
 * Runway = cashBalance / burnRate
 */
export function calculateRunway(cashBalance: number, burnRate: number): number {
    if (cashBalance <= 0) return 0;
    if (burnRate === 0) return Infinity;
    return Math.round((cashBalance / burnRate) * 10) / 10; // 1 decimal place
}

/**
 * Calculate Revenue Change MoM
 * Returns change as decimal (0.15 = +15%, -0.20 = -20%)
 */
export function calculateRevenueChangeMoM(latestRevenue: number, previousRevenue: number): number | null {
    if (previousRevenue === 0) return null;
    return (latestRevenue - previousRevenue) / previousRevenue;
}

/**
 * Calculate Unrealised Gain/Loss
 * unrealisedGain = currentValue - totalInvested
 * currentValue = totalInvested * (currentValuation / entryValuation)
 */
export function calculateUnrealisedGain(totalInvested: number, currentValuation: number, entryValuation: number): number {
    if (entryValuation === 0) return 0;
    const currentValue = totalInvested * (currentValuation / entryValuation);
    return currentValue - totalInvested;
}

/**
 * Calculate current value of an investment
 */
export function calculateCurrentValue(totalInvested: number, currentValuation: number, entryValuation: number): number {
    if (entryValuation === 0) return 0;
    return totalInvested * (currentValuation / entryValuation);
}

/**
 * Calculate years held from a date to now (or exit date)
 */
export function calculateYearsHeld(startDate: Date, endDate?: Date): number {
    const end = endDate || new Date();
    const ms = end.getTime() - startDate.getTime();
    return ms / (365.25 * 24 * 60 * 60 * 1000);
}
