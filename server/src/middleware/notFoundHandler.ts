import type { Request, Response } from 'express';
import { ErrorCodes } from '../utils/ApiError.js';
import type { ApiErrorBody } from '../types/api.js';

/** Final middleware for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errorCode: ErrorCodes.NOT_FOUND,
  } satisfies ApiErrorBody);
}
