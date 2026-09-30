import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/schemas.js';
import * as authService from '../services/auth.service.js';
import { ok, parseWith } from './helpers.js';

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(registerSchema, req.body);
  const result = await authService.registerUser(input);
  ok(res, result, 'Account created', 201);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(loginSchema, req.body);
  const result = await authService.loginUser(input);
  ok(res, result, 'Signed in');
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(refreshSchema, req.body);
  const result = await authService.refreshSession(input.refreshToken);
  ok(res, result, 'Session refreshed');
});

export const logout: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, authService.logout(), 'Signed out');
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  ok(res, await authService.getSessionUser(req.user!.sub), 'Session retrieved');
});
