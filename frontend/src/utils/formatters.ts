/**
 * PortfolioOS — Number Formatting Utility
 * All formatting lives here. Never format inline in components.
 * Inputs assume values are already converted from paise to rupees.
 */

/**
 * Compact currency for metric cards and chart axes (Indian system)
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 10000000) {
        return `${sign}₹${(absValue / 10000000).toFixed(2)}Cr`;
    }
    if (absValue >= 100000) {
        return `${sign}₹${(absValue / 100000).toFixed(1)}L`;
    }
    if (absValue >= 1000) {
        return `${sign}₹${absValue.toLocaleString('en-IN')}`;
    }
    return `${sign}₹${absValue.toFixed(0)}`;
}

/**
 * Full currency with Indian number system
 */
export function formatCurrencyFull(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';
    return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Format MOIC (Multiple on Invested Capital)
 */
export function formatMOIC(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';
    return `${value.toFixed(2)}x`;
}

/**
 * Format percentage (IRR, CAGR, revenue change)
 */
export function formatPercent(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';
    const pct = value * 100;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format runway in months
 */
export function formatRunway(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';
    if (value === Infinity) return 'No burn';
    if (value === 0) return '0 months';
    return `${value.toFixed(1)} months`;
}

/**
 * Format date
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format month (YYYY-MM to readable)
 */
export function formatMonth(month: string | null | undefined): string {
    if (!month) return '—';
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Convert paise to rupees
 */
export function paiseToRupees(paise: number): number {
    return paise / 100;
}

/**
 * Get color class based on MOIC value
 */
export function getMOICColor(moic: number | null): string {
    if (moic == null) return 'text-[var(--color-text-muted)]';
    if (moic >= 1) return 'text-[var(--color-green)]';
    if (moic >= 0.75) return 'text-[var(--color-yellow)]';
    return 'text-[var(--color-red)]';
}

/**
 * Get color class based on IRR value
 */
export function getIRRColor(irr: number | null): string {
    if (irr == null) return 'text-[var(--color-text-muted)]';
    if (irr > 0) return 'text-[var(--color-green)]';
    if (irr > -0.1) return 'text-[var(--color-yellow)]';
    return 'text-[var(--color-red)]';
}
