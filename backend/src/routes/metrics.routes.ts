import { Router } from 'express';
import { getSystemMetrics } from '../controllers/metrics.controller';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';

const router = Router();

// Only investors can see system metrics for now
router.get('/', authMiddleware, requireRole('INVESTOR'), getSystemMetrics);

export default router;
