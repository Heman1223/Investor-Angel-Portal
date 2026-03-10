import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import * as companyUpdateController from '../controllers/companyUpdate.controller';
import * as companyInviteController from '../controllers/companyInvite.controller';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('COMPANY_USER'));

// Company user's startups
router.get('/me/startups', companyUpdateController.getMyStartups);

// Pending Invites
router.get('/invites', companyInviteController.getPendingInvites);
router.post('/invites/:inviteId/accept', companyInviteController.acceptInviteDirect);
router.post('/invites/:inviteId/decline', companyInviteController.declineInviteDirect);

// All updates across a company user's startups
router.get('/updates', companyUpdateController.getAllCompanyUpdates);

// Company update CRUD for a specific startup
router.get('/startups/:id/updates', companyUpdateController.getUpdates);
router.post('/startups/:id/updates', companyUpdateController.createDraft);
router.put('/updates/:updateId', companyUpdateController.editDraft);
router.post('/updates/:updateId/submit', companyUpdateController.submitUpdate);
router.post('/updates/:updateId/corrections', companyUpdateController.submitCorrection);

export default router;
