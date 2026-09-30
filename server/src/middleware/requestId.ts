import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/** Attaches a correlation id to every request (client-provided X-Request-Id is honored). */
export function requestId(): RequestHandler {
  return (req, _res, next) => {
    const incoming = req.header('x-request-id');
    req.id = incoming && incoming.length <= 64 ? incoming : randomUUID().slice(0, 8);
    next();
  };
}
