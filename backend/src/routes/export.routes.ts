import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as exportController from '../controllers/export.controller';

const router = Router();
router.use(authMiddleware);

router.get('/portfolio.csv', exportController.downloadPortfolioCSV);
router.get('/cashflows.csv', exportController.downloadCashflowsCSV);

export default router;
