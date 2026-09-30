import { aircraftRepo, airlinesRepo, flightsCollection } from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import type { Aircraft, Airline, Flight } from '../types/domain.js';
import type { AdminFlightActionInput } from '../validators/schemas.js';

export interface AdminFlightRow extends Flight {
  airline: Pick<Airline, 'id' | 'name' | 'code' | 'logoColor'>;
  aircraft: Pick<Aircraft, 'id' | 'model' | 'manufacturer'>;
}

type AdminFlightInput = {
  flightNumber: string;
  airlineId: string;
  aircraftId: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  stops: number;
  stopCities: string[];
  basePrice: number;
  status: Flight['status'];
  gate: string | null;
  terminal: string;
};

function derivePrices(basePrice: number): Flight['price'] {
  const round = (n: number): number => Math.max(999, Math.round(n / 10) * 10 - 1);
  return { Economy: round(basePrice), 'Premium Economy': round(basePrice * 1.7), Business: round(basePrice * 3.2) };
}

async function decorateAll(flights: Flight[]): Promise<AdminFlightRow[]> {
  const [airlines, aircraft] = await Promise.all([airlinesRepo.all(), aircraftRepo.all()]);
  const airlineMap = new Map(airlines.map((a) => [a.id, a]));
  const aircraftMap = new Map(aircraft.map((a) => [a.id, a]));
  return flights.map((f) => {
    const airline = airlineMap.get(f.airlineId);
    const ac = aircraftMap.get(f.aircraftId);
    return {
      ...f,
      airline: airline
        ? { id: airline.id, name: airline.name, code: airline.code, logoColor: airline.logoColor }
        : { id: f.airlineId, name: 'Unknown', code: '??', logoColor: '#888' },
      aircraft: ac
        ? { id: ac.id, model: ac.model, manufacturer: ac.manufacturer }
        : { id: f.aircraftId, model: 'Unknown', manufacturer: 'Unknown' },
    };
  });
}

export async function adminListFlights(filters: {
  search?: string;
  status?: string;
}): Promise<AdminFlightRow[]> {
  const flights = await flightsCollection.read();
  let rows = flights;
  if (filters.search) {
    const needle = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (f) =>
        f.flightNumber.toLowerCase().includes(needle) ||
        f.from.toLowerCase().includes(needle) ||
        f.to.toLowerCase().includes(needle),
    );
  }
  if (filters.status) rows = rows.filter((f) => f.status === filters.status);
  const decorated = await decorateAll([...rows].sort((a, b) => a.departure.localeCompare(b.departure)));
  return decorated.slice(0, 100);
}

export async function adminCreateFlight(input: AdminFlightInput): Promise<Flight> {
  if (input.from === input.to) throw ApiError.badRequest('Origin and destination must differ');
  const durationMinutes = Math.round(
    (new Date(input.arrival).getTime() - new Date(input.departure).getTime()) / 60_000,
  );
  if (durationMinutes <= 0) throw ApiError.badRequest('Arrival must be after departure');

  const flights = await flightsCollection.read();
  const next = flights.reduce((max, f) => Math.max(max, Number(f.id.slice(4)) || 0), 0) + 1;
  const flight: Flight = {
    ...input,
    id: `FLT-${String(next).padStart(3, '0')}`,
    durationMinutes,
    price: derivePrices(input.basePrice),
    baggageKg: { Economy: 15, 'Premium Economy': 25, Business: 35 },
    createdAt: new Date().toISOString(),
  };
  await flightsCollection.write([...flights, flight]);
  return flight;
}

export async function adminUpdateFlight(id: string, input: Partial<AdminFlightInput>): Promise<Flight> {
  const flights = await flightsCollection.read();
  const flight = flights.find((f) => f.id === id);
  if (!flight) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Flight not found');

  Object.assign(flight, input);
  if (input.arrival || input.departure) {
    const durationMinutes = Math.round(
      (new Date(flight.arrival).getTime() - new Date(flight.departure).getTime()) / 60_000,
    );
    if (durationMinutes <= 0) throw ApiError.badRequest('Arrival must be after departure');
    flight.durationMinutes = durationMinutes;
  }
  if (input.basePrice !== undefined) flight.price = derivePrices(input.basePrice);

  await flightsCollection.write(flights);
  return flight;
}

export async function adminDeleteFlight(id: string): Promise<void> {
  const flights = await flightsCollection.read();
  if (!flights.some((f) => f.id === id)) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Flight not found');
  }
  await flightsCollection.write(flights.filter((f) => f.id !== id));
}

/** Operational actions: delay, cancel, gate/terminal/aircraft change, price update, status. */
export async function adminFlightAction(id: string, input: AdminFlightActionInput): Promise<Flight> {
  const flights = await flightsCollection.read();
  const flight = flights.find((f) => f.id === id);
  if (!flight) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Flight not found');

  switch (input.action) {
    case 'delay': {
      const minutes = input.minutes ?? 30;
      flight.departure = new Date(new Date(flight.departure).getTime() + minutes * 60_000).toISOString();
      flight.arrival = new Date(new Date(flight.arrival).getTime() + minutes * 60_000).toISOString();
      flight.status = 'DELAYED';
      break;
    }
    case 'cancel':
      flight.status = 'CANCELLED';
      flight.gate = null;
      break;
    case 'gate':
      if (!input.gate) throw ApiError.badRequest('Gate is required');
      flight.gate = input.gate;
      break;
    case 'terminal':
      if (!input.terminal) throw ApiError.badRequest('Terminal is required');
      flight.terminal = input.terminal;
      break;
    case 'aircraft':
      if (!input.aircraftId) throw ApiError.badRequest('Aircraft is required');
      flight.aircraftId = input.aircraftId;
      break;
    case 'price':
      if (!input.basePrice) throw ApiError.badRequest('Base price is required');
      flight.basePrice = input.basePrice;
      flight.price = derivePrices(input.basePrice);
      break;
    case 'status':
      if (!input.status) throw ApiError.badRequest('Status is required');
      flight.status = input.status;
      break;
  }

  await flightsCollection.write(flights);
  return flight;
}
