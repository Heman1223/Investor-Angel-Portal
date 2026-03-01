import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { getPortfolioAnalytics } from './analytics.service';
import { prisma } from '../db';
import { calculateRunway } from './financials.service';
import { logger } from '../utils/logger';

const GOLD = '#C5A454';
const NAVY = '#0B1221';
const CREAM = '#EDE5CC';
const MUTED = '#7A8098';

function formatINR(paise: number): string {
    const rupees = paise / 100;
    const abs = Math.abs(rupees);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
    return `₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatPercent(val: number | null): string {
    if (val == null) return '—';
    return `${(val * 100).toFixed(1)}%`;
}

function addPageHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
    doc.rect(0, 0, doc.page.width, 80).fill(NAVY);
    doc.fillColor(GOLD).fontSize(22).font('Helvetica-Bold').text(title, 40, 25, { lineBreak: false });
    doc.fillColor(CREAM).fontSize(10).font('Helvetica').text(subtitle, 40, 52, { lineBreak: false });
    doc.fillColor(MUTED).fontSize(9).text(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), doc.page.width - 200, 30, { align: 'right', width: 160 });
    doc.moveDown(2);
    doc.y = 100;
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text(title, 40, doc.y, { underline: false });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).lineWidth(0.5).strokeColor(GOLD).stroke();
    doc.moveDown(0.8);
}

function addMetricRow(doc: PDFKit.PDFDocument, label: string, value: string) {
    const y = doc.y;
    doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(label, 40, y, { width: 200 });
    doc.fillColor(CREAM).fontSize(10).font('Helvetica-Bold').text(value, 250, y, { width: 200 });
    doc.moveDown(0.6);
}

export async function generatePortfolioPDF(investorId: string): Promise<Buffer> {
    const analytics = await getPortfolioAnalytics(investorId);
    const investor = await prisma.investor.findUnique({ where: { id: investorId } });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.pipe(stream);

    // Page 1: Portfolio Summary
    addPageHeader(doc, 'Portfolio Report', `Prepared for ${investor?.name || 'Investor'}`);

    addSectionTitle(doc, 'Portfolio Overview');
    addMetricRow(doc, 'Total Invested', formatINR(analytics.totalInvested));
    addMetricRow(doc, 'Current Portfolio Value', formatINR(analytics.currentPortfolioValue));
    addMetricRow(doc, 'Unrealised Gain', formatINR(analytics.unrealisedGain));
    addMetricRow(doc, 'Portfolio MOIC', `${(analytics.portfolioMOIC ?? 0).toFixed(2)}x`);
    addMetricRow(doc, 'Portfolio IRR', formatPercent(analytics.portfolioXIRR));
    addMetricRow(doc, 'TVPI', (analytics.portfolioTVPI ?? 0).toFixed(2));
    addMetricRow(doc, 'Active Startups', `${analytics.activeCount}`);
    addMetricRow(doc, 'Exited Startups', `${analytics.exitedCount}`);

    doc.moveDown(1);

    // Sector Allocation
    addSectionTitle(doc, 'Sector Allocation');
    for (const sector of analytics.sectorAllocation) {
        addMetricRow(doc, sector.sector, `${formatINR(sector.invested)} invested · ${formatINR(sector.currentValue)} value · ${sector.avgMOIC.toFixed(2)}x MOIC`);
    }

    if (analytics.bestSector) {
        doc.moveDown(0.3);
        addMetricRow(doc, 'Best Sector', `${analytics.bestSector.sector} (${analytics.bestSector.avgMOIC.toFixed(2)}x)`);
    }
    if (analytics.worstSector) {
        addMetricRow(doc, 'Weakest Sector', `${analytics.worstSector.sector} (${analytics.worstSector.avgMOIC.toFixed(2)}x)`);
    }

    doc.moveDown(1);

    // Startup Metrics Table
    addSectionTitle(doc, 'Startup Performance');

    // Table header
    const tableTop = doc.y;
    const colX = [40, 170, 260, 340, 420, 490];
    const headers = ['Startup', 'Invested', 'Value', 'MOIC', 'IRR', 'Status'];
    doc.fillColor(GOLD).fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: 80, lineBreak: false }));
    doc.moveDown(0.8);

    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).lineWidth(0.3).strokeColor(MUTED).stroke();
    doc.moveDown(0.4);

    // Table rows
    for (const sm of analytics.startupMetrics) {
        if (doc.y > doc.page.height - 80) {
            doc.addPage();
            addPageHeader(doc, 'Portfolio Report', 'Startup Performance (continued)');
        }
        const rowY = doc.y;
        doc.fillColor(CREAM).fontSize(9).font('Helvetica-Bold').text(sm.name, colX[0], rowY, { width: 120, lineBreak: false });
        doc.font('Helvetica').text(formatINR(sm.invested), colX[1], rowY, { width: 80, lineBreak: false });
        doc.text(formatINR(sm.currentValue), colX[2], rowY, { width: 80, lineBreak: false });
        doc.text(`${(sm.moic ?? 0).toFixed(2)}x`, colX[3], rowY, { width: 60, lineBreak: false });
        doc.text(formatPercent(sm.xirr), colX[4], rowY, { width: 60, lineBreak: false });
        doc.text(sm.status, colX[5], rowY, { width: 60, lineBreak: false });
        doc.moveDown(0.6);
    }

    // Footer
    doc.moveDown(2);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(
        'This report is auto-generated by Meridian Capital Partners. Confidential — for internal use only.',
        40, doc.y, { width: doc.page.width - 80, align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

export async function generateStartupPDF(investorId: string, startupId: string): Promise<Buffer> {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId },
        include: {
            monthlyUpdates: { orderBy: { month: 'desc' }, take: 6 },
            cashflows: { orderBy: { date: 'asc' } },
            documents: { orderBy: { uploadedAt: 'desc' }, take: 10 },
        },
    });

    if (!startup) throw new Error('Startup not found');

    const investor = await prisma.investor.findUnique({ where: { id: investorId } });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.pipe(stream);

    addPageHeader(doc, startup.name, `Investment Report · ${startup.sector} · ${startup.stage}`);

    // Company overview
    addSectionTitle(doc, 'Investment Summary');
    addMetricRow(doc, 'Investment Date', new Date(startup.investmentDate).toLocaleDateString('en-IN'));
    addMetricRow(doc, 'Entry Valuation', formatINR(startup.entryValuation));
    addMetricRow(doc, 'Current Valuation', formatINR(startup.currentValuation));
    addMetricRow(doc, 'Equity %', `${startup.currentEquityPercent.toFixed(2)}%`);
    addMetricRow(doc, 'Stage', startup.stage);
    addMetricRow(doc, 'Status', startup.status);
    if (startup.founderName) addMetricRow(doc, 'Founder', startup.founderName);
    if (startup.website) addMetricRow(doc, 'Website', startup.website);
    if (startup.coInvestors) addMetricRow(doc, 'Co-Investors', startup.coInvestors);

    doc.moveDown(1);

    // Cashflow history
    if (startup.cashflows.length > 0) {
        addSectionTitle(doc, 'Cash Flows');
        for (const cf of startup.cashflows) {
            addMetricRow(doc, new Date(cf.date).toLocaleDateString('en-IN'), `${cf.amount < 0 ? '(-) ' : '(+) '}${formatINR(Math.abs(cf.amount))} — ${cf.notes || cf.roundName || 'N/A'}`);
        }
        doc.moveDown(1);
    }

    // Monthly updates
    if (startup.monthlyUpdates.length > 0) {
        addSectionTitle(doc, 'Recent Monthly Updates');
        for (const mu of startup.monthlyUpdates) {
            const runway = calculateRunway(mu.cashBalance, mu.burnRate);
            const runwayStr = runway >= 999 ? '∞' : `${runway.toFixed(1)}`;
            addMetricRow(doc, mu.month, `Revenue: ${formatINR(mu.revenue)} | Burn: ${formatINR(mu.burnRate)} | Cash: ${formatINR(mu.cashBalance)} | Runway: ${runwayStr}mo`);
        }
        doc.moveDown(1);
    }

    // Documents
    if (startup.documents.length > 0) {
        addSectionTitle(doc, 'Documents on File');
        for (const docu of startup.documents) {
            addMetricRow(doc, docu.fileName, `${docu.documentType} · ${new Date(docu.uploadedAt).toLocaleDateString('en-IN')}`);
        }
    }

    // Footer
    doc.moveDown(2);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(
        `Report prepared for ${investor?.name || 'Investor'} by Meridian Capital Partners. Confidential.`,
        40, doc.y, { width: doc.page.width - 80, align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
