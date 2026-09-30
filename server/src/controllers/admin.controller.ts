import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adminFlightActionSchema, adminFlightSchema, flightIdParams } from '../validators/schemas.js';
import * as adminService from '../services/admin.service.js';
import * as adminFlightService from '../services/adminFlight.service.js';
import { ok, parseWith } from './helpers.js';

export const dashboard: RequestHandler = asyncHandler(async (_req, res) => {
  ok(res, await adminService.getDashboard(), 'Dashboard statistics retrieved');
});

export const listFlights: RequestHandler = asyncHandler(async (req, res) => {
  ok(
    res,
    await adminFlightService.adminListFlights({
      search: asString(req.query.search),
      status: asString(req.query.status),
    }),
    'Admin flights retrieved',
  );
});

export const createFlight: RequestHandler = asyncHandler(async (req, res) => {
  const input = parseWith(adminFlightSchema, req.body);
  ok(res, await adminFlightService.adminCreateFlight(input), 'Flight created', 201);
});

export const updateFlight: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  const input = parseWith(adminFlightSchema.partial(), req.body);
  ok(res, await adminFlightService.adminUpdateFlight(id, input), 'Flight updated');
});

export const deleteFlight: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  await adminFlightService.adminDeleteFlight(id);
  ok(res, { deleted: true }, 'Flight deleted');
});

export const flightAction: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = parseWith(flightIdParams, req.params);
  const input = parseWith(adminFlightActionSchema, req.body);
  ok(res, await adminFlightService.adminFlightAction(id, input), 'Flight action applied');
});

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
