import mongoose, { Schema, Document } from 'mongoose';

export interface ICashflow extends Document {
    _id: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    amount: number;
    date: Date;
    type: 'investment' | 'follow_on' | 'exit' | 'dividend' | 'write_off';
    roundName?: string;
    valuationAtTime?: number;
    equityAcquired?: number;
    currency: string;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CashflowSchema = new Schema<ICashflow>({
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['investment', 'follow_on', 'exit', 'dividend', 'write_off'], required: true },
    roundName: { type: String },
    valuationAtTime: { type: Number },
    equityAcquired: { type: Number, min: 0, max: 100 },
    currency: { type: String, default: 'INR', maxlength: 3 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
}, { timestamps: true });

CashflowSchema.index({ investorId: 1, date: 1 });
CashflowSchema.index({ startupId: 1, date: 1 });

export const Cashflow = mongoose.model<ICashflow>('Cashflow', CashflowSchema);
