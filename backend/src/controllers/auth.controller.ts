import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validators';
import { ZodError } from 'zod';

function formatZodError(error: ZodError) {
    const fields: Record<string, string> = {};
    error.errors.forEach((err) => {
        const path = err.path.join('.');
        fields[path] = err.message;
    });
    return fields;
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) }
            });
            return;
        }

        const result = await authService.loginInvestor(parsed.data.email, parsed.data.password);

        // Set refresh token in httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                investor: result.investor,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'No refresh token' }
            });
            return;
        }

        const result = await authService.refreshAccessToken(refreshToken);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) }
            });
            return;
        }

        const result = await authService.forgotPassword(parsed.data.email);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) }
            });
            return;
        }

        const result = await authService.resetPassword(parsed.data.email, parsed.data.token, parsed.data.newPassword);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const investor = await authService.getInvestorProfile(req.investor!.id);
        res.json({ success: true, data: investor });
    } catch (error) {
        next(error);
    }
}
