import type { Response } from 'express';
import type { ApiSuccess } from '../types/api.js';

/** Parse input with a Zod schema; failures bubble to the error middleware as 400s. */
export function parseWith<T>(schema: { parse: (input: unknown) => T }, input: unknown): T {
  return schema.parse(input);
}

export function ok<T>(res: Response, data: T, message = 'Operation successful', status = 200): void {
  const body: ApiSuccess<T> = { success: true, data, message };
  res.status(status).json(body);
}
