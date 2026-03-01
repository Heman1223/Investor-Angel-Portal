import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generatePortfolioPDF, generateStartupPDF } from '../services/report.service';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

// Portfolio PDF
router.post('/portfolio', async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const pdf = await generatePortfolioPDF(req.investor!.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="portfolio-report.pdf"');
        res.setHeader('Content-Length', pdf.length);
        res.send(pdf);
    } catch (err) {
        logger.error('Portfolio PDF error:', err);
        res.status(500).json({ success: false, error: { code: 'PDF_ERROR', message: 'Failed to generate portfolio report' } });
    }
});

// Startup PDF
router.post('/startup/:id', async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const pdf = await generateStartupPDF(req.investor!.id, req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="startup-report-${req.params.id}.pdf"`);
        res.setHeader('Content-Length', pdf.length);
        res.send(pdf);
    } catch (err) {
        logger.error('Startup PDF error:', err);
        res.status(500).json({ success: false, error: { code: 'PDF_ERROR', message: 'Failed to generate startup report' } });
    }
});

export default router;
