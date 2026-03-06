import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log('Starting database cleanup...');

        // 1. Fix null documentType
        console.log('Fixing null documentType...');
        const typeCount = await prisma.$executeRawUnsafe(
            `UPDATE "Document" SET "documentType" = 'other' WHERE "documentType" IS NULL`
        );
        console.log(`Fixed ${typeCount} documents with null documentType.`);

        // 2. Fix null fileSizeBytes
        console.log('Fixing null fileSizeBytes...');
        const sizeCount = await prisma.$executeRawUnsafe(
            `UPDATE "Document" SET "fileSizeBytes" = 0 WHERE "fileSizeBytes" IS NULL`
        );
        console.log(`Fixed ${sizeCount} documents with null fileSizeBytes.`);

        // 3. Fix null mimeType
        console.log('Fixing null mimeType...');
        const mimeCount = await prisma.$executeRawUnsafe(
            `UPDATE "Document" SET "mimeType" = 'application/octet-stream' WHERE "mimeType" IS NULL`
        );
        console.log(`Fixed ${mimeCount} documents with null mimeType.`);
        
        // 4. Fix null fileName
        console.log('Fixing null fileName...');
        const nameCount = await prisma.$executeRawUnsafe(
            `UPDATE "Document" SET "fileName" = 'untitled' WHERE "fileName" IS NULL`
        );
        console.log(`Fixed ${nameCount} documents with null fileName.`);

        console.log('Cleanup complete.');
    } catch (error: any) {
        console.error('Cleanup failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
