import { prisma } from '../db';

export type AlertType = 'CASH_ZERO' | 'RUNWAY_CRITICAL' | 'RUNWAY_WARNING' | 'REVENUE_DROP' | 'IRR_NEGATIVE' | 'MOIC_LOW' | 'UPDATE_OVERDUE';
export type AlertSeverity = 'RED' | 'YELLOW' | 'GREEN';
import { calculateRunway, calculateRevenueChangeMoM, calculateXIRR, calculateMOIC, calculateCurrentValue } from './financials.service';
import { logger } from '../utils/logger';
import { getIO } from '../socket';
import { sendReminderEmail } from './notification.service';

async function getOrCreateConfig(investorId: string) {
    let config = await prisma.alertConfiguration.findUnique({ where: { investorId } });
    if (!config) {
        config = await prisma.alertConfiguration.create({ data: { investorId } });
    }
    return config;
}

async function createAlertIfNew(params: {
    investorId: string;
    startupId: string;
    alertType: string;
    severity: string;
    message: string;
    details?: any;
}): Promise<boolean> {
    try {
        // Deduplication: don't create duplicate unread alerts
        const existing = await prisma.alert.findFirst({
            where: {
                startupId: params.startupId,
                alertType: params.alertType,
                isRead: false,
            }
        });
        if (existing) return false;

        const alert = await prisma.alert.create({
            data: {
                investorId: params.investorId,
                startupId: params.startupId,
                alertType: params.alertType,
                severity: params.severity,
                message: params.message,
                isRead: false,
                triggeredAt: new Date(),
            }
        });

        logger.info(`Alert created: ${params.alertType} for startup ${params.startupId}`);

        // Notify frontend
        getIO().to(`user_${params.investorId}`).emit('new_alert', alert);

        return true;
    } catch (error) {
        logger.error('Failed to create alert', error);
        return false;
    }
}

export async function runAlertEngine(investorId: string, startupId: string): Promise<void> {
    try {
        const config = await getOrCreateConfig(investorId);
        const startup = await prisma.startup.findUnique({ where: { id: startupId } });
        if (!startup || startup.status !== 'active') return;

        const name = startup.name;

        // 1. Check runway from latest monthly update
        const latestUpdate = await prisma.monthlyUpdate.findFirst({
            where: { startupId },
            orderBy: { month: 'desc' }
        });

        if (latestUpdate) {
            const runway = calculateRunway(latestUpdate.cashBalance, latestUpdate.burnRate);

            if (latestUpdate.cashBalance <= 0) {
                await createAlertIfNew({
                    investorId, startupId,
                    alertType: 'CASH_ZERO',
                    severity: 'RED',
                    message: `${name}: Cash balance is zero or negative — immediate action needed`,
                });
            } else if (runway < config.runwayCriticalMonths) {
                await createAlertIfNew({
                    investorId, startupId,
                    alertType: 'RUNWAY_CRITICAL',
                    severity: 'RED',
                    message: `${name}: Critical — runway is only ${runway} months`,
                });
            } else if (runway < config.runwayWarningMonths) {
                await createAlertIfNew({
                    investorId, startupId,
                    alertType: 'RUNWAY_WARNING',
                    severity: 'YELLOW',
                    message: `${name}: Runway dropping — ${runway} months remaining`,
                });
            }

            // 2. Check revenue drop MoM
            const previousUpdate = await prisma.monthlyUpdate.findFirst({
                where: {
                    startupId,
                    month: { lt: latestUpdate.month }
                },
                orderBy: { month: 'desc' }
            });

            if (previousUpdate) {
                const revChange = calculateRevenueChangeMoM(latestUpdate.revenue, previousUpdate.revenue);
                if (revChange !== null && revChange < 0 && Math.abs(revChange * 100) > config.revenueDropWarningPct) {
                    await createAlertIfNew({
                        investorId, startupId,
                        alertType: 'REVENUE_DROP',
                        severity: 'YELLOW',
                        message: `${name}: Revenue dropped ${Math.round(Math.abs(revChange * 100))}% vs last month`,
                    });
                }
            }
        }

        // 3. Check IRR
        const cashflows = await prisma.cashflow.findMany({
            where: { startupId },
            orderBy: { date: 'asc' }
        });
        const invested = cashflows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
        const currentValue = calculateCurrentValue(invested, startup.currentValuation, startup.entryValuation);

        const xirrCashflows = cashflows.map(cf => ({ amount: cf.amount, date: cf.date }));
        xirrCashflows.push({ amount: currentValue, date: new Date() });

        const xirr = calculateXIRR(xirrCashflows);
        if (xirr !== null && (xirr * 100) < config.irrNegativeThresholdPct) {
            await createAlertIfNew({
                investorId, startupId,
                alertType: 'IRR_NEGATIVE',
                severity: 'RED',
                message: `${name}: IRR has turned negative (${Math.round(xirr * 100)}%)`,
            });
        }

        // 4. Check MOIC
        const moic = calculateMOIC(invested, currentValue);
        if (moic < config.moicWarningThreshold && moic > 0) {
            await createAlertIfNew({
                investorId, startupId,
                alertType: 'MOIC_LOW',
                severity: 'YELLOW',
                message: `${name}: MOIC below threshold (${moic.toFixed(2)}x)`,
            });
        }
    } catch (error) {
        logger.error('Alert engine error:', error);
    }
}

