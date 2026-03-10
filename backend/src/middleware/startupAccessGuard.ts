import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../db';

/**
 * Middleware that verifies the authenticated user has access to the startup
 * identified by :id (or :startupId) in the route params.
 *
 * Access rules:
 *  - INVESTOR: must have an Investment record linking them to the startup,
 *    OR be the legacy owner (Startup.investorId). Investment is the primary
 *    auth source; investorId is kept for backward compat during transition.
 *  - COMPANY_USER: must have a CompanyMembership for the startup.
 */
export function requireStartupAccess(paramName: string = 'id') {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.investor) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }

        const startupId = req.params[paramName];
        if (!startupId) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: `Missing startup ID parameter: ${paramName}` }
            });
            return;
        }

        const userId = req.investor.id;
        const role = req.investor.role;

        try {
            if (role === 'INVESTOR') {
                // Primary check: Investment table (multi-investor auth source)
                const investment = await prisma.investment.findUnique({
                    where: { investorId_startupId: { investorId: userId, startupId } }
                });

                if (!investment) {
                    // Fallback: legacy Startup.investorId (transition compat)
                    const startup = await prisma.startup.findFirst({
                        where: { id: startupId, investorId: userId }
                    });

                    if (!startup) {
                        res.status(403).json({
                            success: false,
                            error: { code: 'FORBIDDEN', message: 'You do not have access to this startup' }
                        });
                        return;
                    }
                }
            } else if (role === 'COMPANY_USER') {
                const membership = await prisma.companyMembership.findUnique({
                    where: { userId_startupId: { userId, startupId } }
                });

                if (!membership) {
                    res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: 'You do not have access to this startup' }
                    });
                    return;
                }
            } else {
                res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Unknown role' }
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
