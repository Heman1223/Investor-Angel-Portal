import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';

// ── Cloudinary Configuration ──────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_FOLDER_PREFIX = 'angel-portal/';

/**
 * Upload a buffer to Cloudinary.
 * Uses `resource_type: 'raw'` so PDFs, docs, spreadsheets etc. are accepted.
 * Returns { public_id, secure_url }.
 */
function uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    publicId: string
): Promise<{ public_id: string; secure_url: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                folder: `angel-portal/${folder}`,
                public_id: publicId,
                overwrite: true,
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Cloudinary returned empty result'));
                resolve({ public_id: result.public_id, secure_url: result.secure_url });
            }
        );
        stream.end(buffer);
    });
}

/**
 * Check if a fileKey is a Cloudinary public_id (vs a local file path).
 */
function isCloudinaryKey(fileKey: string): boolean {
    return fileKey.startsWith(CLOUDINARY_FOLDER_PREFIX);
}

/**
 * Build a Cloudinary raw delivery URL from a public_id.
 */
function buildCloudinaryUrl(publicId: string): string {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${publicId}`;
}

// ── Service Functions ─────────────────────────────────────────

export async function getDocuments(investorId: string, startupId: string) {
    const startup = await prisma.startup.findFirst({
        where: { id: startupId, investorId }
    });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const docs = await prisma.document.findMany({
        where: { startupId, isArchived: false },
        orderBy: { uploadedAt: 'desc' }
    });
    return docs.map(doc => ({
        ...doc,
        uploadedAt: doc.uploadedAt?.toISOString() || null
    }));
}

export async function getAllDocuments(investorId: string) {
    const docs = await prisma.document.findMany({
        where: { investorId, isArchived: false },
        include: { startup: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: 'desc' }
    });

    return docs.map(doc => {
        const { startup, uploadedAt, createdAt, updatedAt, ...rest } = doc as any;
        return {
            ...rest,
            uploadedAt: uploadedAt?.toISOString() || null,
            startupId: startup ? {
                id: startup.id,
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
    const uniqueId = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to Cloudinary
    const { public_id } = await uploadToCloudinary(
        file.buffer,
        folder,
        uniqueId
    );

    // Store Cloudinary public_id as fileKey (no fileUrl column needed)
    const createData: Record<string, unknown> = {
        investorId,
        fileName: file.originalname,
        fileKey: public_id,
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

    // If fileKey is a Cloudinary public_id, build URL from it
    if (isCloudinaryKey(doc.fileKey)) {
        return {
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            downloadUrl: buildCloudinaryUrl(doc.fileKey),
            expiresIn: 'permanent',
        };
    }

    // Fallback for legacy local-disk docs
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

    // Delete from Cloudinary if it's a cloud-stored file (best-effort)
    if (isCloudinaryKey(doc.fileKey)) {
        try {
            await cloudinary.uploader.destroy(doc.fileKey, { resource_type: 'raw' });
        } catch (e) {
            console.warn(`[Cloudinary] Failed to delete ${doc.fileKey}:`, e);
        }
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

export async function getFile(investorId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
        where: { id: documentId, investorId }
    });
    if (!doc) {
        throw createAppError('Document not found', 404, 'NOT_FOUND');
    }

    // If fileKey is a Cloudinary public_id, fetch from Cloudinary
    if (isCloudinaryKey(doc.fileKey)) {
        const cloudUrl = buildCloudinaryUrl(doc.fileKey);
        const response = await fetch(cloudUrl);
        if (!response.ok) {
            throw createAppError('Failed to fetch file from cloud storage', 502, 'CLOUD_FETCH_ERROR');
        }
        const arrayBuffer = await response.arrayBuffer();
        return {
            buffer: Buffer.from(arrayBuffer),
            fileName: doc.fileName,
            mimeType: doc.mimeType
        };
    }

    // Fallback for legacy local-disk files
    const path = await import('path');
    const fs = await import('fs');
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(UPLOAD_DIR, doc.fileKey);
    if (!fs.existsSync(filePath)) {
        throw createAppError('File not found on disk', 404, 'NOT_FOUND');
    }

    return {
        buffer: fs.readFileSync(filePath),
        fileName: doc.fileName,
        mimeType: doc.mimeType
    };
}
