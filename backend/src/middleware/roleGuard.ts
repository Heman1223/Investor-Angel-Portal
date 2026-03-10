import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '@prisma/client';

/**
 * Middleware factory that restricts access to users with one of the specified roles.
 * Usage: requireRole('INVESTOR') or requireRole('INVESTOR', 'COMPANY_USER')
 */
export function requireRole(...roles: (UserRole | string)[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.investor) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }

        const userRole = req.investor.role;
        if (!roles.includes(userRole)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: `This action requires one of the following roles: ${roles.join(', ')}`
                }
            });
            return;
        }

        next();
    };
}
