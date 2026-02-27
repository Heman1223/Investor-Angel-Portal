import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import startupRoutes from './routes/startup.routes';
import dashboardRoutes from './routes/dashboard.routes';
import cashflowRoutes from './routes/cashflow.routes';
import alertRoutes from './routes/alert.routes';
import documentRoutes from './routes/document.routes';
import settingsRoutes from './routes/settings.routes';
import reportRoutes from './routes/report.routes';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cashflows', cashflowRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Global error handler
app.use(errorHandler);

export default app;
