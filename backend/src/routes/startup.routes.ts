import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as startupController from '../controllers/startup.controller';
import * as updatesController from '../controllers/updates.controller';
import * as cashflowsController from '../controllers/cashflows.controller';
import * as documentsController from '../controllers/documents.controller';
import { uploadMiddleware } from '../controllers/documents.controller';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// Startup CRUD
router.get('/', startupController.getAllStartups);
router.post('/', startupController.createStartup);
router.get('/:id', startupController.getStartupById);
router.put('/:id', startupController.updateStartup);
router.delete('/:id', startupController.deleteStartup);

// Exit and Follow-on
router.post('/:id/exit', startupController.recordExit);
router.post('/:id/follow-on', startupController.addFollowOn);
router.put('/:id/valuation', startupController.updateValuation);
router.post('/:id/notes', startupController.addNote);

// Monthly Updates (nested under startup)
router.get('/:id/updates', updatesController.getUpdates);
router.post('/:id/updates', updatesController.createUpdate);

// Cashflows (nested under startup)
router.get('/:id/cashflows', cashflowsController.getStartupCashflows);
router.post('/:id/cashflows', cashflowsController.addCashflow);
router.put('/:id/cashflows/:cfId', cashflowsController.updateCashflow);
router.delete('/:id/cashflows/:cfId', cashflowsController.deleteCashflow);

// Documents (nested under startup)
router.get('/:id/documents', documentsController.getDocuments);
router.post('/:id/documents', uploadMiddleware, documentsController.uploadDocument);

export default router;
