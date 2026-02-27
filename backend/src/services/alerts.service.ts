import { Alert, AlertType, AlertSeverity } from '../models/Alert';
import { AlertConfiguration } from '../models/AlertConfiguration';
import { MonthlyUpdate } from '../models/MonthlyUpdate';
import { Startup } from '../models/Startup';
import { Cashflow } from '../models/Cashflow';
import { calculateRunway, calculateRevenueChangeMoM, calculateXIRR, calculateMOIC, calculateCurrentValue } from './financials.service';
import { logger } from '../utils/logger';

async function getOrCreateConfig(investorId: string) {
    let config = await AlertConfiguration.findOne({ investorId });
    if (!config) {
        config = await AlertConfiguration.create({ investorId });
    }
    return config;
}

async function createAlertIfNew(params: {
    investorId: string;
    startupId: string;
    alertType: AlertType;
    severity: AlertSeverity;
    message: string;
}) {
    // Deduplication: don't create duplicate unread alerts
    const existing = await Alert.findOne({
        startupId: params.startupId,
        alertType: params.alertType,
        isRead: false,
    });
    if (existing) return;

    await Alert.create({
        investorId: params.investorId,
        startupId: params.startupId,
        alertType: params.alertType,
        severity: params.severity,
        message: params.message,
        isRead: false,
        triggeredAt: new Date(),
    });

    logger.info(`Alert created: ${params.alertType} for startup ${params.startupId}`);
}

export async function runAlertEngine(investorId: string, startupId: string): Promise<void> {
    try {
        const config = await getOrCreateConfig(investorId);
        const startup = await Startup.findById(startupId);
        if (!startup || startup.status !== 'active') return;

        const name = startup.name;

        // 1. Check runway from latest monthly update
        const latestUpdate = await MonthlyUpdate.findOne({ startupId }).sort({ month: -1 });
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
            const previousUpdate = await MonthlyUpdate.findOne({
                startupId,
                month: { $lt: latestUpdate.month },
            }).sort({ month: -1 });

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
        const cashflows = await Cashflow.find({ startupId }).sort({ date: 1 });
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
    const activeStartups = await Startup.find({ investorId, status: 'active' });

    for (const startup of activeStartups) {
        const latestUpdate = await MonthlyUpdate.findOne({ startupId: startup._id }).sort({ month: -1 });

        let daysSince: number;
        if (latestUpdate) {
            daysSince = Math.floor((Date.now() - latestUpdate.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        } else {
            daysSince = Math.floor((Date.now() - startup.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (daysSince > config.updateOverdueDays) {
            await createAlertIfNew({
                investorId: investorId.toString(),
                startupId: startup._id.toString(),
                alertType: 'UPDATE_OVERDUE',
                severity: 'YELLOW',
                message: `${startup.name}: No founder update received in ${daysSince} days`,
            });
        }
    }
}

export async function getAlerts(investorId: string, isRead?: boolean) {
    const filter: any = { investorId };
    if (isRead !== undefined) filter.isRead = isRead;
    return Alert.find(filter).populate('startupId', 'name').sort({ triggeredAt: -1 });
}

export async function markAlertRead(investorId: string, alertId: string) {
    const alert = await Alert.findOneAndUpdate(
        { _id: alertId, investorId },
        { isRead: true, resolvedAt: new Date() },
        { new: true }
    );
    if (!alert) throw new Error('Alert not found');
    return alert;
}

export async function markAllRead(investorId: string) {
    await Alert.updateMany(
        { investorId, isRead: false },
        { isRead: true, resolvedAt: new Date() }
    );
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
    Object.assign(config, data);
    await config.save();
    return config;
}
