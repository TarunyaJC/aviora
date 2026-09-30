import { bookingsCollection, flightsCollection, paymentsCollection } from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import { confirmHoldSeats, getEffectiveSeatMap, setSeatsOccupied } from './seat.service.js';
import type { Booking, Passenger } from '../types/domain.js';
import type { CreateBookingInput } from '../validators/schemas.js';

const REFERENCE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3456789';

/**
 * Serializes seat mutations per flight so two concurrent bookings cannot
 * grab the same seat (the JSON layer has no transactions).
 */
const seatLocks = new Map<string, Promise<unknown>>();

export async function withSeatLock<T>(flightId: string, operation: () => Promise<T>): Promise<T> {
  const previous = seatLocks.get(flightId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));

  seatLocks.set(flightId, previous.then(() => gate));
  try {
    await previous;
    return await operation();
  } finally {
    release();
  }
}

function randomReferenceCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return out;
}

function generateReference(existing: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `AV${randomReferenceCode(5)}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new ApiError(500, ErrorCodes.INTERNAL, 'Unable to allocate a booking reference');
}

async function priceBooking(input: CreateBookingInput): Promise<{ flight: import('../types/domain.js').Flight; total: number }> {
  const flights = await flightsCollection.read();
  const flight = flights.find((f) => f.id === input.flightId);
  if (!flight) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Flight not found');
  if (flight.status === 'CANCELLED') {
    throw ApiError.conflict('This flight has been cancelled and can no longer be booked');
  }

  const seats = await getEffectiveSeatMap(flight.id);
  const seatById = new Map(seats.map((s) => [s.id, s]));

  let total = 0;
  for (const passenger of input.passengers) {
    const seat = seatById.get(passenger.seatId);
    if (!seat) throw ApiError.badRequest(`Seat ${passenger.seatId} does not exist on this aircraft`);
    if (seat.zone !== input.cabin) {
      throw ApiError.badRequest(`Seat ${passenger.seatId} is not in the ${input.cabin} cabin`);
    }
    if (seat.state === 'occupied') throw ApiError.conflict(`Seat ${passenger.seatId} is no longer available`);
    total += flight.price[input.cabin] + seat.priceSurcharge;
  }

  // Simple promotions keep the demo engaging without a pricing engine.
  const discounts: Record<string, number> = { AVIORA10: 0.1, FIRSTFLY: 0.15 };
  const discountRate = input.promoCode ? (discounts[input.promoCode.toUpperCase()] ?? 0) : 0;
  total = Math.round(total * (1 - discountRate));

  return { flight, total };
}

export async function createBooking(input: CreateBookingInput, userId: string | null): Promise<Booking> {
  const { flight, total } = await priceBooking(input);

  return withSeatLock(flight.id, async () => {
    // Re-validate availability inside the lock to avoid double-booking.
    const seats = await getEffectiveSeatMap(flight.id);
    const seatById = new Map(seats.map((s) => [s.id, s]));
    for (const passenger of input.passengers) {
      const seat = seatById.get(passenger.seatId);
      if (!seat || seat.state === 'occupied') {
        throw ApiError.conflict(`Seat ${passenger.seatId} was just taken. Please choose another.`);
      }
    }

    const bookings = await bookingsCollection.read();
    const reference = generateReference(new Set(bookings.map((b) => b.reference)));
    const bookingId = `BKG-${Date.now().toString(36).toUpperCase()}${randomReferenceCode(3)}`;

    const passengers: Passenger[] = input.passengers.map((p, index) => ({
      ...p,
      id: `PSG-${bookingId}-${index + 1}`,
      cabin: input.cabin,
    }));

    const booking: Booking = {
      reference,
      id: bookingId,
      userId,
      flightId: flight.id,
      cabin: input.cabin,
      passengers,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      totalAmount: total,
      status: 'CONFIRMED',
      paymentId: null,
      createdAt: new Date().toISOString(),
    };

    await bookingsCollection.write([...bookings, booking]);
    return booking;
  });
}

/** Called by the payment service once the demo payment succeeds. */
export async function finalizeBookingSeats(booking: Booking): Promise<void> {
  await withSeatLock(booking.flightId, async () => {
    const seatIds = booking.passengers.map((p) => p.seatId);
    await confirmHoldSeats(booking.flightId, seatIds);
  });
}

export async function listBookings(filters: { userId?: string; email?: string }): Promise<Booking[]> {
  const bookings = await bookingsCollection.read();
  return bookings
    .filter((b) => {
      if (filters.userId && b.userId !== filters.userId) return false;
      if (filters.email && b.contactEmail.toLowerCase() !== filters.email.toLowerCase()) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBooking(idOrReference: string): Promise<Booking> {
  const bookings = await bookingsCollection.read();
  const needle = idOrReference.trim().toUpperCase();
  const booking = bookings.find((b) => b.id.toUpperCase() === needle || b.reference.toUpperCase() === needle);
  if (!booking) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Booking not found');
  return booking;
}

export async function cancelBooking(idOrReference: string): Promise<Booking> {
  const bookings = await bookingsCollection.read();
  const needle = idOrReference.trim().toUpperCase();
  const booking = bookings.find((b) => b.id.toUpperCase() === needle || b.reference.toUpperCase() === needle);
  if (!booking) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Booking not found');
  if (booking.status === 'CANCELLED') {
    throw ApiError.conflict('This booking is already cancelled');
  }

  const flights = await flightsCollection.read();
  const flight = flights.find((f) => f.id === booking.flightId);
  const departure = flight ? new Date(flight.departure).getTime() : Number.NaN;
  if (Number.isFinite(departure) && departure - Date.now() < 2 * 60 * 60 * 1000) {
    throw ApiError.conflict('Flights can only be cancelled up to 2 hours before departure');
  }

  booking.status = 'CANCELLED';
  await bookingsCollection.write(bookings);

  await withSeatLock(booking.flightId, async () => {
    await setSeatsOccupied(booking.flightId, booking.passengers.map((p) => p.seatId), false);
  });

  if (booking.paymentId) {
    const payments = await paymentsCollection.read();
    const payment = payments.find((p) => p.id === booking.paymentId);
    if (payment && payment.status === 'SUCCESS') {
      payment.status = 'REFUNDED';
      await paymentsCollection.write(payments);
    }
  }

  return booking;
}
