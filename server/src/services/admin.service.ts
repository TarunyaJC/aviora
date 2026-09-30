import { bookingsCollection, flightsCollection, paymentsCollection } from '../repositories/index.js';
import type { FlightStatus } from '../types/domain.js';

/** Average economy-equivalent seats across the demo fleet — dashboard approximation. */
const SEATS_PER_FLIGHT = 186;

export interface DashboardStats {
  todayFlights: number;
  bookings: number;
  passengers: number;
  revenue: number;
  occupancy: number;
  delays: number;
  cancellations: number;
}

export interface DashboardData {
  stats: DashboardStats;
  bookingTrend: Array<{ date: string; bookings: number }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  statusBreakdown: Array<{ status: FlightStatus; count: number }>;
  popularRoutes: Array<{ route: string; count: number }>;
  cabinOccupancy: Array<{ cabin: string; occupancy: number }>;
}

function dayLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (count - 1) + i);
    return d.toISOString().slice(0, 10);
  });
}

export async function getDashboard(): Promise<DashboardData> {
  const [flights, bookings, payments] = await Promise.all([
    flightsCollection.read(),
    bookingsCollection.read(),
    paymentsCollection.read(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayFlights = flights.filter((f) => f.departure.slice(0, 10) === today);
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const passengers = activeBookings.reduce((sum, b) => sum + b.passengers.length, 0);
  const revenue = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const bookedSeats = todayFlights.reduce((sum, f) => {
    const related = activeBookings.filter((b) => b.flightId === f.id);
    return sum + related.reduce((s, b) => s + b.passengers.length, 0);
  }, 0);
  const occupancy =
    todayFlights.length > 0
      ? Math.min(100, Math.round((bookedSeats / (todayFlights.length * SEATS_PER_FLIGHT)) * 100))
      : 0;

  const labels = dayLabels(14);
  const bookingTrend = labels.map((date) => ({
    date,
    bookings: bookings.filter((b) => b.createdAt.slice(0, 10) === date).length,
  }));
  const revenueTrend = labels.map((date) => ({
    date,
    revenue: payments
      .filter((p) => p.status === 'SUCCESS' && p.createdAt.slice(0, 10) === date)
      .reduce((sum, p) => sum + p.amount, 0),
  }));

  const STATUSES: FlightStatus[] = [
    'SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_FLIGHT', 'LANDED', 'DELAYED', 'CANCELLED',
  ];
  const statusBreakdown = STATUSES.map((status) => ({
    status,
    count: flights.filter((f) => f.status === status).length,
  }));

  const routeCounts = new Map<string, number>();
  for (const flight of flights) {
    const key = `${flight.from}→${flight.to}`;
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
  }
  const popularRoutes = [...routeCounts.entries()]
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const cabinDemand: Record<string, number> = { Economy: 0, 'Premium Economy': 0, Business: 0 };
  for (const booking of activeBookings) {
    cabinDemand[booking.cabin] = (cabinDemand[booking.cabin] ?? 0) + booking.passengers.length;
  }
  const cabinTotal = Object.values(cabinDemand).reduce((a, b) => a + b, 0) || 1;
  const cabinOccupancy = Object.entries(cabinDemand).map(([cabin, count]) => ({
    cabin,
    occupancy: Math.round((count / cabinTotal) * 100),
  }));

  return {
    stats: {
      todayFlights: todayFlights.length,
      bookings: activeBookings.length,
      passengers,
      revenue,
      occupancy,
      delays: flights.filter((f) => f.status === 'DELAYED').length,
      cancellations: flights.filter((f) => f.status === 'CANCELLED').length,
    },
    bookingTrend,
    revenueTrend,
    statusBreakdown,
    popularRoutes,
    cabinOccupancy,
  };
}
