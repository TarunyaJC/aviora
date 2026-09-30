import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import type { Role } from '../types/domain.js';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: Role;
}

export interface RefreshTokenClaims {
  sub: string;
  tokenVersion: number;
}

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.jwt.secret, { expiresIn: ACCESS_TTL_SECONDS });
}

export function signRefreshToken(claims: RefreshTokenClaims): string {
  return jwt.sign(claims, env.jwt.refreshSecret, { expiresIn: REFRESH_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    return jwt.verify(token, env.jwt.secret) as AccessTokenClaims;
  } catch {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Session expired or invalid. Please sign in again.');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenClaims;
  } catch {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Refresh session expired. Please sign in again.');
  }
}
