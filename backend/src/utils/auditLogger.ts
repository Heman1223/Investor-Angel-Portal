import { prisma } from '../db';
import { logger } from './logger';

export async function logAudit(
    investorId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    req?: { ipAddress?: string; userAgent?: string }
) {
    try {
        await prisma.auditLog.create({
            data: {
                investorId,
                action,
                entityType,
                entityId,
                oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
                newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
                ipAddress: req?.ipAddress || null,
                userAgent: req?.userAgent || null,
            }
        });
    } catch (error) {
        // We log the error but don't crash the request if audit logging fails
        logger.error('Failed to write audit log', { error, action, entityId });
    }
}
