import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  cancelBookingSchema,
  createBookingSchema,
  createPaymentSchema,
  flightIdParams,
  seatHoldSchema,
} from '../validators/schemas.js';
import * as bookingService from '../services/booking.service.js';
import * as seatService from '../services/seat.service.js';
import * as paymentService from '../services/payment.service.js';
import { ok, parseWith } from './helpers.js';

export const getSeatMap: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  const seats = await seatService.getEffectiveSeatMap(id);
  ok(res, { flightId: id, seats }, 'Seat map retrieved');
});

export const holdSeats: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  const input = parseWith(seatHoldSchema, req.body);
  ok(res, await seatService.holdSeats(id, input.seatIds), 'Seats held for 10 minutes', 201);
});

export const releaseSeatHold: RequestHandler = asyncHandler(async (req, res) => {
  const holdId = typeof req.body?.holdId === 'string' ? req.body.holdId : '';
  if (!holdId) throw ApiError.badRequest('holdId is required');
  seatService.releaseHold(holdId);
  ok(res, { released: true }, 'Seat hold released');
});

export const createBooking: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(createBookingSchema, req.body);
  const userId = req.user?.sub ?? null;
  ok(res, await bookingService.createBooking(input, userId), 'Booking confirmed', 201);
});

export const listBookings: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const email = asString(req.query.email);
  if (!userId && !email) {
    throw ApiError.unauthorized('Sign in or provide ?email= to look up bookings');
  }
  ok(res, await bookingService.listBookings({ userId, email }), 'Bookings retrieved');
});

export const getBookingById: RequestHandler = asyncHandler(async (req, res) => {
  ok(res, await bookingService.getBooking(String(req.params.id)), 'Booking retrieved');
});

export const cancelBooking: RequestHandler = asyncHandler(async (req, res) => {
  parseWith(cancelBookingSchema, req.body ?? {});
  ok(res, await bookingService.cancelBooking(String(req.params.id)), 'Booking cancelled');
});

export const createPayment: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(createPaymentSchema, req.body);
  ok(res, await paymentService.createPayment(input), 'DEMO payment created (no real charge)', 201);
});

export const processPayment: RequestHandler = asyncHandler(async (req, res) => {
  ok(res, await paymentService.processPayment(String(req.params.id)), 'DEMO payment processed (no real charge)');
});

export const getPayment: RequestHandler = asyncHandler(async (req, res) => {
  ok(res, await paymentService.getPayment(String(req.params.id)), 'Payment retrieved');
});

export const refundPayment: RequestHandler = asyncHandler(async (req, res) => {
  ok(res, await paymentService.refundPayment(String(req.params.id)), 'DEMO payment refunded');
});

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
