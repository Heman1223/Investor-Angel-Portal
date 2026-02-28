import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function getDocuments(investorId: string, startupId: string) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    return prisma.document.findMany({
        where: { startupId, isArchived: false },
        orderBy: { uploadedAt: 'desc' }
    });
}

export async function getAllDocuments(investorId: string) {
    const docs = await prisma.document.findMany({
        where: { investorId, isArchived: false },
        include: { startup: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: 'desc' }
    });

    return docs.map(doc => {
        const { startup, ...rest } = doc;
        return {
            ...rest,
            // Replicate Mongoose `.populate('startupId', 'name')` behavior
            startupId: startup ? {
                _id: startup.id,
                name: startup.name
            } : doc.startupId
        };
    });
}

export async function uploadDocument(
    investorId: string,
    startupId: string,
    file: Express.Multer.File,
    documentType: string,
    description?: string
) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const fileKey = `${startupId}/${uuidv4()}-${file.originalname}`;
    const filePath = path.join(UPLOAD_DIR, startupId.toString());

    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }

    fs.writeFileSync(path.join(filePath, `${uuidv4()}-${file.originalname}`), file.buffer);

    const doc = await prisma.document.create({
        data: {
            startupId,
            investorId,
            fileName: file.originalname,
            fileKey,
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            documentType,
            description,
            uploadedBy: investorId,
        }
    });

    return doc;
}

export async function getDownloadUrl(investorId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
        where: { id: documentId, investorId, isArchived: false }
    });
    if (!doc) {
        throw createAppError('Document not found', 404, 'NOT_FOUND');
    }

    // In production, generate a signed S3 URL. For dev, return the file path.
    return {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        downloadUrl: `/api/documents/${documentId}/file`,
        expiresIn: '15 minutes',
    };
}

export async function archiveDocument(investorId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
        where: { id: documentId, investorId }
    });
    if (!doc) {
        throw createAppError('Document not found', 404, 'NOT_FOUND');
    }

    const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: { isArchived: true }
    });

    return updatedDoc;
}
