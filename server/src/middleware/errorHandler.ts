import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import type { ApiErrorBody } from '../types/api.js';

function isTrustedClientError(error: unknown): boolean {
  return (
    error instanceof ApiError ||
    (error instanceof SyntaxError && 'status' in error && (error as { status?: number }).status === 400)
  );
}

/** Render any thrown error as the uniform error envelope; never leak internals. */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }

  // Malformed JSON body -> 400
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON body',
      errorCode: ErrorCodes.BAD_REQUEST,
    } satisfies ApiErrorBody);
    return;
  }

  // Validation failures -> 400 with field details
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: error.issues[0]?.message ?? 'Validation failed',
      errorCode: ErrorCodes.VALIDATION_ERROR,
    } satisfies ApiErrorBody);
    return;
  }

  if (isTrustedClientError(error)) {
    const apiError = error as ApiError;
    res.status(apiError.statusCode).json({
      success: false,
      message: apiError.message,
      errorCode: apiError.errorCode,
    } satisfies ApiErrorBody);
    return;
  }

  // Unexpected failure — log with correlation id, return a generic 500.
  const requestError = error as { message?: string; stack?: string };
  console.error(`[AVIORA] Unhandled error on ${req.method} ${req.originalUrl} (req ${req.id})`);
  if (!env.isProduction) {
    console.error(requestError.stack);
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
    errorCode: ErrorCodes.INTERNAL,
  } satisfies ApiErrorBody);
}
