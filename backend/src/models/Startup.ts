import mongoose, { Schema, Document } from 'mongoose';

export interface IStartup extends Document {
    _id: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    name: string;
    sector: string;
    stage: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Growth' | 'Pre-IPO';
    status: 'active' | 'exited' | 'written_off' | 'watchlist';
    entryValuation: number;
    currentValuation: number;
    equityPercent: number;
    currentEquityPercent: number;
    investmentDate: Date;
    description?: string;
    website?: string;
    founderName?: string;
    founderEmail?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StartupSchema = new Schema<IStartup>({
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sector: { type: String, required: true },
    stage: { type: String, enum: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Pre-IPO'], required: true },
    status: { type: String, enum: ['active', 'exited', 'written_off', 'watchlist'], default: 'active' },
    entryValuation: { type: Number, required: true, min: 0 },
    currentValuation: { type: Number, required: true, min: 0 },
    equityPercent: { type: Number, required: true, min: 0, max: 100 },
    currentEquityPercent: { type: Number, required: true, min: 0, max: 100 },
    investmentDate: { type: Date, required: true },
    description: { type: String },
    website: { type: String },
    founderName: { type: String },
    founderEmail: { type: String },
}, { timestamps: true });

StartupSchema.index({ investorId: 1, status: 1 });
StartupSchema.index({ investorId: 1, sector: 1 });

export const Startup = mongoose.model<IStartup>('Startup', StartupSchema);
