import { PrismaClient } from '@prisma/client';
import * as docService from './src/services/documents.service';

const prisma = new PrismaClient();
async function main() {
    console.log("Starting test...");
    const investor = await prisma.investor.findFirst();
    if (!investor) return console.log("No investor");
    
    const fakeFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('hello world'),
        mimetype: 'application/pdf',
        size: 11
    } as any;
    
    const doc = await docService.uploadDocument(investor.id, null, fakeFile, 'other', 'Test');
    console.log("Uploaded successfully:", doc.id, "to key:", doc.fileKey);
    
    try {
        const result = await docService.getFile(investor.id, doc.id);
        console.log("File downloaded from disk successfully, content size:", result.buffer.length, "bytes.");
    } catch (e: any) {
        console.error("Download failed:", e.message);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
