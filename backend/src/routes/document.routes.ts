import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as documentsController from '../controllers/documents.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', documentsController.getAllDocuments);
router.get('/:id/download', documentsController.downloadDocument);
router.delete('/:id', documentsController.deleteDocument);

export default router;
