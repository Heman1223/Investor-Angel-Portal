import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: object;
    newValue?: object;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ investorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
