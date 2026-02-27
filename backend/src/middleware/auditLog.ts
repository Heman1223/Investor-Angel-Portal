import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

interface AuditLogParams {
    investorId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: object;
    newValue?: object;
    ipAddress?: string;
    userAgent?: string;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await AuditLog.create({
            investorId: params.investorId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            oldValue: params.oldValue,
            newValue: params.newValue,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
    } catch (error) {
        // Audit log failures should never break the main operation
        logger.error('Failed to write audit log:', error);
    }
}
