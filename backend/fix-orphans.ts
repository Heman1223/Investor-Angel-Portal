import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrphanedDocuments() {
    try {
        console.log('Finding a valid startup to link to...');
        const firstStartup = await prisma.startup.findFirst();
        
        if (!firstStartup) {
            console.error('No startups found in database. Cannot fix orphaned documents.');
            return;
        }

        console.log(`Linking orphaned documents to startup: ${firstStartup.name} (${firstStartup.id})`);
        
        // Use executeRaw to bypass any Prisma client validation issues while fixing the data
        const count = await prisma.$executeRawUnsafe(
            `UPDATE "Document" SET "startupId" = $1 WHERE "startupId" IS NULL`,
            firstStartup.id
        );

        console.log(`Successfully fixed ${count} orphaned documents.`);
    } catch (error: any) {
        console.error('Failed to fix orphaned documents:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixOrphanedDocuments();
