import rateLimit from 'express-rate-limit';

/** Tight limiter for credential endpoints (brute-force mitigation). */
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes.', errorCode: 'RATE_LIMITED' },
});

/** Guard against seat-map hammering and reservation races. */
export const seatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many seat operations. Slow down.', errorCode: 'RATE_LIMITED' },
});
