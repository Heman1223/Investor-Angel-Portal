import mongoose, { Schema, Document } from 'mongoose';

export interface IDilutionEvent extends Document {
    _id: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    roundName: string;
    date: Date;
    preDilutionEquity: number;
    postDilutionEquity: number;
    newInvestor?: string;
    roundValuation?: number;
    notes?: string;
    createdAt: Date;
}

const DilutionEventSchema = new Schema<IDilutionEvent>({
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    roundName: { type: String, required: true },
    date: { type: Date, required: true },
    preDilutionEquity: { type: Number, required: true, min: 0, max: 100 },
    postDilutionEquity: { type: Number, required: true, min: 0, max: 100 },
    newInvestor: { type: String },
    roundValuation: { type: Number },
    notes: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const DilutionEvent = mongoose.model<IDilutionEvent>('DilutionEvent', DilutionEventSchema);
