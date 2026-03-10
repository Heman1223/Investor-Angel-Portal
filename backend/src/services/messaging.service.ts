import { prisma } from '../db';
import { createAppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { sendNewMessageEmail } from './notification.service';

/**
 * Get or create a conversation for a startup.
 * One conversation per startup.
 */
export async function getOrCreateConversation(startupId: string) {
    let conversation = await prisma.startupConversation.findUnique({
        where: { startupId }
    });

    if (!conversation) {
        conversation = await prisma.startupConversation.create({
            data: { startupId }
        });
    }

    return conversation;
}

/**
 * Verify user has access to startup messaging.
 * Investor: Investment or legacy ownership. Company: CompanyMembership.
 */
async function verifyMessagingAccess(userId: string, role: string, startupId: string) {
    if (role === 'INVESTOR') {
        const investment = await prisma.investment.findUnique({
            where: { investorId_startupId: { investorId: userId, startupId } }
        });
        if (!investment) {
            const startup = await prisma.startup.findFirst({
                where: { id: startupId, investorId: userId }
            });
            if (!startup) {
                throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
            }
        }
    } else if (role === 'COMPANY_USER') {
        const membership = await prisma.companyMembership.findUnique({
            where: { userId_startupId: { userId, startupId } }
        });
        if (!membership) {
            throw createAppError('You do not have access to this startup', 403, 'FORBIDDEN');
        }
    } else {
        throw createAppError('Unknown role', 403, 'FORBIDDEN');
    }
}

/**
 * Get messages for a startup conversation.
 */
export async function getMessages(userId: string, role: string, startupId: string, cursor?: string, limit: number = 50) {
    await verifyMessagingAccess(userId, role, startupId);

    const conversation = await getOrCreateConversation(startupId);

    const where: any = { conversationId: conversation.id };
    if (cursor) {
        where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.startupMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
            attachments: true,
            reads: {
                where: { userId },
                select: { seenAt: true }
            }
        }
    });

    return messages.map(m => ({
        ...m,
        isRead: m.reads.length > 0,
        reads: undefined,
    }));
}

/**
 * Send a message in a startup conversation.
 */
export async function sendMessage(
    userId: string,
    role: string,
    startupId: string,
    body: string,
    messageType: string = 'TEXT'
) {
    await verifyMessagingAccess(userId, role, startupId);

    const conversation = await getOrCreateConversation(startupId);

    const message = await prisma.$transaction(async (tx) => {
        const msg = await tx.startupMessage.create({
            data: {
                conversationId: conversation.id,
                senderUserId: userId,
                body,
                messageType,
            },
            include: {
                sender: { select: { id: true, name: true, email: true, role: true } },
            }
        });

        // Update conversation lastMessageAt
        await tx.startupConversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() }
        });

        // Auto-mark as read by sender
        await tx.startupMessageRead.create({
            data: {
                messageId: msg.id,
                userId,
            }
        });

        return msg;
    });

    try {
        getIO().to(`startup_${startupId}`).emit('new_message', message);
    } catch (err) {
        // Socket not initialized or error, swallow
    }

    // Dispatch emails
    try {
        const startupInfo = await prisma.startup.findUnique({ where: { id: startupId }, include: { investor: true } });
        const allInvestments = await prisma.investment.findMany({ where: { startupId }, include: { investor: true } });
        const allMemberships = await prisma.companyMembership.findMany({ where: { startupId }, include: { user: true } });

        const recipients = new Map<string, any>();
        allInvestments.forEach(i => recipients.set(i.investorId, i.investor));
        allMemberships.forEach(m => recipients.set(m.userId, m.user));
        if (startupInfo) recipients.set(startupInfo.investorId, startupInfo.investor);

        // Remove sender
        recipients.delete(userId);

        const senderData = message.sender || { name: 'Someone', role: 'INVESTOR' };
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const threadUrl = senderData.role === 'COMPANY_USER'
            ? `${frontendUrl}/portfolio/${startupId}`
            : `${frontendUrl}/company/messaging`;

        for (const [id, user] of recipients.entries()) {
            if (user.notificationPreference === 'IMMEDIATE') {
                await sendNewMessageEmail(user.email, startupInfo?.name || 'A startup', senderData.name, body.substring(0, 100) + (body.length > 100 ? '...' : ''), threadUrl).catch(() => { });
            }
        }
    } catch (err) { }

    return message;
}

/**
 * Mark all messages in a startup conversation as seen by the user.
 */
export async function markMessagesSeen(userId: string, role: string, startupId: string) {
    await verifyMessagingAccess(userId, role, startupId);

    const conversation = await prisma.startupConversation.findUnique({
        where: { startupId }
    });
    if (!conversation) return { marked: 0 };

    // Find all unread messages
    const unreadMessages = await prisma.startupMessage.findMany({
        where: {
            conversationId: conversation.id,
            reads: {
                none: { userId }
            }
        },
        select: { id: true }
    });

    if (unreadMessages.length === 0) return { marked: 0 };

    await prisma.startupMessageRead.createMany({
        data: unreadMessages.map(m => ({
            messageId: m.id,
            userId,
        })),
        skipDuplicates: true,
    });

    try {
        getIO().to(`startup_${startupId}`).emit('messages_read', { userId, startupId });
    } catch (err) { }

    return { marked: unreadMessages.length };
}

/**
 * Get unread message count for a user in a specific startup or globally.
 */
export async function getUnreadMessageCount(userId: string, role: string, startupId?: string) {
    // Get all accessible startup IDs
    let startupIds: string[] = [];

    if (startupId) {
        await verifyMessagingAccess(userId, role, startupId);
        startupIds = [startupId];
    } else if (role === 'INVESTOR') {
        const investments = await prisma.investment.findMany({
            where: { investorId: userId },
            select: { startupId: true }
        });
        const ownedStartups = await prisma.startup.findMany({
            where: { investorId: userId },
            select: { id: true }
        });
        const ids = new Set([
            ...investments.map(i => i.startupId),
            ...ownedStartups.map(s => s.id)
        ]);
        startupIds = Array.from(ids);
    } else if (role === 'COMPANY_USER') {
        const memberships = await prisma.companyMembership.findMany({
            where: { userId },
            select: { startupId: true }
        });
        startupIds = memberships.map(m => m.startupId);
    }

    if (startupIds.length === 0) return { count: 0 };

    const conversations = await prisma.startupConversation.findMany({
        where: { startupId: { in: startupIds } },
        select: { id: true }
    });

    if (conversations.length === 0) return { count: 0 };

    const count = await prisma.startupMessage.count({
        where: {
            conversationId: { in: conversations.map(c => c.id) },
            reads: {
                none: { userId }
            }
        }
    });

    return { count };
}
