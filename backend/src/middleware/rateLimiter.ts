import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10000, // Effectively disabled
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10000,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
