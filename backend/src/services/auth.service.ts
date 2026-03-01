import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { Investor } from '@prisma/client';
import { createAppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(investor: Investor): string {
    return jwt.sign(
        { id: investor.id, email: investor.email, role: investor.role },
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

export async function loginInvestor(email: string, password: string) {
    const investor = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } });
    if (!investor) {
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    const isValid = await bcrypt.compare(password, investor.passwordHash);
    if (!isValid) {
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

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
            passwordResetExpires: null
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
        data: { passwordHash: newHash }
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
