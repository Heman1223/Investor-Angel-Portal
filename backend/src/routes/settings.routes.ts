import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as settingsController from '../controllers/settings.controller';
import * as updatesController from '../controllers/updates.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/profile', settingsController.updateProfile);
router.put('/password', settingsController.changePassword);
router.get('/audit-log', settingsController.getAuditLog);
router.get('/export', settingsController.exportData);

// All updates route (across portfolio)
router.get('/updates', updatesController.getAllUpdates);

export default router;
