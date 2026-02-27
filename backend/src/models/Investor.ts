import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    passwordHash: string;
    role: 'investor' | 'admin' | 'founder';
    subscriptionTier: 'solo' | 'pro' | 'enterprise';
    twoFactorSecret?: string;
    twoFactorEnabled: boolean;
    lastLoginAt?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['investor', 'admin', 'founder'], default: 'investor' },
    subscriptionTier: { type: String, enum: ['solo', 'pro', 'enterprise'], default: 'solo' },
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
}, { timestamps: true });

export const Investor = mongoose.model<IInvestor>('Investor', InvestorSchema);
