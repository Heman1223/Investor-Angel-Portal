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
            startupId: startup ? {
                _id: startup.id,
                name: startup.name
            } : null
        };
    });
}

export async function uploadDocument(
    investorId: string,
    startupId: string | null,
    file: Express.Multer.File,
    documentType: string,
    description?: string
) {
    // If startupId provided, validate it belongs to investor
    if (startupId) {
        const startup = await prisma.startup.findFirst({
            where: { id: startupId, investorId }
        });
        if (!startup) {
            throw createAppError('Startup not found', 404, 'NOT_FOUND');
        }
    }

    const folder = startupId || 'general';
    const fileKey = `${folder}/${uuidv4()}-${file.originalname}`;
    const filePath = path.join(UPLOAD_DIR, folder);

    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }

    fs.writeFileSync(path.join(filePath, `${uuidv4()}-${file.originalname}`), file.buffer);

    const createData: Record<string, unknown> = {
        investorId,
        fileName: file.originalname,
        fileKey,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        documentType,
        description,
        uploadedBy: investorId,
    };
    if (startupId) {
        createData.startupId = startupId;
    }

    const doc = await prisma.document.create({
        data: createData as any
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

export async function updateDocument(
    investorId: string,
    documentId: string,
    data: { fileName?: string; startupId?: string | null; documentType?: string }
) {
    const doc = await prisma.document.findFirst({
        where: { id: documentId, investorId }
    });
    if (!doc) {
        throw createAppError('Document not found', 404, 'NOT_FOUND');
    }

    // If re-linking to a startup, validate ownership
    if (data.startupId !== undefined && data.startupId !== null) {
        const startup = await prisma.startup.findFirst({
            where: { id: data.startupId, investorId }
        });
        if (!startup) {
            throw createAppError('Startup not found', 404, 'NOT_FOUND');
        }
    }

    const updateData: any = {};
    if (data.fileName !== undefined) updateData.fileName = data.fileName;
    if (data.startupId !== undefined) updateData.startupId = data.startupId;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;

    const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: updateData,
        include: { startup: { select: { id: true, name: true } } }
    });

    const { startup, ...rest } = updatedDoc;
    return {
        ...rest,
        startupId: startup ? { _id: startup.id, name: startup.name } : null
    };
}
