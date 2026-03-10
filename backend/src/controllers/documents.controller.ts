import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as documentsService from '../services/documents.service';
import multer from 'multer';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Word, Excel, CSV, and Images are allowed.'));
        }
    }
});

export const uploadMiddleware = upload.single('file');

export async function getDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const docs = await documentsService.getDocuments(req.investor!.id, req.params.id);
        res.json({ success: true, data: docs });
    } catch (error) { next(error); }
}

export async function getAllDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const docs = await documentsService.getAllDocuments(req.investor!.id);
        res.json({ success: true, data: docs });
    } catch (error) { next(error); }
}

// Upload under a specific startup (legacy route: POST /startups/:id/documents)
export async function uploadDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
            return;
        }
        const doc = await documentsService.uploadDocument(
            req.investor!.id,
            req.params.id,
            req.file,
            req.body.documentType || 'other',
            req.body.description
        );
        res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
}

// General upload (POST /documents/upload) — startupId is optional in body
export async function uploadDocumentGeneral(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
            return;
        }
        const doc = await documentsService.uploadDocument(
            req.investor!.id,
            req.body.startupId || null,
            req.file,
            req.body.documentType || 'other',
            req.body.description
        );
        res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
}

export async function downloadDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await documentsService.getDownloadUrl(req.investor!.id, req.params.id);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const doc = await documentsService.archiveDocument(req.investor!.id, req.params.id);
        res.json({ success: true, data: doc });
    } catch (error) { next(error); }
}

export async function updateDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { fileName, startupId, documentType } = req.body;
        const doc = await documentsService.updateDocument(
            req.investor!.id,
            req.params.id,
            { fileName, startupId, documentType }
        );
        res.json({ success: true, data: doc });
    } catch (error) { next(error); }
}

export async function getFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { buffer, fileName, mimeType } = await documentsService.getFile(req.investor!.id, req.params.id);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) { next(error); }
}
