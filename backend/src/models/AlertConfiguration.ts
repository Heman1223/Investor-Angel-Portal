import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertConfiguration extends Document {
    _id: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    runwayWarningMonths: number;
    runwayCriticalMonths: number;
    revenueDropWarningPct: number;
    updateOverdueDays: number;
    irrNegativeThresholdPct: number;
    moicWarningThreshold: number;
    updatedAt: Date;
}

const AlertConfigSchema = new Schema<IAlertConfiguration>({
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true, unique: true },
    runwayWarningMonths: { type: Number, default: 6 },
    runwayCriticalMonths: { type: Number, default: 3 },
    revenueDropWarningPct: { type: Number, default: 15 },
    updateOverdueDays: { type: Number, default: 45 },
    irrNegativeThresholdPct: { type: Number, default: -20 },
    moicWarningThreshold: { type: Number, default: 0.75 },
}, { timestamps: { createdAt: false, updatedAt: true } });

export const AlertConfiguration = mongoose.model<IAlertConfiguration>('AlertConfiguration', AlertConfigSchema);
