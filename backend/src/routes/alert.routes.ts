import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as alertsController from '../controllers/alerts.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', alertsController.getAlerts);
router.put('/:id/read', alertsController.markAlertRead);
router.put('/read-all', alertsController.markAllRead);
router.get('/config', alertsController.getAlertConfig);
router.put('/config', alertsController.updateAlertConfig);

export default router;