export async function checkOverdueUpdates(investorId: string): Promise<void> {
    const config = await getOrCreateConfig(investorId);
    const activeStartups = await prisma.startup.findMany({
        where: { investorId, status: 'active' }
    });

    for (const startup of activeStartups) {
        const latestUpdate = await prisma.monthlyUpdate.findFirst({
            where: { startupId: startup.id },
            orderBy: { month: 'desc' }
        });

        let daysSince: number;
        if (latestUpdate) {
            daysSince = Math.floor((Date.now() - latestUpdate.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        } else {
            daysSince = Math.floor((Date.now() - startup.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (daysSince > config.updateOverdueDays) {
            const isNew = await createAlertIfNew({
                investorId: investorId,
                startupId: startup.id,
                alertType: 'UPDATE_OVERDUE',
                severity: 'YELLOW',
                message: `${startup.name}: No founder update received in ${daysSince} days`,
            });

            if (isNew) {
                const members = await prisma.companyMembership.findMany({
                    where: { startupId: startup.id },
                    include: { user: true }
                });

                for (const member of members) {
                    const user = member.user as any;
                    if (user.notificationPreference === 'IMMEDIATE') {
                        await sendReminderEmail(user.email, startup.name).catch(() => { });
                    }
                }
            }
        }
    }
}

export async function getAlerts(investorId: string, isRead?: boolean) {
    const filter: any = { investorId };
    if (isRead !== undefined) filter.isRead = isRead;

    const alerts = await prisma.alert.findMany({
        where: filter,
        include: { startup: { select: { id: true, name: true } } },
        orderBy: { triggeredAt: 'desc' }
    });

    return alerts.map(alert => {
        const { startup, ...rest } = alert;
        return {
            ...rest,
            startupId: startup ? { _id: startup.id, name: startup.name } : alert.startupId
        };
    });
}

export async function markAlertRead(investorId: string, alertId: string) {
    // Verify ownership
    const alert = await prisma.alert.findFirst({
        where: { id: alertId, investorId }
    });
    if (!alert) throw new Error('Alert not found');

    const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: { isRead: true, resolvedAt: new Date() }
    });

    return updatedAlert;
}

export async function markAllRead(investorId: string) {
    await prisma.alert.updateMany({
        where: { investorId, isRead: false },
        data: { isRead: true, resolvedAt: new Date() }
    });
    return { message: 'All alerts marked as read' };
}

export async function getAlertConfig(investorId: string) {
    return getOrCreateConfig(investorId);
}

export async function updateAlertConfig(investorId: string, data: Partial<{
    runwayWarningMonths: number;
    runwayCriticalMonths: number;
    revenueDropWarningPct: number;
    updateOverdueDays: number;
    irrNegativeThresholdPct: number;
    moicWarningThreshold: number;
}>) {
    const config = await getOrCreateConfig(investorId);

    const updatedConfig = await prisma.alertConfiguration.update({
        where: { id: config.id },
        data
    });

    return updatedConfig;
}
