import { SqliteCollection, SqliteReferenceRepository } from './sqlite/collections.js';
import type {
  Aircraft,
  Airline,
  Airport,
  Booking,
  Flight,
  Notification,
  Payment,
  SeatInfo,
  User,
} from '../types/domain.js';

/**
 * Persistence facade — every collection is backed by the built-in SQLite
 * engine (node:sqlite) through a lossless JSON payload, so services keep
 * their exact `read()/write()` contract. Location:
 *   - $AVIORA_DB_PATH, or
 *   - $AVIORA_DATA_DIR/aviora.db, or
 *   - <repo>/server/data/aviora.db
 */

/** Passengers live inside their booking records (see Booking.passengers). */

/** Seat state per flight — one record per flight, `id` holds the flightId. */
export interface FlightSeatRecord {
  id: string; // flightId
  seats: SeatInfo[];
}

export const usersCollection = new SqliteCollection<User>('users', {
  columns: (u) => ({ email: u.email, role: u.role }),
});

export const flightsCollection = new SqliteCollection<Flight>('flights', {
  columns: (f) => ({
    flightNumber: f.flightNumber,
    origin: f.from,
    destination: f.to,
    departure: f.departure,
    status: f.status,
  }),
});

export const bookingsCollection = new SqliteCollection<Booking>('bookings', {
  columns: (b) => ({
    reference: b.reference,
    userId: b.userId,
    flightId: b.flightId,
    status: b.status,
    contactEmail: b.contactEmail,
  }),
});

export const paymentsCollection = new SqliteCollection<Payment>('payments', {
  columns: (p) => ({ bookingId: p.bookingId, status: p.status }),
});

export const notificationsCollection = new SqliteCollection<Notification>('notifications', {
  columns: (n) => ({ userId: n.userId }),
});

export const seatsCollection = new SqliteCollection<FlightSeatRecord>('seats');

/** Reference data is read-only from the API's perspective. */
export const airportsCollection = new SqliteCollection<Airport>('airports', {
  idField: 'code',
  columns: (a) => ({ country: a.country }),
});
export const airlinesCollection = new SqliteCollection<Airline>('airlines', {
  columns: (a) => ({ code: a.code }),
});
export const aircraftCollection = new SqliteCollection<Aircraft>('aircraft', {
  columns: (a) => ({ model: a.model }),
});

export async function allAirports(): Promise<Airport[]> {
  return airportsCollection.read();
}

export const airlinesRepo = new SqliteReferenceRepository<Airline>(airlinesCollection);
export const aircraftRepo = new SqliteReferenceRepository<Aircraft>(aircraftCollection);
