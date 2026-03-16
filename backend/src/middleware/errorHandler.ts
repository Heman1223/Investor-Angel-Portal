import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    fields?: Record<string, string>;
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction): void => {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';

    if (statusCode === 500) {
        logger.error('[ERROR] Unhandled server error:', { 
            message: err.message, 
            stack: err.stack, 
            code: err.code,
            originalError: err
        });
    } else if (statusCode !== 401 && statusCode !== 404) {
        logger.warn('[WARN] Client error:', { 
            message: err.message, 
            code: err.code,
            fields: err.fields
        });
    }

    const message = statusCode === 500 ? 'Something went wrong. Please try again.' : err.message;

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(err.fields && { fields: err.fields }),
        },
    });
};

export function createAppError(message: string, statusCode: number, code: string, fields?: Record<string, string>): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.code = code;
    error.fields = fields;
    return error;
}
