import {
  aircraftRepo,
  allAirports,
  airlinesRepo,
  flightsCollection,
  seatsCollection,
} from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import type { Aircraft, Airline, CabinClass, Flight, SeatInfo } from '../types/domain.js';
import type { FlightSearchQuery } from '../validators/schemas.js';

export interface FlightWithMeta extends Flight {
  airline: Pick<Airline, 'id' | 'name' | 'code' | 'logoColor' | 'rating'>;
  aircraft: Pick<Aircraft, 'id' | 'model' | 'manufacturer'>;
}

const DEFAULT_PAGE_SIZE = 20;

function departureWindowHourRange(window: NonNullable<FlightSearchQuery['departureWindow']>): [number, number] {
  switch (window) {
    case 'morning':
      return [5, 11];
    case 'afternoon':
      return [12, 16];
    case 'evening':
      return [17, 20];
    case 'night':
      return [21, 29]; // 21:00–04:59 — normalized hour + 24 covers 0..4
    default:
      return [0, 29]; // 'any'
  }
}

function inDepartureWindow(flight: Flight, window: NonNullable<FlightSearchQuery['departureWindow']>): boolean {
  const hour = new Date(flight.departure).getUTCHours();
  const [start, end] = departureWindowHourRange(window);
  const normalized = hour < 5 && window === 'night' ? hour + 24 : hour;
  return normalized >= start && normalized <= end;
}

async function buildMetaMaps(): Promise<{
  airlines: Map<string, Airline>;
  aircraft: Map<string, Aircraft>;
}> {
  const [airlines, aircraft] = await Promise.all([airlinesRepo.all(), aircraftRepo.all()]);
  return {
    airlines: new Map(airlines.map((a) => [a.id, a])),
    aircraft: new Map(aircraft.map((a) => [a.id, a])),
  };
}

function withMeta(
  flight: Flight,
  maps: { airlines: Map<string, Airline>; aircraft: Map<string, Aircraft> },
): FlightWithMeta {
  const airline = maps.airlines.get(flight.airlineId);
  const aircraft = maps.aircraft.get(flight.aircraftId);
  if (!airline || !aircraft) {
    throw new ApiError(500, ErrorCodes.INTERNAL, `Reference data missing for flight ${flight.id}`);
  }
  return {
    ...flight,
    airline: { id: airline.id, name: airline.name, code: airline.code, logoColor: airline.logoColor, rating: airline.rating },
    aircraft: { id: aircraft.id, model: aircraft.model, manufacturer: aircraft.manufacturer },
  };
}

export async function searchFlights(query: FlightSearchQuery): Promise<{
  flights: FlightWithMeta[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const all = await flightsCollection.read();
  const maps = await buildMetaMaps();
  const cabin: CabinClass = query.cabin ?? 'Economy';

  const filtered = all.filter((flight) => {
    if (flight.from !== query.from || flight.to !== query.to) return false;
    if (flight.status === 'CANCELLED') return false;
    if (query.date && flight.departure.slice(0, 10) !== query.date) return false;
    if (query.airline && flight.airlineId !== query.airline) return false;
    if (query.maxPrice !== undefined && flight.price[cabin] > query.maxPrice) return false;
    if (query.maxDuration !== undefined && flight.durationMinutes > query.maxDuration) return false;
    if (query.stops === 'nonstop' && flight.stops > 0) return false;
    if (query.departureWindow && query.departureWindow !== 'any' && !inDepartureWindow(flight, query.departureWindow)) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case 'fastest':
        return a.durationMinutes - b.durationMinutes;
      case 'earliest':
        return a.departure.localeCompare(b.departure);
      case 'latest':
        return b.departure.localeCompare(a.departure);
      case 'cheapest':
      default:
        return a.price[cabin] - b.price[cabin];
    }
  });

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;

  return {
    flights: sorted.slice(start, start + pageSize).map((f) => withMeta(f, maps)),
    total: sorted.length,
    page,
    pageSize,
  };
}

export async function getFlightById(id: string): Promise<FlightWithMeta> {
  const all = await flightsCollection.read();
  const flight = all.find((f) => f.id === id);
  if (!flight) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Flight not found');
  }
  const maps = await buildMetaMaps();
  return withMeta(flight, maps);
}

export async function getSeatMap(flightId: string): Promise<{
  flightId: string;
  seats: SeatInfo[];
}> {
  const flight = await getFlightById(flightId);
  const records = await seatsCollection.read();
  const record = records.find((r) => r.id === flight.id);
  if (!record) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Seat map not found for this flight');
  }
  return { flightId: flight.id, seats: record.seats };
}

export async function getFlightStatus(params: {
  flightNumber?: string;
  from?: string;
  to?: string;
  date?: string;
  airlineId?: string;
}): Promise<FlightWithMeta[]> {
  const all = await flightsCollection.read();
  const maps = await buildMetaMaps();

  const number = params.flightNumber?.trim().toUpperCase();
  const matches = all
    .filter((flight) => {
      if (number && !flight.flightNumber.toUpperCase().includes(number)) return false;
      if (params.from && flight.from !== params.from.toUpperCase()) return false;
      if (params.to && flight.to !== params.to.toUpperCase()) return false;
      if (params.date && flight.departure.slice(0, 10) !== params.date) return false;
      if (params.airlineId && flight.airlineId !== params.airlineId) return false;
      return true;
    })
    .sort((a, b) => b.departure.localeCompare(a.departure))
    .slice(0, 30);

  return matches.map((f) => withMeta(f, maps));
}

export async function listAirports(): Promise<unknown[]> {
  return allAirports();
}

export async function listAirlines(): Promise<unknown[]> {
  return airlinesRepo.all();
}

export async function listAircraft(): Promise<unknown[]> {
  return aircraftRepo.all();
}
