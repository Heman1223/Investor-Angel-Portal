import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, registerSchema } from '../validators/auth.validators';
import { ZodError } from 'zod';

function formatZodError(error: ZodError) {
    const fields: Record<string, string> = {};
    error.errors.forEach((err) => {
        const path = err.path.join('.');
        fields[path] = err.message;
    });
    return fields;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: formatZodError(parsed.error) }
            });
            return;
        }

        const result = await authService.registerInvestor(parsed.data.name, parsed.data.email, parsed.data.password);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
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

export async function registerCompanyLocal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'name, email, and password are required' }
            });
            return;
        }

        const result = await authService.registerCompanyUserLocal(name, email, password);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
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

export async function registerCompanyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, email, password, inviteToken } = req.body;
        if (!name || !email || !password || !inviteToken) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'name, email, password, and inviteToken are required' }
            });
            return;
        }

        const result = await authService.registerCompanyUser(name, email, password, inviteToken);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
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

export async function getInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token } = req.params;
        const result = await authService.getInviteByToken(token);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
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
