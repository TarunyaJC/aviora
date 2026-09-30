/** Client-side domain types — mirrors the server API payloads. */

export type Role = 'USER' | 'ADMIN';
export type CabinClass = 'Economy' | 'Premium Economy' | 'Business';
export type FlightStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'IN_FLIGHT' | 'LANDED' | 'DELAYED' | 'CANCELLED';
export type SeatState = 'available' | 'occupied' | 'held';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type TripType = 'oneway' | 'round' | 'multi';

export interface Airline {
  id: string;
  name: string;
  code: string;
  logoColor: string;
  rating: number;
}

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  timezone: string;
  terminals: number;
}

export interface Aircraft {
  id: string;
  model: string;
  manufacturer: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airlineId: string;
  aircraftId: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
  stopCities: string[];
  basePrice: number;
  price: Record<CabinClass, number>;
  status: FlightStatus;
  gate: string | null;
  terminal: string;
  baggageKg: Record<CabinClass, number>;
  airline: Pick<Airline, 'id' | 'name' | 'code' | 'logoColor' | 'rating'>;
  aircraft: Pick<Aircraft, 'id' | 'model' | 'manufacturer'>;
}

export interface SeatInfo {
  id: string;
  row: number;
  letter: string;
  zone: CabinClass;
  state: SeatState;
  isExitRow: boolean;
  position: 'window' | 'middle' | 'aisle';
  priceSurcharge: number;
}

export interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string;
  seatId: string;
  cabin: CabinClass;
}

export interface Booking {
  reference: string;
  id: string;
  userId: string | null;
  flightId: string;
  cabin: CabinClass;
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  status: BookingStatus;
  paymentId: string | null;
  createdAt: string;
}

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi';

/** Demo-only, non-sensitive metadata shown on the receipt/e-ticket. */
export interface PaymentMethodDetail {
  brand?: string;
  last4?: string;
  holder?: string;
  upiId?: string;
  bank?: string;
  provider?: string;
  tenureMonths?: number;
}

/** What the client may send to POST /api/payments — display-safe data only. */
export interface PaymentRequestPayload {
  method: PaymentMethod;
  card?: { holder: string; last4: string; expiry: string };
  upi?: { upiId: string };
  netbanking?: { bank: string };
  wallet?: { provider: string };
  emi?: { tenureMonths: 3 | 6 | 9 | 12 };
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: 'INR';
  method: PaymentMethod;
  status: PaymentStatus;
  demo: true;
  methodDetail: PaymentMethodDetail;
  transactionRef: string;
  createdAt: string;
  processedAt: string | null;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthPayload {
  user: SessionUser;
  tokens: { accessToken: string; refreshToken: string };
}

export interface SeatHold {
  holdId: string;
  expiresAt: string;
  seats: SeatInfo[];
}

export interface DashboardData {
  stats: {
    todayFlights: number;
    bookings: number;
    passengers: number;
    revenue: number;
    occupancy: number;
    delays: number;
    cancellations: number;
  };
  bookingTrend: Array<{ date: string; bookings: number }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  statusBreakdown: Array<{ status: FlightStatus; count: number }>;
  popularRoutes: Array<{ route: string; count: number }>;
  cabinOccupancy: Array<{ cabin: string; occupancy: number }>;
}

export interface FlightSearchQueryParams {
  from: string;
  to: string;
  date?: string;
  cabin?: CabinClass;
  passengers?: number;
  airline?: string;
  maxPrice?: number;
  maxDuration?: number;
  stops?: 'any' | 'nonstop';
  departureWindow?: 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
  sort?: 'cheapest' | 'fastest' | 'earliest' | 'latest';
  page?: number;
  pageSize?: number;
}
