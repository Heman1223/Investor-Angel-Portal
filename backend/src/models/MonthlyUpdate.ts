import mongoose, { Schema, Document } from 'mongoose';

export interface IMonthlyUpdate extends Document {
    _id: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    submittedBy: mongoose.Types.ObjectId;
    month: string;
    revenue: number;
    burnRate: number;
    cashBalance: number;
    runwayMonths?: number;
    valuationUpdate?: number;
    notes?: string;
    createdAt: Date;
}

const MonthlyUpdateSchema = new Schema<IMonthlyUpdate>({
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    revenue: { type: Number, required: true, min: 0 },
    burnRate: { type: Number, required: true, min: 0 },
    cashBalance: { type: Number, required: true },
    runwayMonths: { type: Number },
    valuationUpdate: { type: Number },
    notes: { type: String, maxlength: 1000 },
}, { timestamps: { createdAt: true, updatedAt: false } });

MonthlyUpdateSchema.index({ startupId: 1, month: 1 }, { unique: true });

export const MonthlyUpdate = mongoose.model<IMonthlyUpdate>('MonthlyUpdate', MonthlyUpdateSchema);
