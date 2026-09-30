import { randomUUID } from 'node:crypto';
import { seatsCollection } from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import type { SeatInfo } from '../types/domain.js';

const HOLD_TTL_MS = 10 * 60 * 1000;

interface SeatHold {
  holdId: string;
  flightId: string;
  seatIds: Set<string>;
  expiresAt: number;
}

/**
 * Holds live in memory only — they are transient reservations that expire.
 * This is exactly the kind of state that should NOT touch the JSON layer.
 */
const activeHolds = new Map<string, SeatHold>(); // holdId -> hold
const holdsBySeat = new Map<string, Map<string, string>>(); // flightId -> (seatId -> holdId)

function expireStaleHolds(now = Date.now()): void {
  for (const hold of activeHolds.values()) {
    if (hold.expiresAt <= now) {
      releaseHoldInternal(hold);
    }
  }
}

function releaseHoldInternal(hold: SeatHold): void {
  activeHolds.delete(hold.holdId);
  const seatMap = holdsBySeat.get(hold.flightId);
  if (seatMap) {
    for (const seatId of hold.seatIds) {
      if (seatMap.get(seatId) === hold.holdId) seatMap.delete(seatId);
    }
    if (seatMap.size === 0) holdsBySeat.delete(hold.flightId);
  }
}

export async function getEffectiveSeatMap(flightId: string): Promise<SeatInfo[]> {
  const record = await seatsCollection.read().then((rows) => rows.find((r) => r.id === flightId));
  if (!record) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Seat map not found for this flight');

  const holds = holdsBySeat.get(flightId);
  if (!holds || holds.size === 0) return record.seats;

  const now = Date.now();
  return record.seats.map((seat) => {
    const holdId = holds.get(seat.id);
    if (holdId) {
      const hold = activeHolds.get(holdId);
      if (hold && hold.expiresAt > now) return { ...seat, state: 'held' as const };
    }
    return seat;
  });
}

export async function holdSeats(flightId: string, seatIds: string[]): Promise<{
  holdId: string;
  expiresAt: string;
  seats: SeatInfo[];
}> {
  expireStaleHolds();
  const records = await seatsCollection.read();
  const record = records.find((r) => r.id === flightId);
  if (!record) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Seat map not found for this flight');

  const seatById = new Map(record.seats.map((s) => [s.id, s]));
  const flightHolds = holdsBySeat.get(flightId) ?? new Map<string, string>();

  for (const seatId of seatIds) {
    const seat = seatById.get(seatId);
    if (!seat) {
      throw ApiError.badRequest(`Seat ${seatId} does not exist on this aircraft`);
    }
    if (seat.state === 'occupied') {
      throw ApiError.conflict(`Seat ${seatId} is already taken`);
    }
    const existingHoldId = flightHolds.get(seatId);
    if (existingHoldId && existingHoldId !== '' && activeHolds.has(existingHoldId)) {
      throw ApiError.conflict(`Seat ${seatId} is being reserved by another passenger`);
    }
  }

  const holdId = randomUUID();
  const expiresAt = Date.now() + HOLD_TTL_MS;
  activeHolds.set(holdId, { holdId, flightId, seatIds: new Set(seatIds), expiresAt });
  const seatMap = holdsBySeat.get(flightId) ?? new Map<string, string>();
  for (const seatId of seatIds) seatMap.set(seatId, holdId);
  holdsBySeat.set(flightId, seatMap);

  return {
    holdId,
    expiresAt: new Date(expiresAt).toISOString(),
    seats: record.seats.filter((s) => seatIds.includes(s.id)).map((s) => ({ ...s, state: 'held' as const })),
  };
}

/** Convert a live hold into permanently occupied seats (called during booking confirmation). */
export async function confirmHoldSeats(flightId: string, seatIds: string[]): Promise<void> {
  const records = await seatsCollection.read();
  const record = records.find((r) => r.id === flightId);
  if (!record) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Seat map not found for this flight');
  for (const seat of record.seats) {
    if (seatIds.includes(seat.id)) {
      seat.state = 'occupied';
    }
  }
  await seatsCollection.write(records);
}

/** Release a hold explicitly (user backed out or flow restarted). */
export function releaseHold(holdId: string): void {
  const hold = activeHolds.get(holdId);
  if (hold) releaseHoldInternal(hold);
}

/** Direct occupancy update used by booking/cancellation flows (must run under the seat lock). */
export async function setSeatsOccupied(flightId: string, seatIds: string[], occupied: boolean): Promise<void> {
  const records = await seatsCollection.read();
  const record = records.find((r) => r.id === flightId);
  if (!record) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Seat map not found for this flight');
  for (const seat of record.seats) {
    if (seatIds.includes(seat.id)) {
      seat.state = occupied ? 'occupied' : 'available';
    }
  }
  await seatsCollection.write(records);
}
