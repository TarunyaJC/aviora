import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiters.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/auth.controller.js';
import * as flights from '../controllers/flight.controller.js';
import * as booking from '../controllers/booking.controller.js';
import * as admin from '../controllers/admin.controller.js';

export const apiRouter = Router();

// ── Auth ─────────────────────────────────────────────────────────
const authRouter = Router();
authRouter.post('/register', authRateLimiter, auth.register);
authRouter.post('/login', authRateLimiter, auth.login);
authRouter.post('/logout', auth.logout);
authRouter.post('/refresh', authRateLimiter, auth.refresh);
authRouter.get('/me', requireAuth(), auth.me);
apiRouter.use('/auth', authRouter);

// ── Catalog ──────────────────────────────────────────────────────
apiRouter.get('/airports', flights.listAirports);
apiRouter.get('/airlines', flights.listAirlines);
apiRouter.get('/aircraft', flights.listAircraft);

// ── Flights & status ─────────────────────────────────────────────
apiRouter.get('/flights', flights.search);
apiRouter.post('/flights/:id/seats/hold', booking.holdSeats);
apiRouter.post('/flights/:id/seats/release', booking.releaseSeatHold);
apiRouter.get('/flights/:id/seats', booking.getSeatMap);
apiRouter.get('/flights/:id', flights.getById);
apiRouter.get('/status', flights.status);

// ── Bookings ─────────────────────────────────────────────────────
apiRouter.post('/bookings', requireAuth(), booking.createBooking);
apiRouter.get('/bookings', requireAuth(), booking.listBookings);
apiRouter.get('/bookings/:id', booking.getBookingById);
apiRouter.post('/bookings/:id/cancel', booking.cancelBooking);

// ── Payments (demo only — never a real charge) ───────────────────
apiRouter.post('/payments', booking.createPayment);
apiRouter.get('/payments/:id', booking.getPayment);
apiRouter.post('/payments/:id/process', booking.processPayment);
apiRouter.post('/payments/:id/refund', booking.refundPayment);

// ── Admin (role-gated) ───────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireRole('ADMIN'));
adminRouter.get('/dashboard', admin.dashboard);
adminRouter.get('/flights', admin.listFlights);
adminRouter.post('/flights', admin.createFlight);
adminRouter.put('/flights/:id', admin.updateFlight);
adminRouter.delete('/flights/:id', admin.deleteFlight);
adminRouter.post('/flights/:id/actions', admin.flightAction);
apiRouter.use('/admin', adminRouter);
