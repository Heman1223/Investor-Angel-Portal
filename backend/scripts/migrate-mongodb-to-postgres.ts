import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
// import { Investor } from '../src/models/Investor';
// import { Startup } from '../src/models/Startup';
// import { MonthlyUpdate } from '../src/models/MonthlyUpdate';
// import { Cashflow } from '../src/models/Cashflow';
// import { DilutionEvent } from '../src/models/DilutionEvent';
// import { DocumentModel } from '../src/models/Document';
// import { Alert } from '../src/models/Alert';
// import { AlertConfiguration } from '../src/models/AlertConfiguration';
// import { AuditLog } from '../src/models/AuditLog';

dotenv.config();

const prisma = new PrismaClient();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolioos';

async function migrateData() {
    console.log('Migration script is currently disabled. Point it to your models if you still need it.');
    /*
    console.log('🔗 Connecting to MongoDB...');
    ... (rest of the code)
    */
}

migrateData();
