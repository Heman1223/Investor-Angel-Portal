import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DocumentModel } from '../models/Document';
import { Startup } from '../models/Startup';
import { createAppError } from '../middleware/errorHandler';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function getDocuments(investorId: string, startupId: string) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    return DocumentModel.find({ startupId, isArchived: false }).sort({ uploadedAt: -1 });
}

export async function getAllDocuments(investorId: string) {
    return DocumentModel.find({ investorId, isArchived: false })
        .populate('startupId', 'name')
        .sort({ uploadedAt: -1 });
}

export async function uploadDocument(
    investorId: string,
    startupId: string,
    file: Express.Multer.File,
    documentType: string,
    description?: string
) {
    const startup = await Startup.findOne({ _id: startupId, investorId });
    if (!startup) {
        throw createAppError('Startup not found', 404, 'NOT_FOUND');
    }

    const fileKey = `${startupId}/${uuidv4()}-${file.originalname}`;
    const filePath = path.join(UPLOAD_DIR, startupId.toString());

    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }

    fs.writeFileSync(path.join(filePath, `${uuidv4()}-${file.originalname}`), file.buffer);

    const doc = await DocumentModel.create({
        startupId,
        investorId,
        fileName: file.originalname,
        fileKey,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        documentType,
        description,
        uploadedBy: investorId,
    });

    return doc;
}

export async function getDownloadUrl(investorId: string, documentId: string) {
    const doc = await DocumentModel.findOne({ _id: documentId, investorId, isArchived: false });
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
    const doc = await DocumentModel.findOneAndUpdate(
        { _id: documentId, investorId },
        { isArchived: true },
        { new: true }
    );
    if (!doc) {
        throw createAppError('Document not found', 404, 'NOT_FOUND');
    }
    return doc;
}
