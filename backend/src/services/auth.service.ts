import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Investor, IInvestor } from '../models/Investor';
import { createAppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(investor: IInvestor): string {
    return jwt.sign(
        { id: investor._id.toString(), email: investor.email, role: investor.role },
        process.env.JWT_SECRET!,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

function generateRefreshToken(investor: IInvestor): string {
    return jwt.sign(
        { id: investor._id.toString(), email: investor.email, role: investor.role },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

export async function loginInvestor(email: string, password: string) {
    const investor = await Investor.findOne({ email: email.toLowerCase() });
    if (!investor) {
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    const isValid = await bcrypt.compare(password, investor.passwordHash);
    if (!isValid) {
        throw createAppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    // Update last login
    investor.lastLoginAt = new Date();
    await investor.save();

    const accessToken = generateAccessToken(investor);
    const refreshToken = generateRefreshToken(investor);

    return {
        accessToken,
        refreshToken,
        investor: {
            id: investor._id,
            name: investor.name,
            email: investor.email,
            role: investor.role,
            subscriptionTier: investor.subscriptionTier,
        },
    };
}

export async function refreshAccessToken(refreshToken: string) {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string; email: string; role: string };
        const investor = await Investor.findById(decoded.id);
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
    const investor = await Investor.findById(investorId).select('-passwordHash -passwordResetToken -passwordResetExpires -twoFactorSecret');
    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }
    return investor;
}

export async function forgotPassword(email: string) {
    const investor = await Investor.findOne({ email: email.toLowerCase() });
    if (!investor) {
        // Don't reveal if email exists — return success either way
        return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    investor.passwordResetToken = hashedToken;
    investor.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await investor.save();

    // In production, send email with resetToken. For now, log it.
    // The actual URL would be: ${FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}
    return { message: 'If an account with that email exists, a reset link has been sent.', _devToken: resetToken };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
    const investor = await Investor.findOne({
        email: email.toLowerCase(),
        passwordResetExpires: { $gt: new Date() },
    });

    if (!investor || !investor.passwordResetToken) {
        throw createAppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
    }

    const isValidToken = await bcrypt.compare(token, investor.passwordResetToken);
    if (!isValidToken) {
        throw createAppError('Invalid or expired reset token', 400, 'VALIDATION_ERROR');
    }

    investor.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    investor.passwordResetToken = undefined;
    investor.passwordResetExpires = undefined;
    await investor.save();

    return { message: 'Password reset successfully' };
}

export async function changePassword(investorId: string, currentPassword: string, newPassword: string) {
    const investor = await Investor.findById(investorId);
    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }

    const isValid = await bcrypt.compare(currentPassword, investor.passwordHash);
    if (!isValid) {
        throw createAppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }

    investor.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await investor.save();

    return { message: 'Password changed successfully' };
}

export async function updateProfile(investorId: string, data: { name?: string }) {
    const investor = await Investor.findByIdAndUpdate(
        investorId,
        { $set: data },
        { new: true }
    ).select('-passwordHash -passwordResetToken -passwordResetExpires -twoFactorSecret');

    if (!investor) {
        throw createAppError('Investor not found', 404, 'NOT_FOUND');
    }
    return investor;
}
