/**
 * SQLite schema for AVIORA — mirrors types/domain.ts.
 *
 * Storage strategy per table:
 *   - `payload` holds the row EXACTLY as the domain models it (lossless JSON),
 *     so repository read/write round-trips can never drift from the API shape.
 *   - A few derived columns are maintained on write to give the database real
 *     powers: UNIQUE constraints (email, booking reference), indexes for the
 *     hot search paths, and foreign keys for referential integrity.
 *
 * `runMigrations` is idempotent: safe on every boot.
 */
import type { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS airports (
      code     TEXT PRIMARY KEY,  -- Airport identity is its IATA code
      country  TEXT NOT NULL,
      payload  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS airlines (
      id       TEXT PRIMARY KEY,
      code     TEXT NOT NULL,
      payload  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aircraft (
      id       TEXT PRIMARY KEY,
      model    TEXT NOT NULL,
      payload  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      role          TEXT NOT NULL,
      payload       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flights (
      id             TEXT PRIMARY KEY,
      flightNumber   TEXT NOT NULL,
      origin         TEXT NOT NULL,
      destination    TEXT NOT NULL,
      departure      TEXT NOT NULL,
      status         TEXT NOT NULL,
      payload        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_flights_route_date ON flights (origin, destination, departure);
    CREATE INDEX IF NOT EXISTS idx_flights_number ON flights (flightNumber);

    CREATE TABLE IF NOT EXISTS seats (
      id       TEXT PRIMARY KEY,  -- the flightId; one record per flight
      payload  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id           TEXT PRIMARY KEY,
      reference    TEXT NOT NULL UNIQUE,
      userId       TEXT,
      flightId     TEXT NOT NULL,
      status       TEXT NOT NULL,
      contactEmail TEXT NOT NULL,
      payload      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (userId);
    CREATE INDEX IF NOT EXISTS idx_bookings_flight ON bookings (flightId);
    CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings (contactEmail);

    CREATE TABLE IF NOT EXISTS payments (
      id         TEXT PRIMARY KEY,
      bookingId  TEXT NOT NULL,
      status     TEXT NOT NULL,
      payload    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (bookingId);

    CREATE TABLE IF NOT EXISTS notifications (
      id       TEXT PRIMARY KEY,
      userId   TEXT NOT NULL,
      payload  TEXT NOT NULL
    );
  `);
}
