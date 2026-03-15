import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as messagingController from '../controllers/messaging.controller';

const router = Router();
router.use(authMiddleware);

// Messaging is accessible by both INVESTOR and COMPANY_USER
// Access control is handled in the service layer

// Get messages for a startup (investor implicitly their own, company can specify ?investorId=)
router.get('/startups/:id/messages', messagingController.getMessages);

// Get all threads for a startup (company user view)
router.get('/startups/:id/threads', messagingController.getConversations);

// Send message in a startup conversation
router.post('/startups/:id/messages', messagingController.sendMessage);

// Mark all messages as seen for a startup
router.post('/startups/:id/messages/mark-seen', messagingController.markSeen);

// Get unread message count for a startup (or global if no :id)
router.get('/startups/:id/messages/unread-count', messagingController.getUnreadCount);
router.get('/messages/unread-count', messagingController.getUnreadCount);

export default router;
