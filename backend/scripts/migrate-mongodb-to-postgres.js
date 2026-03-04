"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const Investor_1 = require("../src/models/Investor");
const Startup_1 = require("../src/models/Startup");
const MonthlyUpdate_1 = require("../src/models/MonthlyUpdate");
const Cashflow_1 = require("../src/models/Cashflow");
const DilutionEvent_1 = require("../src/models/DilutionEvent");
const Document_1 = require("../src/models/Document");
const Alert_1 = require("../src/models/Alert");
const AlertConfiguration_1 = require("../src/models/AlertConfiguration");
const AuditLog_1 = require("../src/models/AuditLog");
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolioos';
async function migrateData() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');
    console.log('🔗 Connecting to PostgreSQL via Prisma...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL.');
    console.log('🗑️ Wiping existing PostgreSQL data (to prevent duplicates)...');
    await prisma.auditLog.deleteMany();
    await prisma.alertConfiguration.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.document.deleteMany();
    await prisma.dilutionEvent.deleteMany();
    await prisma.cashflow.deleteMany();
    await prisma.monthlyUpdate.deleteMany();
    await prisma.startup.deleteMany();
    await prisma.investor.deleteMany();
    console.log('✅ PostgreSQL tables clean.');
    try {
        // 1. Migrate Investors
        console.log('🚀 Migrating Investors...');
        const investors = await Investor_1.Investor.find().lean();
        for (const i of investors) {
            await prisma.investor.create({
                data: {
                    id: i._id.toString(),
                    name: i.name,
                    email: i.email,
                    passwordHash: i.passwordHash,
                    role: i.role || 'investor',
                    subscriptionTier: i.subscriptionTier || 'solo',
                    twoFactorSecret: i.twoFactorSecret,
                    twoFactorEnabled: !!i.twoFactorEnabled,
                    lastLoginAt: i.lastLoginAt,
                    passwordResetToken: i.passwordResetToken,
                    passwordResetExpires: i.passwordResetExpires,
                    createdAt: i.createdAt || new Date(),
                    updatedAt: i.updatedAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${investors.length} Investors`);
        // 2. Migrate Startups
        console.log('🚀 Migrating Startups...');
        const startups = await Startup_1.Startup.find().lean();
        for (const s of startups) {
            await prisma.startup.create({
                data: {
                    id: s._id.toString(),
                    investorId: s.investorId.toString(),
                    name: s.name,
                    sector: s.sector,
                    stage: s.stage,
                    status: s.status || 'active',
                    entryValuation: s.entryValuation,
                    currentValuation: s.currentValuation,
                    equityPercent: s.equityPercent,
                    currentEquityPercent: s.currentEquityPercent,
                    investmentDate: s.investmentDate,
                    description: s.description,
                    website: s.website,
                    founderName: s.founderName,
                    founderEmail: s.founderEmail,
                    createdAt: s.createdAt || new Date(),
                    updatedAt: s.updatedAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${startups.length} Startups`);
        // 3. Migrate MonthlyUpdates
        console.log('🚀 Migrating MonthlyUpdates...');
        const updates = await MonthlyUpdate_1.MonthlyUpdate.find().lean();
        for (const u of updates) {
            await prisma.monthlyUpdate.create({
                data: {
                    id: u._id.toString(),
                    startupId: u.startupId.toString(),
                    submittedBy: u.submittedBy.toString(),
                    month: u.month,
                    revenue: u.revenue,
                    burnRate: u.burnRate,
                    cashBalance: u.cashBalance,
                    runwayMonths: u.runwayMonths,
                    valuationUpdate: u.valuationUpdate,
                    notes: u.notes,
                    createdAt: u.createdAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${updates.length} MonthlyUpdates`);
        // 4. Migrate Cashflows
        console.log('🚀 Migrating Cashflows...');
        const cashflows = await Cashflow_1.Cashflow.find().lean();
        for (const c of cashflows) {
            await prisma.cashflow.create({
                data: {
                    id: c._id.toString(),
                    investorId: c.investorId.toString(),
                    startupId: c.startupId.toString(),
                    amount: c.amount,
                    date: c.date,
                    type: c.type,
                    roundName: c.roundName,
                    valuationAtTime: c.valuationAtTime,
                    equityAcquired: c.equityAcquired,
                    currency: c.currency || 'INR',
                    notes: c.notes,
                    createdBy: c.createdBy.toString(),
                    createdAt: c.createdAt || new Date(),
                    updatedAt: c.updatedAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${cashflows.length} Cashflows`);
        // 5. Migrate DilutionEvents
        console.log('🚀 Migrating DilutionEvents...');
        const dilutionEvents = await DilutionEvent_1.DilutionEvent.find().lean();
        for (const d of dilutionEvents) {
            await prisma.dilutionEvent.create({
                data: {
                    id: d._id.toString(),
                    startupId: d.startupId.toString(),
                    investorId: d.investorId.toString(),
                    roundName: d.roundName,
                    date: d.date,
                    preDilutionEquity: d.preDilutionEquity,
                    postDilutionEquity: d.postDilutionEquity,
                    newInvestor: d.newInvestor,
                    roundValuation: d.roundValuation,
                    notes: d.notes,
                    createdAt: d.createdAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${dilutionEvents.length} DilutionEvents`);
        // 6. Migrate Documents
        console.log('🚀 Migrating Documents...');
        const documents = await Document_1.DocumentModel.find().lean();
        for (const d of documents) {
            await prisma.document.create({
                data: {
                    id: d._id.toString(),
                    startupId: d.startupId.toString(),
                    investorId: d.investorId.toString(),
                    fileName: d.fileName,
                    fileKey: d.fileKey,
                    fileSizeBytes: d.fileSizeBytes,
                    mimeType: d.mimeType,
                    documentType: d.documentType,
                    description: d.description,
                    uploadedBy: d.uploadedBy.toString(),
                    isArchived: !!d.isArchived,
                    uploadedAt: d.uploadedAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${documents.length} Documents`);
        // 7. Migrate Alerts
        console.log('🚀 Migrating Alerts...');
        const alerts = await Alert_1.Alert.find().lean();
        for (const a of alerts) {
            await prisma.alert.create({
                data: {
                    id: a._id.toString(),
                    investorId: a.investorId.toString(),
                    startupId: a.startupId.toString(),
                    alertType: a.alertType,
                    severity: a.severity,
                    message: a.message,
                    isRead: !!a.isRead,
                    triggeredAt: a.triggeredAt || new Date(),
                    resolvedAt: a.resolvedAt,
                }
            });
        }
        console.log(`✅ Migrated ${alerts.length} Alerts`);
        // 8. Migrate AlertConfigurations
        console.log('🚀 Migrating AlertConfigurations...');
        const alertConfigs = await AlertConfiguration_1.AlertConfiguration.find().lean();
        for (const ac of alertConfigs) {
            await prisma.alertConfiguration.create({
                data: {
                    id: ac._id.toString(),
                    investorId: ac.investorId.toString(),
                    runwayWarningMonths: ac.runwayWarningMonths,
                    runwayCriticalMonths: ac.runwayCriticalMonths,
                    revenueDropWarningPct: ac.revenueDropWarningPct,
                    updateOverdueDays: ac.updateOverdueDays,
                    irrNegativeThresholdPct: ac.irrNegativeThresholdPct,
                    moicWarningThreshold: ac.moicWarningThreshold,
                    updatedAt: ac.updatedAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${alertConfigs.length} AlertConfigurations`);
        // 9. Migrate AuditLogs
        console.log('🚀 Migrating AuditLogs...');
        const auditLogs = await AuditLog_1.AuditLog.find().lean();
        for (const al of auditLogs) {
            await prisma.auditLog.create({
                data: {
                    id: al._id.toString(),
                    investorId: al.investorId.toString(),
                    action: al.action,
                    entityType: al.entityType,
                    entityId: al.entityId,
                    oldValue: al.oldValue ? al.oldValue : null,
                    newValue: al.newValue ? al.newValue : null,
                    ipAddress: al.ipAddress,
                    userAgent: al.userAgent,
                    createdAt: al.createdAt || new Date(),
                }
            });
        }
        console.log(`✅ Migrated ${auditLogs.length} AuditLogs`);
        console.log('🎉 Postgres Migration completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        await prisma.$disconnect();
    }
}
migrateData();
