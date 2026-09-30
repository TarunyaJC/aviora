import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { flightIdParams, flightSearchSchema } from '../validators/schemas.js';
import * as flightService from '../services/flight.service.js';
import { ok, parseWith } from './helpers.js';

export const search: RequestHandler = asyncHandler(async (req, res) => {
  const query = parseWith(flightSearchSchema, req.query);
  ok(res, await flightService.searchFlights(query), 'Flights retrieved');
});

export const getById: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  ok(res, await flightService.getFlightById(id), 'Flight retrieved');
});

export const getSeats: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  ok(res, await flightService.getSeatMap(id), 'Seat map retrieved');
});

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export const status: RequestHandler = asyncHandler(async (req, res) => {
  const results = await flightService.getFlightStatus({
    flightNumber: asString(req.query.flightNumber),
    from: asString(req.query.from),
    to: asString(req.query.to),
    date: asString(req.query.date),
    airlineId: asString(req.query.airlineId),
  });
  ok(res, results, 'Flight status retrieved');
});

export const listAirports: RequestHandler = asyncHandler(async (_req, res) => {
  ok(res, await flightService.listAirports(), 'Airports retrieved');
});

export const listAirlines: RequestHandler = asyncHandler(async (_req, res) => {
  ok(res, await flightService.listAirlines(), 'Airlines retrieved');
});

export const listAircraft: RequestHandler = asyncHandler(async (_req, res) => {
  ok(res, await flightService.listAircraft(), 'Aircraft retrieved');
});
