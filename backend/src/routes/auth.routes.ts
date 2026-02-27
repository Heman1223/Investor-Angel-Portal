import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.me);

export default router;
