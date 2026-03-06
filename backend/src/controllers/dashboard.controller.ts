import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getPortfolioAnalytics } from '../services/analytics.service';
import { prisma } from '../db';

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const investorId = req.investor!.id;
        const analytics = await getPortfolioAnalytics(investorId);

        // Best & worst performing startups (by MOIC for active startups)
        const activeMetrics = analytics.startupMetrics.filter(s => s.status === 'active');
        let bestPerformer = null;
        let worstPerformer = null;

        if (activeMetrics.length > 0) {
            const sorted = [...activeMetrics].sort((a, b) => b.moic - a.moic);
            bestPerformer = {
                name: sorted[0].name,
                sector: sorted[0].sector,
                startupId: sorted[0].startupId,
                moic: sorted[0].moic,
                xirr: sorted[0].xirr,
                invested: sorted[0].invested,
                currentValue: sorted[0].currentValue,
            };
            worstPerformer = {
                name: sorted[sorted.length - 1].name,
                sector: sorted[sorted.length - 1].sector,
                startupId: sorted[sorted.length - 1].startupId,
                moic: sorted[sorted.length - 1].moic,
                xirr: sorted[sorted.length - 1].xirr,
                invested: sorted[sorted.length - 1].invested,
                currentValue: sorted[sorted.length - 1].currentValue,
            };
        }

        // Recent activity (last 5 events from monthly updates, cashflows, documents)
        const [recentUpdates, recentCashflows, recentDocuments] = await Promise.all([
            prisma.monthlyUpdate.findMany({
                where: { startup: { investorId } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { startup: { select: { name: true } } },
            }),
            prisma.cashflow.findMany({
                where: { investorId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { startup: { select: { name: true } } },
            }),
            prisma.document.findMany({
                where: { investorId },
                orderBy: { uploadedAt: 'desc' },
                take: 5,
                include: { startup: { select: { name: true } } },
            }),
        ]);

        type ActivityItem = { type: string; date: Date; description: string; startupName: string };
        const activities: ActivityItem[] = [];

        for (const u of recentUpdates) {
            activities.push({
                type: 'update',
                date: u.createdAt,
                description: `Monthly update submitted for ${u.month}`,
                startupName: u.startup?.name || 'Unknown',
            });
        }
        for (const c of recentCashflows) {
            activities.push({
                type: c.type,
                date: c.createdAt,
                description: c.type === 'investment' ? `Investment recorded` : c.type === 'exit' ? `Exit recorded` : `Cashflow recorded`,
                startupName: c.startup?.name || 'Unknown',
            });
        }
        for (const doc of recentDocuments) {
            const documentType = doc.documentType || 'other';
            activities.push({
                type: 'document',
                date: doc.uploadedAt || new Date(),
                description: `${documentType.replace(/_/g, ' ')} uploaded: ${doc.fileName || 'Untitled'}`,
                startupName: doc.startup?.name || 'Unknown',
            });
        }

        activities.sort((a, b) => b.date.getTime() - a.date.getTime());
        const recentActivity = activities.slice(0, 5).map(a => ({
            ...a,
            date: a.date.toISOString(),
        }));

        res.json({
            success: true,
            data: {
                ...analytics,
                bestPerformer,
                worstPerformer,
                recentActivity,
            },
        });
    } catch (error) { next(error); }
}
