import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// PDF report generation — placeholder for V1
// In production, this would use Puppeteer for server-side PDF generation
router.post('/portfolio', async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    res.json({
        success: true,
        data: { message: 'PDF report generation will be available in the next release.', jobId: null },
    });
});

router.get('/:jobId', async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
    });
});

router.post('/startup/:id', async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    res.json({
        success: true,
        data: { message: 'Startup PDF report generation will be available in the next release.', jobId: null },
    });
});

export default router;
