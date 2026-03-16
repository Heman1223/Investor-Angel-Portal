import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { Investor, UserRole } from '@prisma/client';
import { createAppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(investor: Investor): string {
    return jwt.sign(
        { id: investor.id, email: investor.email, role: investor.role, tokenVersion: investor.tokenVersion },
        process.env.JWT_SECRET!,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

function generateRefreshToken(investor: Investor): string {
    return jwt.sign(
        { id: investor.id, email: investor.email, role: investor.role },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

export async function registerInvestor(name: string, email: string, password: string) {
    const existing = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
        throw createAppError('An account with this email already exists', 409, 'CONFLICT');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const investor = await prisma.investor.create({
        data: {
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: UserRole.INVESTOR,
        },
    });

    const accessToken = generateAccessToken(investor);
    const refreshToken = generateRefreshToken(investor);

    return {
        accessToken,
        refreshToken,
        investor: {
            id: investor.id,
            name: investor.name,
            email: investor.email,
            role: investor.role,
            subscriptionTier: investor.subscriptionTier,
        },
    };
}

export async function registerCompanyUserLocal(name: string, email: string, password: string) {
    const existing = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
        throw createAppError('An account with this email already exists', 409, 'CONFLICT');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.investor.create({
        data: {
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: UserRole.COMPANY_USER,
        },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
        accessToken,
        refreshToken,
        investor: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
        },
    };
}

export async function registerCompanyUser(name: string, email: string, password: string, inviteToken: string) {
    // Validate invite token
    const invite = await prisma.companyInvite.findUnique({ where: { token: inviteToken } });
    if (!invite) {
        throw createAppError('Invalid invite token', 400, 'VALIDATION_ERROR');
    }
    if (invite.status !== 'PENDING') {
        throw createAppError(`Invite has already been ${invite.status.toLowerCase()}`, 400, 'VALIDATION_ERROR');
    }
    if (new Date() > invite.expiresAt) {
        // Mark expired
        await prisma.companyInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
        throw createAppError('Invite token has expired. Please request a new invite.', 400, 'VALIDATION_ERROR');
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw createAppError('Email does not match the invite', 400, 'VALIDATION_ERROR');
    }

    // Check if email belongs to an existing investor — reject to avoid role confusion
    const existing = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (existing && existing.role === 'INVESTOR') {
        throw createAppError(
            'This email is already registered as an investor account. Please use a different email for company access.',
            409, 'CONFLICT'
        );
    }

    // If existing company user, link to startup directly
    if (existing && existing.role === 'COMPANY_USER') {
        const result = await prisma.$transaction(async (tx) => {
            await tx.companyMembership.create({
                data: {
                    userId: existing.id,
                    startupId: invite.startupId,
                    role: invite.companyRole,
                }
            });
            await tx.companyInvite.update({
                where: { id: invite.id },
                data: { status: 'ACCEPTED', acceptedAt: new Date() }
            });
            return existing;
        });

        const accessToken = generateAccessToken(result);
        const refreshToken = generateRefreshToken(result);
        return {
            accessToken,
            refreshToken,
            investor: {
                id: result.id,
                name: result.name,
                email: result.email,
                role: result.role,
                subscriptionTier: result.subscriptionTier,
            },
        };
    }

    // New company user registration
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.investor.create({
            data: {
                name,
                email: email.toLowerCase(),
                passwordHash,
                role: UserRole.COMPANY_USER,
            },
        });

        await tx.companyMembership.create({
            data: {
                userId: user.id,
                startupId: invite.startupId,
                role: invite.companyRole,
            }
        });

        await tx.companyInvite.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
        });

        // Mark startup as active since the founder has joined
        await tx.startup.update({
            where: { id: invite.startupId },
            data: { status: 'active' }
        });

        return user;
    });

    const accessToken = generateAccessToken(result);
    const refreshToken = generateRefreshToken(result);

    return {
        accessToken,
        refreshToken,
        investor: {
            id: result.id,
            name: result.name,
            email: result.email,
            role: result.role,
            subscriptionTier: result.subscriptionTier,
        },
    };
}

export async function getInviteByToken(token: string) {
    const invite = await prisma.companyInvite.findUnique({
        where: { token },
        include: {
            startup: {
                select: { name: true }
            }
        }
    });

    if (!invite) {
        throw createAppError('Invalid invitation link', 404, 'NOT_FOUND');
    }

    if (invite.status !== 'PENDING') {
        throw createAppError('This invitation has already been used or revoked', 400, 'BAD_REQUEST');
    }

    if (invite.expiresAt < new Date()) {
        throw createAppError('This invitation link has expired', 400, 'BAD_REQUEST');
    }

    return {
        email: invite.email,
        companyRole: invite.companyRole,
        startupName: invite.startup.name,
        expiresAt: invite.expiresAt,
    };
}

export async function loginInvestor(email: string, password: string) {
    const emailLower = email.toLowerCase().trim();
    console.log(`[AuthDebug] Login attempt started for: "${emailLower}"`);
    
    // Safety check for critical env vars
    if (!process.env.JWT_SECRET) {
        console.error('[CRITICAL] JWT_SECRET is not defined in environment variables!');
        throw createAppError('Server configuration error', 500, 'CONFIG_ERROR');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
        console.error('[CRITICAL] JWT_REFRESH_SECRET is not defined in environment variables!');
        throw createAppError('Server configuration error', 500, 'CONFIG_ERROR');
    }
    
    const investor = await prisma.investor.findUnique({ where: { email: emailLower } });
    if (!investor) {
        console.log(`[AuthDebug] User not found: "${emailLower}"`);
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }
    console.log(`[AuthDebug] User found: "${investor.email}"`);
    console.log(`[AuthDebug] Role value: "${investor.role}", Type: ${typeof investor.role}`);

    const isValid = await bcrypt.compare(password, investor.passwordHash);
    if (!isValid) {
        console.log(`[AuthDebug] Password mismatch for: "${investor.email}"`);
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }
    console.log(`[AuthDebug] Password valid for: "${investor.email}"`);

    // Update last login
    const updatedInvestor = await prisma.investor.update({
        where: { id: investor.id },
        data: { lastLoginAt: new Date() }
    });

    const accessToken = generateAccessToken(updatedInvestor);
    const refreshToken = generateRefreshToken(updatedInvestor);

    return {
        accessToken,
        refreshToken,
        investor: {
            id: updatedInvestor.id,
            name: updatedInvestor.name,
            email: updatedInvestor.email,
            role: updatedInvestor.role,
            subscriptionTier: updatedInvestor.subscriptionTier,
        },
    };
}

export async function refreshAccessToken(refreshToken: string) {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string; email: string; role: string };
        const investor = await prisma.investor.findUnique({ where: { id: decoded.id } });
        if (!investor) {
            throw createAppError('Investor not found', 401, 'UNAUTHORIZED');
        }

        const newAccessToken = generateAccessToken(investor);
        return { accessToken: newAccessToken };
    } catch (error) {
        throw createAppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }
}

