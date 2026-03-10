import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as startupController from '../controllers/startup.controller';
import * as updatesController from '../controllers/updates.controller';
import * as cashflowsController from '../controllers/cashflows.controller';
import * as documentsController from '../controllers/documents.controller';
import * as inviteController from '../controllers/companyInvite.controller';
import { uploadMiddleware } from '../controllers/documents.controller';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// Startup CRUD (investor-only)
router.get('/', requireRole('INVESTOR'), startupController.getAllStartups);
router.post('/', requireRole('INVESTOR'), startupController.createStartup);
router.get('/:id', requireRole('INVESTOR'), startupController.getStartupById);
router.put('/:id', requireRole('INVESTOR'), startupController.updateStartup);
router.delete('/:id', requireRole('INVESTOR'), startupController.deleteStartup);

// Exit and Follow-on (investor-only)
router.post('/:id/exit', requireRole('INVESTOR'), startupController.recordExit);
router.post('/:id/follow-on', requireRole('INVESTOR'), startupController.addFollowOn);
router.put('/:id/valuation', requireRole('INVESTOR'), startupController.updateValuation);
router.post('/:id/notes', requireRole('INVESTOR'), startupController.addNote);

// Monthly Updates (nested under startup)
router.get('/:id/updates', updatesController.getUpdates);
router.post('/:id/updates', updatesController.createUpdate);
router.post('/:id/updates/:updateId/mark-seen', updatesController.markSeen);

// Revision history
router.get('/:id/updates/:updateId/revisions', (req, res, next) => {
    import('../services/companyUpdate.service').then(svc => {
        svc.getRevisions(req.params.id, req.params.updateId)
            .then(data => res.json({ success: true, data }))
            .catch(next);
    });
});

// Investor unread update count
router.get('/investor/updates/unread-count', updatesController.getUnreadCount);

// Cashflows (nested under startup)
router.get('/:id/cashflows', cashflowsController.getStartupCashflows);
router.post('/:id/cashflows', cashflowsController.addCashflow);
router.put('/:id/cashflows/:cfId', cashflowsController.updateCashflow);
router.delete('/:id/cashflows/:cfId', cashflowsController.deleteCashflow);

// Documents (nested under startup)
router.get('/:id/documents', documentsController.getDocuments);
router.post('/:id/documents', uploadMiddleware, documentsController.uploadDocument);

// Company Invite management (investor-only)
router.post('/:id/company-invites', requireRole('INVESTOR'), inviteController.createInvite);
router.get('/:id/company-invites', requireRole('INVESTOR'), inviteController.getInvites);
router.post('/:id/company-invites/:inviteId/resend', requireRole('INVESTOR'), inviteController.resendInvite);
router.post('/:id/company-invites/:inviteId/revoke', requireRole('INVESTOR'), inviteController.revokeInvite);
router.get('/:id/company-members', inviteController.getMembers);

export default router;
