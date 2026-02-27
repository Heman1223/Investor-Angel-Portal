import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', dashboardController.getDashboard);

export default router;
