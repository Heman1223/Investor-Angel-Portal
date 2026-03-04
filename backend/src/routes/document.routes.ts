import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as documentsController from '../controllers/documents.controller';

const router = Router();

router.use(authMiddleware);

// Get all documents for the authenticated investor
router.get('/', documentsController.getAllDocuments);

// General upload (startupId optional in body)
router.post('/upload', documentsController.uploadMiddleware, documentsController.uploadDocumentGeneral);

// Update document (rename, re-link, change type)
router.put('/:id', documentsController.updateDocument);

// Download metadata
router.get('/:id/download', documentsController.downloadDocument);

// Get actual file content
router.get('/:id/file', documentsController.getFile);

// Delete (archive) a document
router.delete('/:id', documentsController.deleteDocument);

export default router;
