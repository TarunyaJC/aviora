/**
 * Seed script — fills the SQLite database with a professional, deterministic
 * flight catalog: 7 flagship flights (top routes & airlines) repeated every
 * day across a 15-day window (yesterday … +13 days), plus demo users,
 * bookings and payments. Run with: `npm run seed -w server`.
 *
 * Everything is derived from schedule math (no global randomness), so every
 * regeneration produces identical data. The server also auto-seeds on boot
 * when the flights table is empty.
 */
import bcrypt from 'bcryptjs';
import { getDatabase, closeDatabase } from '../repositories/sqlite/connection.js';
import { runMigrations } from '../repositories/sqlite/migrate.js';
import {
  usersCollection,
  flightsCollection,
  bookingsCollection,
  paymentsCollection,
  notificationsCollection,
  seatsCollection,
  airportsCollection,
  airlinesCollection,
  aircraftCollection,
} from '../repositories/index.js';
import type {
  Aircraft,
  Airline,
  Airport,
  Booking,
  CabinClass,
  Flight,
  FlightStatus,
  Passenger,
  Payment,
  SeatInfo,
  User,
} from '../types/domain.js';

// ── Reference data ───────────────────────────────────────────────
const AIRPORTS: Airport[] = [
  { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International', country: 'India', timezone: 'Asia/Kolkata', terminals: 3 },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International', country: 'India', timezone: 'Asia/Kolkata', terminals: 2 },
  { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International', country: 'India', timezone: 'Asia/Kolkata', terminals: 2 },
  { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
  { code: 'MAA', city: 'Chennai', name: 'Chennai International', country: 'India', timezone: 'Asia/Kolkata', terminals: 3 },
  { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International', country: 'India', timezone: 'Asia/Kolkata', terminals: 2 },
  { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International', country: 'India', timezone: 'Asia/Kolkata', terminals: 2 },
  { code: 'GOI', city: 'Goa', name: 'Dabolim Airport', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
  { code: 'PNQ', city: 'Pune', name: 'Pune International', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
  { code: 'JAI', city: 'Jaipur', name: 'Jaipur International', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International', country: 'UAE', timezone: 'Asia/Dubai', terminals: 3 },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore', timezone: 'Asia/Singapore', terminals: 4 },
  { code: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom', timezone: 'Europe/London', terminals: 5 },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand', timezone: 'Asia/Bangkok', terminals: 2 },
];

const AIRLINES: Airline[] = [
  { id: 'AL-IND', name: 'IndiGo', code: '6E', logoColor: '#4b5ae4', rating: 4.4 },
  { id: 'AL-AIC', name: 'Air India', code: 'AI', logoColor: '#c8102e', rating: 4.1 },
  { id: 'AL-VBH', name: 'Vistara', code: 'UK', logoColor: '#8c66c7', rating: 4.6 },
  { id: 'AL-SG', name: 'SpiceJet', code: 'SG', logoColor: '#e8a13a', rating: 3.9 },
  { id: 'AL-AKJ', name: 'Akasa Air', code: 'QP', logoColor: '#f26522', rating: 4.2 },
  { id: 'AL-ASA', name: 'Alaska Airlines', code: 'AS', logoColor: '#006088', rating: 4.3 },
  { id: 'AL-EK', name: 'Emirates', code: 'EK', logoColor: '#d71921', rating: 4.7 },
  { id: 'AL-BA', name: 'British Airways', code: 'BA', logoColor: '#1d428a', rating: 4.4 },
  { id: 'AL-SQ', name: 'Singapore Airlines', code: 'SQ', logoColor: '#f0a500', rating: 4.8 },
];

function aircraftFor(id: string, model: string, manufacturer: string, zones: Aircraft['cabinZones']): Aircraft {
  const rows = Math.max(...zones.map((z) => z.toRow));
  return {
    id,
    model,
    manufacturer,
    capacity: zones.reduce((sum, z) => sum + (z.toRow - z.fromRow + 1) * z.columns.length, 0),
    rows,
    cabinZones: zones,
    baggageKg: { Economy: 15, 'Premium Economy': 25, Business: 35 },
  };
}

const AIRCRAFT: Aircraft[] = [
  aircraftFor('AC-A320', 'A320neo', 'Airbus', [
    { name: 'Business', fromRow: 1, toRow: 3, columns: ['A', 'C', 'D', 'F'], priceMultiplier: 3.2 },
    { name: 'Premium Economy', fromRow: 4, toRow: 6, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1.7 },
    { name: 'Economy', fromRow: 7, toRow: 30, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-A321', 'A321neo', 'Airbus', [
    { name: 'Business', fromRow: 1, toRow: 4, columns: ['A', 'C', 'D', 'F'], priceMultiplier: 3.4 },
    { name: 'Premium Economy', fromRow: 5, toRow: 8, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1.75 },
    { name: 'Economy', fromRow: 9, toRow: 36, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-B738', 'B737-800', 'Boeing', [
    { name: 'Business', fromRow: 1, toRow: 3, columns: ['A', 'B', 'E', 'F'], priceMultiplier: 3.0 },
    { name: 'Premium Economy', fromRow: 4, toRow: 5, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1.6 },
    { name: 'Economy', fromRow: 6, toRow: 32, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-B787', 'B787-9 Dreamliner', 'Boeing', [
    { name: 'Business', fromRow: 1, toRow: 8, columns: ['A', 'D', 'G', 'K'], priceMultiplier: 4.5 },
    { name: 'Premium Economy', fromRow: 10, toRow: 15, columns: ['A', 'C', 'D', 'F', 'G', 'J', 'K'], priceMultiplier: 1.9 },
    { name: 'Economy', fromRow: 17, toRow: 45, columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-A350', 'A350-900', 'Airbus', [
    { name: 'Business', fromRow: 1, toRow: 7, columns: ['A', 'D', 'G', 'K'], priceMultiplier: 4.8 },
    { name: 'Premium Economy', fromRow: 9, toRow: 14, columns: ['A', 'C', 'D', 'F', 'G', 'J', 'K'], priceMultiplier: 1.95 },
    { name: 'Economy', fromRow: 16, toRow: 43, columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-B773', 'B777-300ER', 'Boeing', [
    { name: 'Business', fromRow: 1, toRow: 8, columns: ['A', 'D', 'G', 'K'], priceMultiplier: 4.4 },
    { name: 'Premium Economy', fromRow: 10, toRow: 16, columns: ['A', 'C', 'D', 'F', 'G', 'J', 'K'], priceMultiplier: 1.85 },
    { name: 'Economy', fromRow: 18, toRow: 47, columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'], priceMultiplier: 1 },
  ]),
  aircraftFor('AC-A380', 'A380-800', 'Airbus', [
    { name: 'Business', fromRow: 1, toRow: 9, columns: ['A', 'D', 'G', 'K'], priceMultiplier: 4.9 },
    { name: 'Premium Economy', fromRow: 11, toRow: 18, columns: ['A', 'C', 'D', 'F', 'G', 'J', 'K'], priceMultiplier: 2.0 },
    { name: 'Economy', fromRow: 20, toRow: 52, columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'], priceMultiplier: 1 },
  ]),
];

// ── Users ────────────────────────────────────────────────────────
function buildUsers(): User[] {
  const hash = (pw: string): string => bcrypt.hashSync(pw, 10);
  return [
    { id: 'USR-001', name: 'Demo User', email: 'user@example.com', passwordHash: hash('user123'), role: 'USER', createdAt: '2026-01-05T09:00:00.000Z' },
    { id: 'ADM-001', name: 'System Administrator', email: 'admin@example.com', passwordHash: hash('admin123'), role: 'ADMIN', createdAt: '2026-01-01T09:00:00.000Z' },
    { id: 'USR-002', name: 'Aarav Sharma', email: 'aarav@example.com', passwordHash: hash('user123'), role: 'USER', createdAt: '2026-02-11T09:00:00.000Z' },
    { id: 'USR-003', name: 'Zoya Khan', email: 'zoya@example.com', passwordHash: hash('user123'), role: 'USER', createdAt: '2026-03-19T09:00:00.000Z' },
  ];
}

// ── Flagship daily flights ───────────────────────────────────────
interface CatalogRoute {
  from: string;
  to: string;
  minutes: number;
  international: boolean;
}

/** Domestic + international network. Several routes operate MULTIPLE daily banks. */
const ROUTES: Array<CatalogRoute & { depTime: string; bank: number }> = [
  // ── Delhi trunk & regional ──
  { from: 'DEL', to: 'BOM', minutes: 135, international: false, depTime: '06:00', bank: 1 },
  { from: 'DEL', to: 'BOM', minutes: 135, international: false, depTime: '11:30', bank: 2 },
  { from: 'DEL', to: 'BOM', minutes: 135, international: false, depTime: '18:15', bank: 3 },
  { from: 'BOM', to: 'DEL', minutes: 130, international: false, depTime: '09:30', bank: 1 },
  { from: 'BOM', to: 'DEL', minutes: 130, international: false, depTime: '15:00', bank: 2 },
  { from: 'DEL', to: 'BLR', minutes: 165, international: false, depTime: '07:45', bank: 1 },
  { from: 'DEL', to: 'BLR', minutes: 165, international: false, depTime: '13:00', bank: 2 },
  { from: 'BLR', to: 'DEL', minutes: 160, international: false, depTime: '10:30', bank: 1 },
  { from: 'DEL', to: 'HYD', minutes: 130, international: false, depTime: '08:20', bank: 1 },
  { from: 'HYD', to: 'DEL', minutes: 125, international: false, depTime: '11:45', bank: 1 },
  { from: 'DEL', to: 'MAA', minutes: 175, international: false, depTime: '14:10', bank: 1 },
  { from: 'MAA', to: 'DEL', minutes: 175, international: false, depTime: '17:00', bank: 1 },
  { from: 'DEL', to: 'CCU', minutes: 125, international: false, depTime: '10:00', bank: 1 },
  { from: 'CCU', to: 'DEL', minutes: 120, international: false, depTime: '13:30', bank: 1 },
  { from: 'DEL', to: 'PNQ', minutes: 125, international: false, depTime: '06:40', bank: 1 },
  { from: 'DEL', to: 'JAI', minutes: 60, international: false, depTime: '07:15', bank: 1 },
  { from: 'JAI', to: 'DEL', minutes: 60, international: false, depTime: '09:00', bank: 1 },
  { from: 'DEL', to: 'AMD', minutes: 85, international: false, depTime: '16:40', bank: 1 },
  // ── Mumbai network ──
  { from: 'BOM', to: 'BLR', minutes: 100, international: false, depTime: '08:00', bank: 1 },
  { from: 'BOM', to: 'BLR', minutes: 100, international: false, depTime: '17:30', bank: 2 },
  { from: 'BLR', to: 'BOM', minutes: 95, international: false, depTime: '12:00', bank: 1 },
  { from: 'BOM', to: 'GOI', minutes: 75, international: false, depTime: '10:15', bank: 1 },
  { from: 'BOM', to: 'GOI', minutes: 75, international: false, depTime: '16:30', bank: 2 },
  { from: 'GOI', to: 'BOM', minutes: 75, international: false, depTime: '13:45', bank: 1 },
  { from: 'BOM', to: 'HYD', minutes: 80, international: false, depTime: '07:30', bank: 1 },
  { from: 'BOM', to: 'AMD', minutes: 65, international: false, depTime: '15:45', bank: 1 },
  // ── South & east corridors ──
  { from: 'BLR', to: 'HYD', minutes: 60, international: false, depTime: '09:10', bank: 1 },
  { from: 'BLR', to: 'CCU', minutes: 145, international: false, depTime: '18:00', bank: 1 },
  { from: 'BLR', to: 'MAA', minutes: 65, international: false, depTime: '11:20', bank: 1 },
  { from: 'HYD', to: 'BOM', minutes: 80, international: false, depTime: '14:30', bank: 1 },
  // ── International: Gulf, Southeast Asia, Europe ──
  { from: 'DEL', to: 'DXB', minutes: 215, international: true, depTime: '20:00', bank: 1 },
  { from: 'DEL', to: 'DXB', minutes: 215, international: true, depTime: '04:30', bank: 2 },
  { from: 'BOM', to: 'DXB', minutes: 190, international: true, depTime: '08:00', bank: 1 },
  { from: 'DXB', to: 'DEL', minutes: 180, international: true, depTime: '10:20', bank: 1 },
  { from: 'BOM', to: 'SIN', minutes: 315, international: true, depTime: '22:45', bank: 1 },
  { from: 'SIN', to: 'DEL', minutes: 300, international: true, depTime: '23:30', bank: 1 },
  { from: 'DEL', to: 'BKK', minutes: 255, international: true, depTime: '21:30', bank: 1 },
  { from: 'BOM', to: 'BKK', minutes: 270, international: true, depTime: '12:50', bank: 1 },
  { from: 'DEL', to: 'LHR', minutes: 540, international: true, depTime: '01:15', bank: 1 },
  { from: 'DEL', to: 'LHR', minutes: 540, international: true, depTime: '07:00', bank: 2 },
  { from: 'BOM', to: 'LHR', minutes: 560, international: true, depTime: '02:45', bank: 1 },
  { from: 'LHR', to: 'DEL', minutes: 510, international: true, depTime: '21:15', bank: 1 },
];

const AIRLINE_ALL = ['AL-IND', 'AL-AIC', 'AL-VBH', 'AL-SG', 'AL-AKJ', 'AL-ASA', 'AL-EK', 'AL-BA', 'AL-SQ'];
const AIRLINE_INTERNATIONAL = ['AL-AIC', 'AL-VBH', 'AL-EK', 'AL-BA', 'AL-SQ'];

/** Airline pools per route pair so schedules look operationally plausible. */
const AIRLINES_BY_ROUTE: Record<string, string[]> = {
  'DEL-BOM': ['AL-IND', 'AL-AIC', 'AL-VBH', 'AL-SG', 'AL-AKJ', 'AL-ASA'],
  'BOM-DEL': ['AL-IND', 'AL-AIC', 'AL-VBH', 'AL-SG', 'AL-ASA'],
  'DEL-BLR': ['AL-IND', 'AL-AIC', 'AL-VBH'],
  'BLR-DEL': ['AL-IND', 'AL-AIC', 'AL-VBH'],
  'DEL-HYD': ['AL-IND', 'AL-SG', 'AL-AKJ'],
  'HYD-DEL': ['AL-IND', 'AL-SG'],
  'DEL-MAA': ['AL-IND', 'AL-AIC'],
  'MAA-DEL': ['AL-IND', 'AL-AIC'],
  'DEL-CCU': ['AL-IND', 'AL-SG', 'AL-AKJ'],
  'CCU-DEL': ['AL-IND', 'AL-SG'],
  'DEL-PNQ': ['AL-IND', 'AL-SG'],
  'DEL-JAI': ['AL-IND', 'AL-AKJ'],
  'JAI-DEL': ['AL-IND', 'AL-AKJ'],
  'DEL-AMD': ['AL-IND', 'AL-SG'],
  'BOM-BLR': ['AL-IND', 'AL-AIC', 'AL-AKJ'],
  'BLR-BOM': ['AL-IND', 'AL-AIC'],
  'BOM-GOI': ['AL-IND', 'AL-SG', 'AL-AKJ', 'AL-ASA'],
  'GOI-BOM': ['AL-IND', 'AL-SG'],
  'BOM-HYD': ['AL-IND', 'AL-SG'],
  'BOM-AMD': ['AL-IND', 'AL-AKJ'],
  'BLR-HYD': ['AL-IND', 'AL-AKJ', 'AL-ASA'],
  'BLR-CCU': ['AL-IND', 'AL-AIC'],
  'BLR-MAA': ['AL-IND', 'AL-AKJ'],
  'HYD-BOM': ['AL-IND', 'AL-SG'],
  'DEL-DXB': ['AL-AIC', 'AL-EK'],
  'BOM-DXB': ['AL-AIC', 'AL-EK'],
  'DXB-DEL': ['AL-EK', 'AL-AIC'],
  'BOM-SIN': ['AL-SQ', 'AL-AIC'],
  'SIN-DEL': ['AL-SQ', 'AL-AIC'],
  'DEL-BKK': ['AL-AIC', 'AL-SQ'],
  'BOM-BKK': ['AL-AIC', 'AL-SQ'],
  'DEL-LHR': ['AL-AIC', 'AL-BA', 'AL-VBH'],
  'BOM-LHR': ['AL-BA', 'AL-AIC'],
  'LHR-DEL': ['AL-BA', 'AL-AIC'],
};

const AIRLINES_BY_ROUTE_FALLBACK = AIRLINE_INTERNATIONAL;

function priceFor(minutes: number, multiplier: number, airlineId: string): number {
  const airlineIndex = AIRLINE_ALL.indexOf(airlineId);
  const airlineFactor = 0.94 + airlineIndex * 0.035;
  const base = 2200 + minutes * 12.5 * airlineFactor;
  return Math.max(1799, Math.round((base * multiplier) / 10) * 10 - 1);
}

const NARROWBODY_IDS = ['AC-A320', 'AC-A321', 'AC-B738'];
const AIRCRAFT_BY_AIRLINE: Record<string, string[]> = {
  'AL-EK': ['AC-A380', 'AC-B773'],
  'AL-BA': ['AC-B773', 'AC-A350'],
  'AL-SQ': ['AC-A350', 'AC-B773'],
  'AL-AIC': ['AC-B787', 'AC-A350', 'AC-A321'],
  'AL-VBH': ['AC-A321', 'AC-A320', 'AC-B787'],
  'AL-IND': ['AC-A320', 'AC-A321', 'AC-B738'],
  'AL-SG': ['AC-B738', 'AC-A320'],
  'AL-AKJ': ['AC-B738', 'AC-A320'],
  'AL-ASA': ['AC-B738', 'AC-A321'],
};

function aircraftForAirline(airlineId: string, rotation: number): Aircraft {
  const ids = AIRCRAFT_BY_AIRLINE[airlineId] ?? NARROWBODY_IDS;
  const id = ids[rotation % ids.length]!;
  return AIRCRAFT.find((ac) => ac.id === id)!;
}

function seatPositionFor(letter: string): SeatInfo['position'] {
  if (letter === 'A' || letter === 'F' || letter === 'K') return 'window';
  if (letter === 'C' || letter === 'D' || letter === 'G' || letter === 'J') return 'aisle';
  return 'middle';
}

/** Deterministic seat map with stable per-flight occupancy. */
function buildSeatsForAircraft(aircraft: Aircraft, dayIndex: number, slot: number): SeatInfo[] {
  const seats: SeatInfo[] = [];
  const seedNum = dayIndex * 10 + slot + 3;
  const occupancyPct = [12, 24, 36, 20, 30, 26, 16][slot] ?? 24;

  for (const zone of aircraft.cabinZones) {
    for (let row = zone.fromRow; row <= zone.toRow; row += 1) {
      for (const letter of zone.columns) {
        const position = seatPositionFor(letter);
        const ordinal = row * 10 + letter.charCodeAt(0) - 64;
        const pseudo = ((ordinal * 31 + seedNum * 17) % 100);
        const occupied = pseudo < occupancyPct;
        const isExit = row === zone.fromRow || row % 15 === 0;
        seats.push({
          id: `${row}${letter}`,
          row,
          letter,
          zone: zone.name,
          state: occupied ? 'occupied' : 'available',
          isExitRow: isExit,
          position,
          priceSurcharge:
            zone.name === 'Business' ? 0 : position === 'window' ? 350 : position === 'aisle' ? 200 : 0,
        });
      }
    }
  }

  // Guarantee at least 30 free seats so demo searches always bookable.
  const available = seats.filter((s) => s.state === 'available');
  if (available.length < 30) {
    for (let i = 0; available.length < 30 && i < seats.length; i += 1) {
      if (seats[i]!.state === 'occupied') {
        seats[i]!.state = 'available';
        available.push(seats[i]!);
      }
    }
  }
  return seats;
}

function buildFlightCatalog(now = new Date()): {
  flights: Flight[];
  seatMaps: Array<{ id: string; seats: SeatInfo[] }>;
} {
  const flights: Flight[] = [];
  const seatMaps: Array<{ id: string; seats: SeatInfo[] }> = [];
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 1); // include yesterday
  windowStart.setUTCHours(0, 0, 0, 0);
  const todayIso = now.toISOString();

  let seq = 1;
  for (let dayIndex = 0; dayIndex < 15; dayIndex += 1) {
    for (let slot = 0; slot < ROUTES.length; slot += 1) {
      const route = ROUTES[slot]!;
      const routeKey = `${route.from}-${route.to}`;
      const pool = AIRLINES_BY_ROUTE[routeKey] ?? AIRLINES_BY_ROUTE_FALLBACK;
      const airlineId = pool[(dayIndex + slot) % pool.length]!;
      const airline = AIRLINES.find((a) => a.id === airlineId)!;
      const aircraft = aircraftForAirline(airlineId, dayIndex + slot);

      const depDate = new Date(windowStart);
      depDate.setUTCDate(depDate.getUTCDate() + dayIndex);
      const [depHour, depMinute] = route.depTime.split(':').map(Number);
      depDate.setUTCHours(depHour!, depMinute!, 0, 0);
      const arrival = new Date(depDate.getTime() + route.minutes * 60_000);

      const id = `FLT-${String(seq).padStart(3, '0')}`;
      seq += 1;

      // Realistic lifecycle relative to `now`: landed → in flight → boarding → scheduled.
      const nowMs = now.getTime();
      const depMs = depDate.getTime();
      const arrMs = arrival.getTime();
      let status: FlightStatus = 'SCHEDULED';
      if (arrMs < nowMs) status = 'LANDED';
      else if (depMs < nowMs) status = 'IN_FLIGHT';
      else if (depMs - nowMs < 45 * 60_000) status = 'BOARDING';
      else if (dayIndex === 1 && slot === 2) status = 'DELAYED'; // one deterministic delay today
      const gate = status === 'LANDED' ? null : String(1 + ((dayIndex * 7 + slot * 3) % 45));

      const basePrice = priceFor(route.minutes, 1, airlineId);
      const flight: Flight = {
        id,
        flightNumber: `${airline.code}-${100 + ((dayIndex * ROUTES.length + slot) % 900)}`,
        airlineId,
        aircraftId: aircraft.id,
        from: route.from,
        to: route.to,
        departure: depDate.toISOString(),
        arrival: arrival.toISOString(),
        durationMinutes: route.minutes,
        stops: 0,
        stopCities: [],
        basePrice,
        price: {
          Economy: basePrice,
          'Premium Economy': priceFor(route.minutes, aircraft.cabinZones[1]!.priceMultiplier, airlineId),
          Business: priceFor(route.minutes, aircraft.cabinZones[0]!.priceMultiplier, airlineId),
        },
        status,
        gate,
        terminal: route.international ? '3' : String(1 + (dayIndex % 2)),
        baggageKg: aircraft.baggageKg,
        createdAt: todayIso,
      };
      flights.push(flight);
      seatMaps.push({ id, seats: buildSeatsForAircraft(aircraft, dayIndex, slot) });
    }
  }

  return { flights, seatMaps };
}

// ── Demo bookings + payments ─────────────────────────────────────
let seatMapsRef: Map<string, { id: string; seats: SeatInfo[] }> = new Map();

function demoPassenger(
  id: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  gender: Passenger['gender'],
  seatId: string,
  cabin: CabinClass,
): Passenger {
  return { id, firstName, lastName, dateOfBirth, gender, nationality: 'Indian', seatId, cabin };
}

function buildDemoActivity(flights: Flight[]): { bookings: Booking[]; payments: Payment[] } {
  const today = Date.now();
  const iso = (ms: number): string => new Date(ms).toISOString();
  const createdAt = iso(today - 12 * 3_600_000);
  const findFlight = (from: string, to: string, minDayOffset: number): Flight =>
    flights.find(
      (f) =>
        f.from === from &&
        f.to === to &&
        new Date(f.departure).getTime() > today + minDayOffset * 86_400_000,
    )!;

  const delFlight = findFlight('DEL', 'BOM', 1); // 2-passenger demo booking
  const bomFlight = findFlight('BOM', 'DEL', 2);
  const goiFlight = findFlight('BOM', 'GOI', 3); // BOM→GOI evening
  const dxbFlight = findFlight('DEL', 'DXB', 4); // Business cabin on the Dubai route

  const bookings: Booking[] = [];
  const payments: Payment[] = [];

  // B1 — TWO PASSENGERS (showcases the multi-passenger flow), card, promo applied.
  {
    const subtotal = delFlight.price.Economy * 2 + 350 + 200;
    const amount = Math.round(subtotal * 0.9);
    payments.push({
      id: 'PAY-DEMO-001', bookingId: 'BKG-DEMO-001', amount, currency: 'INR', method: 'card',
      status: 'SUCCESS', demo: true, methodDetail: { brand: 'Visa', last4: '4242', holder: 'Demo User' },
      transactionRef: 'TXN-DEMO-001', createdAt, processedAt: createdAt,
    });
    bookings.push({
      reference: 'AV8QXKM', id: 'BKG-DEMO-001', userId: 'USR-001', flightId: delFlight.id,
      cabin: 'Economy',
      passengers: [
        demoPassenger('PSG-001', 'Aarav', 'Sharma', '1994-03-12', 'male', '14A', 'Economy'),
        demoPassenger('PSG-002', 'Zoya', 'Khan', '1997-11-02', 'female', '14B', 'Economy'),
      ],
      contactEmail: 'user@example.com', contactPhone: '+91 98100 00000', totalAmount: amount,
      status: 'CONFIRMED', paymentId: 'PAY-DEMO-001', createdAt,
    });
  }

  // B2 — single passenger, UPI.
  {
    payments.push({
      id: 'PAY-DEMO-002', bookingId: 'BKG-DEMO-002', amount: bomFlight.price.Economy + 350,
      currency: 'INR', method: 'upi', status: 'SUCCESS', demo: true,
      methodDetail: { upiId: 'demo@aviora' }, transactionRef: 'TXN-DEMO-002',
      createdAt, processedAt: createdAt,
    });
    bookings.push({
      reference: 'AV3KMTZ', id: 'BKG-DEMO-002', userId: 'USR-002', flightId: bomFlight.id,
      cabin: 'Economy',
      passengers: [demoPassenger('PSG-003', 'Meera', 'Iyer', '1988-06-25', 'female', '18C', 'Economy')],
      contactEmail: 'aarav@example.com', contactPhone: '+91 98200 00000',
      totalAmount: bomFlight.price.Economy + 350, status: 'CONFIRMED',
      paymentId: 'PAY-DEMO-002', createdAt,
    });
  }

  // B3 — single passenger, wallet.
  {
    payments.push({
      id: 'PAY-DEMO-003', bookingId: 'BKG-DEMO-003', amount: goiFlight.price.Economy + 200,
      currency: 'INR', method: 'wallet', status: 'SUCCESS', demo: true,
      methodDetail: { provider: 'PayDemo Wallet' }, transactionRef: 'TXN-DEMO-003',
      createdAt, processedAt: createdAt,
    });
    bookings.push({
      reference: 'AV7TQLP', id: 'BKG-DEMO-003', userId: 'USR-001', flightId: goiFlight.id,
      cabin: 'Economy',
      passengers: [demoPassenger('PSG-004', 'Rohan', 'Verma', '1990-01-17', 'male', '21D', 'Economy')],
      contactEmail: 'user@example.com', contactPhone: '+91 98100 00000',
      totalAmount: goiFlight.price.Economy + 200, status: 'CONFIRMED',
      paymentId: 'PAY-DEMO-003', createdAt,
    });
  }

  // B4 — Business cabin, netbanking.
  {
    payments.push({
      id: 'PAY-DEMO-004', bookingId: 'BKG-DEMO-004', amount: dxbFlight.price.Business + 0,
      currency: 'INR', method: 'netbanking', status: 'SUCCESS', demo: true,
      methodDetail: { bank: 'HDFC Bank' }, transactionRef: 'TXN-DEMO-004',
      createdAt, processedAt: createdAt,
    });
    bookings.push({
      reference: 'AV5LPRD', id: 'BKG-DEMO-004', userId: 'USR-003', flightId: dxbFlight.id,
      cabin: 'Business',
      passengers: [demoPassenger('PSG-005', 'Zoya', 'Khan', '1997-11-02', 'female', '2A', 'Business')],
      contactEmail: 'zoya@example.com', contactPhone: '+91 98300 00000',
      totalAmount: dxbFlight.price.Business, status: 'CONFIRMED',
      paymentId: 'PAY-DEMO-004', createdAt,
    });
  }

  // Mark the demo seats occupied in the affected seat maps.
  for (const booking of bookings) {
    const record = seatMapsRef.get(booking.flightId);
    if (!record) continue;
    for (const p of booking.passengers) {
      const seat = record.seats.find((s) => s.id === p.seatId);
      if (seat) seat.state = 'occupied';
    }
  }

  return { bookings, payments };
}

// ── Orchestration ────────────────────────────────────────────────
export async function seedDatabase(now = new Date()): Promise<{
  flights: number; users: number; bookings: number; payments: number; seats: number;
}> {
  const db = getDatabase();
  runMigrations(db);

  const users = buildUsers();
  const { flights, seatMaps } = buildFlightCatalog(now);
  seatMapsRef = new Map(seatMaps.map((s) => [s.id, s]));
  const { bookings, payments } = buildDemoActivity(flights);

  await airportsCollection.write(AIRPORTS);
  await airlinesCollection.write(AIRLINES);
  await aircraftCollection.write(AIRCRAFT);
  await usersCollection.write(users);
  await flightsCollection.write(flights);
  await seatsCollection.write(seatMaps);
  await bookingsCollection.write(bookings);
  await paymentsCollection.write(payments);
  await notificationsCollection.write([
    {
      id: 'NTF-DEMO-001', userId: 'USR-001', title: 'Booking confirmed',
      body: 'Your booking AV8QXKM is confirmed. E-tickets are ready in My Bookings.',
      read: false, createdAt: new Date().toISOString(),
    },
    {
      id: 'NTF-DEMO-002', userId: 'USR-001', title: 'Check-in open',
      body: 'Web check-in for AV7TQLP opens 48 hours before departure.',
      read: false, createdAt: new Date().toISOString(),
    },
  ]);

  return {
    flights: flights.length,
    users: users.length,
    bookings: bookings.length,
    payments: payments.length,
    seats: seatMaps.reduce((sum, m) => sum + m.seats.length, 0),
  };
}

export function isDatabaseSeeded(): boolean {
  const row = getDatabase().prepare('SELECT COUNT(*) AS count FROM flights').get() as
    | { count: number }
    | undefined;
  return (row?.count ?? 0) > 0;
}

async function main(): Promise<void> {
  const summary = await seedDatabase();
  console.log(
    `[AVIORA] Seeded SQLite → ${summary.flights} flights (${ROUTES.length} scheduled legs × 15 days), ` +
      `${AIRPORTS.length} airports, ${AIRLINES.length} airlines, ${AIRCRAFT.length} aircraft, ` +
      `${summary.users} users, ${summary.bookings} demo bookings, ${summary.payments} payments, ` +
      `${summary.seats} seat records.`,
  );
  closeDatabase();
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('seed.ts') ?? false;
if (invokedDirectly) {
  main().catch((error) => {
    console.error('[AVIORA] Seed failed:', error);
    process.exit(1);
  });
}
