import { z } from 'zod';

// ── Auth ─────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

// ── Flight search ────────────────────────────────────────────────
export const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business'] as const;

export const flightSearchSchema = z.object({
  from: z.string().trim().length(3, 'Origin must be a 3-letter airport code').toUpperCase(),
  to: z.string().trim().length(3, 'Destination must be a 3-letter airport code').toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  cabin: z.enum(CABIN_CLASSES).optional(),
  passengers: z.coerce.number().int().min(1).max(9).optional(),
  airline: z.string().trim().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  maxDuration: z.coerce.number().int().positive().optional(),
  stops: z.enum(['any', 'nonstop']).optional(),
  departureWindow: z.enum(['any', 'morning', 'afternoon', 'evening', 'night']).optional(),
  sort: z.enum(['cheapest', 'fastest', 'earliest', 'latest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
}).refine((q) => q.from !== q.to, { message: 'Origin and destination must differ' });

export const flightIdParams = z.object({
  id: z.string().trim().min(1),
});

// ── Seats ────────────────────────────────────────────────────────
export const seatHoldSchema = z.object({
  seatIds: z
    .array(z.string().trim().regex(/^[0-9]{1,2}[A-K]$/, 'Seat must look like 12A'))
    .min(1, 'Select at least one seat')
    .max(9, 'A maximum of 9 seats can be held'),
});

// ── Bookings ─────────────────────────────────────────────────────
export const passengerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female', 'other']),
  nationality: z.string().trim().min(2, 'Nationality is required').max(60),
  passportNumber: z.string().trim().max(20).optional(),
  passportExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  seatId: z.string().trim().regex(/^[0-9]{1,2}[A-K]$/, 'Each passenger needs a seat'),
});

export const createBookingSchema = z
  .object({
    flightId: z.string().trim().min(1, 'Flight is required'),
    cabin: z.enum(CABIN_CLASSES),
    passengers: z.array(passengerSchema).min(1, 'At least one passenger').max(9, 'At most 9 passengers'),
    contactEmail: z.string().trim().email('Enter a valid contact email'),
    contactPhone: z.string().trim().min(8, 'Enter a valid contact phone').max(20),
    promoCode: z.string().trim().max(20).optional(),
  })
  .refine(
    (b) => {
      const seatIds = b.passengers.map((p) => p.seatId);
      return new Set(seatIds).size === seatIds.length;
    },
    { message: 'Each passenger must have a different seat' },
  );

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(280).optional(),
});

// ── Payments ─────────────────────────────────────────────────────
export const createPaymentSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking is required'),
  method: z.enum(['card', 'upi', 'netbanking', 'wallet', 'emi']),
  /** Demo only — the server never stores card numbers; PAN is discarded immediately. */
  card: z
    .object({
      holder: z.string().trim().min(2).max(80),
      last4: z.string().regex(/^\d{4}$/, 'Card number must be numeric'),
      expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be MM/YY'),
    })
    .optional(),
  /** Wallet provider name (wallet method). */
  wallet: z
    .object({
      provider: z.string().trim().min(2).max(60),
    })
    .optional(),
  /** UPI ID for the demo receipt — an identifier, never credentials. */
  upi: z
    .object({
      upiId: z.string().trim().min(3).max(60),
    })
    .optional(),
  /** Bank for the demo receipt (netbanking method). */
  netbanking: z
    .object({
      bank: z.string().trim().min(2).max(60),
    })
    .optional(),
  /** EMI plan (emi method). The demo never charges — tenure is cosmetic. */
  emi: z
    .object({
      tenureMonths: z.union([z.literal(3), z.literal(6), z.literal(9), z.literal(12)]),
    })
    .optional(),
});

// ── Admin ────────────────────────────────────────────────────────
export const adminFlightSchema = z.object({
  flightNumber: z.string().trim().regex(/^[A-Z0-9]{2}-\d{1,4}$/, 'Flight number must look like 6E-234'),
  airlineId: z.string().trim().min(1, 'Airline is required'),
  aircraftId: z.string().trim().min(1, 'Aircraft is required'),
  from: z.string().trim().length(3).toUpperCase(),
  to: z.string().trim().length(3).toUpperCase(),
  departure: z.string().datetime({ offset: true, message: 'Departure must be ISO 8601 with timezone' }),
  arrival: z.string().datetime({ offset: true, message: 'Arrival must be ISO 8601 with timezone' }),
  stops: z.number().int().min(0).max(3),
  stopCities: z.array(z.string().trim().length(3).toUpperCase()).max(3).default([]),
  basePrice: z.number().int().min(999, 'Base price must be at least 999').max(999_999),
  status: z
    .enum(['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_FLIGHT', 'LANDED', 'DELAYED', 'CANCELLED'])
    .default('SCHEDULED'),
  gate: z.string().trim().max(4).nullable().default(null),
  terminal: z.string().trim().max(2),
});

export const adminFlightActionSchema = z.object({
  action: z.enum(['delay', 'cancel', 'gate', 'terminal', 'aircraft', 'price', 'status']),
  minutes: z.number().int().min(5).max(600).optional(),
  gate: z.string().trim().max(4).optional(),
  terminal: z.string().trim().max(2).optional(),
  aircraftId: z.string().trim().min(1).optional(),
  basePrice: z.number().int().min(999).max(999_999).optional(),
  status: z
    .enum(['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_FLIGHT', 'LANDED', 'DELAYED', 'CANCELLED'])
    .optional(),
});

export type FlightSearchQuery = z.infer<typeof flightSearchSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type AdminFlightActionInput = z.infer<typeof adminFlightActionSchema>;
