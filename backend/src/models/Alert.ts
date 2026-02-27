import mongoose, { Schema, Document } from 'mongoose';

export type AlertType = 'RUNWAY_CRITICAL' | 'RUNWAY_WARNING' | 'CASH_ZERO' | 'REVENUE_DROP' | 'UPDATE_OVERDUE' | 'IRR_NEGATIVE' | 'MOIC_LOW';
export type AlertSeverity = 'RED' | 'YELLOW';

export interface IAlert extends Document {
    _id: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    alertType: AlertType;
    severity: AlertSeverity;
    message: string;
    isRead: boolean;
    triggeredAt: Date;
    resolvedAt?: Date;
}

const AlertSchema = new Schema<IAlert>({
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    alertType: { type: String, enum: ['RUNWAY_CRITICAL', 'RUNWAY_WARNING', 'CASH_ZERO', 'REVENUE_DROP', 'UPDATE_OVERDUE', 'IRR_NEGATIVE', 'MOIC_LOW'], required: true },
    severity: { type: String, enum: ['RED', 'YELLOW'], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    triggeredAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
});

AlertSchema.index({ startupId: 1, alertType: 1, isRead: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
