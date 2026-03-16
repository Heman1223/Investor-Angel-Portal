import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { responseMapper } from './middleware/responseMapper';
import authRoutes from './routes/auth.routes';
import startupRoutes from './routes/startup.routes';
import dashboardRoutes from './routes/dashboard.routes';
import cashflowRoutes from './routes/cashflow.routes';
import alertRoutes from './routes/alert.routes';
import documentRoutes from './routes/document.routes';
import settingsRoutes from './routes/settings.routes';
import reportRoutes from './routes/report.routes';
import exportRoutes from './routes/export.routes';
import companyRoutes from './routes/company.routes';
import companyInviteRoutes from './routes/companyInvite.routes';
import messagingRoutes from './routes/messaging.routes';
import metricsRoutes from './routes/metrics.routes';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Enforce HTTPS in production
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
});

// Request logging
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://investor-angel-portal.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean).map(o => o!.trim()) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.includes(origin) || 
                         origin.endsWith('.onrender.com') ||
                         process.env.NODE_ENV !== 'production';

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Response mapping (id -> _id)
app.use(responseMapper);

// API Routes
// New: Company Portal routes
app.use('/api/company', companyRoutes);
app.use('/api/company', companyInviteRoutes);
app.use('/api/messaging', messagingRoutes);

// Standard routes
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cashflows', cashflowRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/metrics', metricsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Root route
app.get('/', (_req, res) => {
    res.send('PortfolioOS Backend API is running');
});

// Global error handler
app.use(errorHandler);

export default app;
