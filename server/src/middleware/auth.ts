import type { Request, RequestHandler } from 'express';
import { verifyAccessToken, type AccessTokenClaims } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import type { Role } from '../types/domain.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
    }
  }
}

function extractBearerToken(req: Request): string {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }
  return header.slice(7).trim();
}

/** Requires a valid access token; attaches the decoded claims to req.user. */
export function requireAuth(): RequestHandler {
  return (req, _res, next) => {
    try {
      req.user = verifyAccessToken(extractBearerToken(req));
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Requires an authenticated user with one of the given roles. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    try {
      const claims = verifyAccessToken(extractBearerToken(req));
      if (!roles.includes(claims.role)) {
        throw ApiError.forbidden('Insufficient role for this operation');
      }
      req.user = claims;
      next();
    } catch (error) {
      next(error);
    }
  };
}
