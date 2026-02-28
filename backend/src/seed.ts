import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { prisma, connectDB } from './db';
import { calculateRunway } from './services/financials.service';

const SALT_ROUNDS = 12;

// Convert rupees to paise
function toPaise(rupees: number): number {
    return Math.round(rupees * 100);
}

// Convert lakhs to paise
function lakhsToPaise(lakhs: number): number {
    return toPaise(lakhs * 100000);
}

// Convert crores to paise
function croresToPaise(crores: number): number {
    return toPaise(crores * 10000000);
}

async function seed() {
    if (process.env.NODE_ENV === 'production') {
        console.error('Seed script cannot run in production!');
        process.exit(1);
    }

    await connectDB();
    console.log('Connected to Database. Clearing existing data...');

    // Wipe all tables in order of dependency
    await prisma.auditLog.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.alertConfiguration.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.monthlyUpdate.deleteMany({});
    await prisma.dilutionEvent.deleteMany({});
    await prisma.cashflow.deleteMany({});
    await prisma.startup.deleteMany({});
    await prisma.investor.deleteMany({});

    console.log('✅ All existing data cleared.');

    // 1. Create demo investor
    const passwordHash = await bcrypt.hash('Demo@2024', SALT_ROUNDS);
    const investor = await prisma.investor.create({
        data: {
            name: 'Arjun Mehta',
            email: 'investor@portfolioos.com',
            passwordHash,
            role: 'investor',
            subscriptionTier: 'solo',
            twoFactorEnabled: false,
        }
    });
    console.log('✅ Demo investor created: investor@portfolioos.com / Demo@2024');

    const investorId = investor.id;

    // 2. Create 5 startup investments
    const startupsData = [
        {
            name: 'Finly',
            sector: 'FinTech',
            stage: 'Series A',
            status: 'active',
            invested: lakhsToPaise(50),
            entryValuation: lakhsToPaise(80),
            currentValuation: croresToPaise(2.2),
            equityPercent: 8.5,
            investmentDate: new Date('2023-03-15'),
            founderName: 'Ravi Kumar',
            founderEmail: 'ravi@finly.in',
            description: 'Digital-first personal finance platform for millennials',
            website: 'https://finly.in',
        },
        {
            name: 'HealthNode',
            sector: 'HealthTech',
            stage: 'Seed',
            status: 'active',
            invested: lakhsToPaise(30),
            entryValuation: croresToPaise(3),
            currentValuation: lakhsToPaise(95),
            equityPercent: 4.2,
            investmentDate: new Date('2023-06-20'),
            founderName: 'Priya Sharma',
            founderEmail: 'priya@healthnode.io',
            description: 'AI-powered diagnostic assistance for rural clinics',
            website: 'https://healthnode.io',
        },
        {
            name: 'EduStack',
            sector: 'EdTech',
            stage: 'Pre-Seed',
            status: 'active',
            invested: lakhsToPaise(15),
            entryValuation: croresToPaise(1.5),
            currentValuation: croresToPaise(1.2),
            equityPercent: 5.0,
            investmentDate: new Date('2023-09-10'),
            founderName: 'Arun Patel',
            founderEmail: 'arun@edustack.in',
            description: 'Adaptive learning platform for tier-2/3 city students',
        },
        {
            name: 'GreenLoop',
            sector: 'CleanTech',
            stage: 'Seed',
            status: 'exited',
            invested: lakhsToPaise(20),
            entryValuation: croresToPaise(2),
            currentValuation: croresToPaise(2),
            equityPercent: 6.0,
            investmentDate: new Date('2022-11-01'),
            founderName: 'Meera Desai',
            founderEmail: 'meera@greenloop.co',
            description: 'Circular economy platform for industrial waste recycling',
        },
        {
            name: 'CropMind',
            sector: 'AgriTech',
            stage: 'Pre-Seed',
            status: 'active',
            invested: lakhsToPaise(10),
            entryValuation: croresToPaise(1),
            currentValuation: lakhsToPaise(95),
            equityPercent: 3.5,
            investmentDate: new Date('2024-01-05'),
            founderName: 'Vikram Singh',
            founderEmail: 'vikram@cropmind.ai',
            description: 'AI crop disease detection from satellite imagery',
            website: 'https://cropmind.ai',
        },
    ];

    const startups = [];
    for (const sd of startupsData) {
        const startup = await prisma.startup.create({
            data: {
                investorId,
                name: sd.name,
                sector: sd.sector,
                stage: sd.stage,
                status: sd.status,
                entryValuation: sd.entryValuation,
                currentValuation: sd.currentValuation,
                equityPercent: sd.equityPercent,
                currentEquityPercent: sd.equityPercent,
                investmentDate: sd.investmentDate,
                description: sd.description,
                website: sd.website,
                founderName: sd.founderName,
                founderEmail: sd.founderEmail,
            }
        });

        // Create initial investment cashflow
        await prisma.cashflow.create({
            data: {
                investorId,
                startupId: startup.id,
                amount: -sd.invested,
                date: sd.investmentDate,
                type: 'investment',
                roundName: 'Initial Investment',
                valuationAtTime: sd.entryValuation,
                equityAcquired: sd.equityPercent,
                currency: 'INR',
                notes: `Initial investment in ${sd.name}`,
                createdBy: investorId,
            }
        });

        startups.push(startup);
        console.log(`✅ Created startup: ${sd.name} (${sd.status})`);
    }

    // 3. Create exit cashflow for GreenLoop
    const greenLoop = startups[3];
    await prisma.cashflow.create({
        data: {
            investorId,
            startupId: greenLoop.id,
            amount: lakhsToPaise(58),
            date: new Date('2024-08-15'),
            type: 'exit',
            roundName: 'Acquisition by WasteWorks',
            currency: 'INR',
            notes: 'Exited via acquisition',
            createdBy: investorId,
        }
    });
    console.log('✅ Created exit cashflow for GreenLoop');

    // 4. Seed 3 months of updates per active startup
    const activeStartups = startups.filter(s => s.status === 'active');
    const months = ['2024-10', '2024-11', '2024-12'];

    for (const startup of activeStartups) {
        let baseRevenue: number;
        let baseBurn: number;
        let baseCash: number;

        // Set base values per startup
        switch (startup.name) {
            case 'Finly':
                baseRevenue = lakhsToPaise(12);
                baseBurn = lakhsToPaise(8);
                baseCash = lakhsToPaise(45);
                break;
            case 'HealthNode':
                baseRevenue = lakhsToPaise(3);
                baseBurn = lakhsToPaise(5);
                baseCash = lakhsToPaise(12);
                break;
            case 'EduStack':
                baseRevenue = lakhsToPaise(5);
                baseBurn = lakhsToPaise(4);
                baseCash = lakhsToPaise(30);
                break;
            case 'CropMind':
                baseRevenue = lakhsToPaise(2);
                baseBurn = lakhsToPaise(3);
                baseCash = lakhsToPaise(25);
                break;
            default:
                baseRevenue = lakhsToPaise(5);
                baseBurn = lakhsToPaise(4);
                baseCash = lakhsToPaise(20);
        }

        for (let i = 0; i < months.length; i++) {
            const revenue = Math.round(baseRevenue * (1 + (i * 0.1)));
            const burnRate = baseBurn;
            const cashBalance = Math.round(baseCash - (burnRate * i));
            const runway = calculateRunway(cashBalance, burnRate);

            await prisma.monthlyUpdate.create({
                data: {
                    startupId: startup.id,
                    submittedBy: investorId,
                    month: months[i],
                    revenue,
                    burnRate,
                    cashBalance,
                    runwayMonths: runway,
                }
            });
        }
        console.log(`✅ Created 3 monthly updates for ${startup.name}`);
    }

    // 5. Create AlertConfiguration with defaults
    await prisma.alertConfiguration.create({ data: { investorId } });
    console.log('✅ Created default alert configuration');

    // 6. Trigger alerts — HealthNode should have RUNWAY_WARNING
    const healthNode = startups[1];
    await prisma.alert.create({
        data: {
            investorId,
            startupId: healthNode.id,
            alertType: 'RUNWAY_CRITICAL',
            severity: 'RED',
            message: `HealthNode: Critical — runway is only 0.4 months`,
            isRead: false,
            triggeredAt: new Date(),
        }
    });
    await prisma.alert.create({
        data: {
            investorId,
            startupId: healthNode.id,
            alertType: 'RUNWAY_WARNING',
            severity: 'YELLOW',
            message: `HealthNode: Runway dropping — 0.4 months remaining`,
            isRead: false,
            triggeredAt: new Date(),
        }
    });
    console.log('✅ Created RUNWAY_WARNING and RUNWAY_CRITICAL alerts for HealthNode');

    // 7. Create sample documents
    const docTypes = ['sha', 'term_sheet', 'cap_table', 'financial_statement'] as const;
    for (let i = 0; i < startups.length; i++) {
        const startup = startups[i];
        const numDocs = i < 2 ? 2 : 1;
        for (let j = 0; j < numDocs; j++) {
            await prisma.document.create({
                data: {
                    startupId: startup.id,
                    investorId,
                    fileName: `${startup.name.toLowerCase()}_${docTypes[j % docTypes.length]}.pdf`,
                    fileKey: `${startup.id}/${docTypes[j % docTypes.length]}_${Date.now()}.pdf`,
                    fileSizeBytes: Math.round(Math.random() * 500000 + 50000),
                    mimeType: 'application/pdf',
                    documentType: docTypes[j % docTypes.length],
                    description: `${docTypes[j % docTypes.length].replace('_', ' ')} for ${startup.name}`,
                    uploadedBy: investorId,
                }
            });
        }
        console.log(`✅ Created ${numDocs} document(s) for ${startup.name}`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('📧 Login: investor@portfolioos.com');
    console.log('🔑 Password: Demo@2024\n');

    await prisma.$disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
