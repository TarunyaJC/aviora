/** Error codes surfaced to clients through the uniform error envelope. */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Operational error with an HTTP status and a client-safe message.
 * Throw this from controllers and services; the error middleware renders it.
 * Unexpected errors (anything not ApiError) are logged but never leaked.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: ErrorCode;

  constructor(statusCode: number, errorCode: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  static badRequest(message = 'Invalid request', code: ErrorCode = ErrorCodes.BAD_REQUEST): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, ErrorCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, ErrorCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, ErrorCodes.NOT_FOUND, message);
  }

  static conflict(message = 'Resource conflict'): ApiError {
    return new ApiError(409, ErrorCodes.CONFLICT, message);
  }
}
