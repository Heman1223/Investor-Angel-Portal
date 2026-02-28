import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

export interface AuthRequest extends Request {
    investor?: {
        id: string;
        email: string;
        role: string;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Access token required' }
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: string };

        // Verify investor still exists
        const investor = await prisma.investor.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true }
        });
        if (!investor) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Investor not found' }
            });
            return;
        }

        req.investor = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Token expired' }
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
        });
    }
};