export async function getInvestorProfile(investorId: string) {
    const investor = await prisma.investor.findUnique({
        where: { id: investorId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscriptionTier: true,
            twoFactorEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }
    return investor;
}

export async function forgotPassword(email: string) {
    const investor = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (!investor) {
        return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    await prisma.investor.update({
        where: { id: investor.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
    });

    return { message: 'If an account with that email exists, a reset link has been sent.', _devToken: resetToken };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
    const investor = await prisma.investor.findFirst({
        where: {
            email: email.toLowerCase(),
            passwordResetExpires: { gt: new Date() }
        }
    });

    if (!investor || !investor.passwordResetToken) {
        throw createAppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
    }

    const isValidToken = await bcrypt.compare(token, investor.passwordResetToken);
    if (!isValidToken) {
        throw createAppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.investor.update({
        where: { id: investor.id },
        data: {
            passwordHash: newHash,
            passwordResetToken: null,
            passwordResetExpires: null,
            tokenVersion: { increment: 1 }
        }
    });

    return { message: 'Password reset successfully' };
}

export async function changePassword(investorId: string, currentPassword: string, newPassword: string) {
    const investor = await prisma.investor.findUnique({ where: { id: investorId } });
    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }

    const isValid = await bcrypt.compare(currentPassword, investor.passwordHash);
    if (!isValid) {
        throw createAppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.investor.update({
        where: { id: investor.id },
        data: {
            passwordHash: newHash,
            tokenVersion: { increment: 1 }
        }
    });

    return { message: 'Password changed successfully' };
}

export async function updateProfile(investorId: string, data: { name?: string }) {
    const investor = await prisma.investor.update({
        where: { id: investorId },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscriptionTier: true,
            twoFactorEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }
    return investor;
}
