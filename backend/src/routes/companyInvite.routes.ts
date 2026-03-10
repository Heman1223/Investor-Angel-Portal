import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as inviteController from '../controllers/companyInvite.controller';

const router = Router();
router.use(authMiddleware);

// Investor-facing invite management (nested under /api/startups/:id)
// These routes are mounted in startup.routes.ts

// Company user accepts invite (authenticated)
router.post('/invites/:token/accept', requireRole('COMPANY_USER'), inviteController.acceptInvite);

export default router;
