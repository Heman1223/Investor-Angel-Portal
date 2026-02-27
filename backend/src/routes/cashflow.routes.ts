import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as cashflowsController from '../controllers/cashflows.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', cashflowsController.getAllCashflows);

export default router;
