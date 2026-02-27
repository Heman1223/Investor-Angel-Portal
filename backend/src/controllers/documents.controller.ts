import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as documentsService from '../services/documents.service';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
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
