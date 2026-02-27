import mongoose, { Schema, Document } from 'mongoose';

export type DocumentType = 'sha' | 'term_sheet' | 'cap_table' | 'legal' | 'financial_statement' | 'other';

export interface IDocument extends Document {
    _id: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    fileName: string;
    fileKey: string;
    fileSizeBytes: number;
    mimeType: string;
    documentType: DocumentType;
    description?: string;
    uploadedBy: mongoose.Types.ObjectId;
    isArchived: boolean;
    uploadedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    fileName: { type: String, required: true },
    fileKey: { type: String, required: true, unique: true },
    fileSizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    documentType: { type: String, enum: ['sha', 'term_sheet', 'cap_table', 'legal', 'financial_statement', 'other'], required: true },
    description: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    isArchived: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: false } });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
