import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts per IP per 15 minutes
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again after 15 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
