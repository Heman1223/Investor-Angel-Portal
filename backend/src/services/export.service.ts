import { prisma } from '../db';
import { getAllStartups } from './startup.service';

/**
 * Export portfolio data as CSV string.
 * Columns: Name, Sector, Stage, Status, Investment Date, Entry Valuation (₹),
 *          Current Valuation (₹), Equity %, Invested (₹), Current Value (₹), MOIC, XIRR (%)
 */
export async function exportPortfolioCSV(investorId: string): Promise<string> {
    const startups = await getAllStartups(investorId);

    const headers = [
        'Name', 'Sector', 'Stage', 'Status', 'Investment Date',
        'Entry Valuation (₹)', 'Current Valuation (₹)', 'Equity %',
        'Invested (₹)', 'Current Value (₹)', 'MOIC', 'XIRR (%)',
    ];

    const rows = startups.map(s => [
        csvEscape(s.name),
        csvEscape(s.sector),
        csvEscape(s.stage),
        csvEscape(s.status),
        new Date(s.investmentDate).toISOString().split('T')[0],
        (s.entryValuation / 100).toFixed(2),
        (s.currentValuation / 100).toFixed(2),
        s.currentEquityPercent.toFixed(2),
        (s.metrics.invested / 100).toFixed(2),
        (s.metrics.currentValue / 100).toFixed(2),
        s.metrics.moic.toFixed(2),
        s.metrics.xirr !== null ? (s.metrics.xirr * 100).toFixed(2) : '',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Export cashflows as CSV string.
 * Optionally scoped to a single startup.
 */
export async function exportCashflowsCSV(investorId: string, startupId?: string): Promise<string> {
    const where: Record<string, string> = { investorId };
    if (startupId) where.startupId = startupId;

    const cashflows = await prisma.cashflow.findMany({
        where,
        include: { startup: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    const headers = [
        'Date', 'Startup', 'Type', 'Amount (₹)', 'Round', 'Notes', 'Currency',
    ];

    const rows = cashflows.map(cf => [
        new Date(cf.date).toISOString().split('T')[0],
        csvEscape(cf.startup?.name || ''),
        csvEscape(cf.type),
        (cf.amount / 100).toFixed(2),
        csvEscape(cf.roundName || ''),
        csvEscape(cf.notes || ''),
        cf.currency,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
}

function csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
