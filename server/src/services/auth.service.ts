import bcrypt from 'bcryptjs';
import { usersCollection } from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenClaims,
  type RefreshTokenClaims,
} from './token.service.js';
import type { User } from '../types/domain.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
}

function toSessionUser(user: User): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function issueTokens(user: User): AuthTokens {
  const accessClaims: AccessTokenClaims = { sub: user.id, email: user.email, role: user.role };
  const refreshClaims: RefreshTokenClaims = { sub: user.id, tokenVersion: 1 };
  return {
    accessToken: signAccessToken(accessClaims),
    refreshToken: signRefreshToken(refreshClaims),
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser; tokens: AuthTokens }> {
  const email = input.email.trim().toLowerCase();
  const users = await usersCollection.read();

  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new ApiError(409, ErrorCodes.CONFLICT, 'An account with this email already exists');
  }

  const user: User = {
    id: `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    name: input.name.trim(),
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    role: 'USER',
    createdAt: new Date().toISOString(),
  };
  await usersCollection.write([...users, user]);

  return { user: toSessionUser(user), tokens: issueTokens(user) };
}

export async function loginUser(input: { email: string; password: string }): Promise<{ user: SessionUser; tokens: AuthTokens }> {
  const email = input.email.trim().toLowerCase();
  const users = await usersCollection.read();
  const user = users.find((u) => u.email.toLowerCase() === email);

  // Uniform message — do not reveal whether the email exists.
  const invalid = new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Invalid email or password');
  if (!user) throw invalid;

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) throw invalid;

  return { user: toSessionUser(user), tokens: issueTokens(user) };
}

export async function refreshSession(refreshToken: string): Promise<{ user: SessionUser; tokens: AuthTokens }> {
  const claims = verifyRefreshToken(refreshToken);
  const users = await usersCollection.read();
  const user = users.find((u) => u.id === claims.sub);
  if (!user) throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Account no longer exists');

  return { user: toSessionUser(user), tokens: issueTokens(user) };
}

/** JWTs are stateless — logout happens on the client by discarding tokens. */
export function logout(): { message: string } {
  return { message: 'Signed out. Discard tokens on the client.' };
}

export async function getSessionUser(id: string): Promise<SessionUser> {
  const users = await usersCollection.read();
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Account no longer exists');
  return toSessionUser(user);
}
