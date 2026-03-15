import { Request, Response, NextFunction } from 'express';

/**
 * Recursively maps the 'id' key to '_id' in all outgoing JSON bodies.
 * This preserves the frontend contract which expects MongoDB's '_id'
 * without requiring frontend modifications or duplicating logic in all controllers.
 */
function mapIdToUnderscoreId(obj: any): any {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(mapIdToUnderscoreId);
    }

    const mapped: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (key === 'id') {
                mapped['_id'] = mapIdToUnderscoreId(obj[key]);
            }
            mapped[key] = mapIdToUnderscoreId(obj[key]);
        }
    }
    return mapped;
}

export function responseMapper(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json;

    res.json = function (body) {
        if (body && typeof body === 'object') {
            body = mapIdToUnderscoreId(body);
        }
        return originalJson.call(this, body);
    };

    next();
}
