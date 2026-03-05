import { z } from 'zod';

export const createStartupSchema = z.object({
    name: z.string().min(1, 'Startup name is required').trim(),
    sector: z.string().min(1, 'Sector is required'),
    stage: z.enum(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO']),
    investmentDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
    entryValuation: z.number().positive('Entry valuation must be positive'),
    investedAmount: z.number().positive('Invested amount must be positive'),
    equityPercent: z.number().min(0).max(100),
    description: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    founderName: z.string().optional(),
    founderEmail: z.string().email().optional().or(z.literal('')),
    coInvestors: z.string().optional(),
});

export const updateStartupSchema = z.object({
    name: z.string().min(1).trim().optional(),
    sector: z.string().min(1).optional(),
    stage: z.enum(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO']).optional(),
    investmentDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date').optional(),
    description: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    founderName: z.string().optional(),
    founderEmail: z.string().email().optional().or(z.literal('')),
    coInvestors: z.string().optional(),
});

export const exitStartupSchema = z.object({
    exitDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
    exitValue: z.number().min(0, 'Exit value must be non-negative'),
    exitType: z.string().min(1, 'Exit type is required'),
});

export const followOnSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    date: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
    roundName: z.string().min(1, 'Round name is required'),
    equityAcquired: z.number().min(0).max(100),
    valuationAtTime: z.number().positive('Valuation must be positive'),
});

export const updateValuationSchema = z.object({
    currentValuation: z.number().positive('Valuation must be positive'),
});

export const monthlyUpdateSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    revenue: z.number().min(0, 'Revenue must be non-negative'),
    burnRate: z.number().min(0, 'Burn rate must be non-negative'),
    cashBalance: z.number(),
    valuationUpdate: z.number().positive().optional(),
    notes: z.string().max(1000).optional(),
    headcount: z.number().int().min(0).optional(),
    keyWins: z.string().max(2000).optional(),
    keyChallenges: z.string().max(2000).optional(),
    helpNeeded: z.string().max(2000).optional(),
});

export const alertConfigSchema = z.object({
    runwayWarningMonths: z.number().min(0).optional(),
    runwayCriticalMonths: z.number().min(0).optional(),
    revenueDropWarningPct: z.number().min(0).max(100).optional(),
    updateOverdueDays: z.number().min(1).optional(),
    irrNegativeThresholdPct: z.number().optional(),
    moicWarningThreshold: z.number().min(0).optional(),
});

// ── Cashflow ledger schemas ──

export const addCashflowSchema = z.object({
    amount: z.number(),
    date: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
    type: z.enum(['investment', 'follow_on', 'exit', 'correction']),
    roundName: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    reason: z.string().max(500).optional(),
});

export const updateCashflowSchema = z.object({
    amount: z.number().optional(),
    date: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date').optional(),
    type: z.enum(['investment', 'follow_on', 'exit', 'correction']).optional(),
    roundName: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
    reason: z.string().min(1, 'Reason is required for audit trail').max(500),
});

export const deleteCashflowSchema = z.object({
    reason: z.string().min(1, 'Reason is required for audit trail').max(500),
});
