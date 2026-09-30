/** AVIORA domain model — the single source of truth for the JSON data layer. */

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  timezone: string;
  terminals: number;
}

export interface Airline {
  id: string;
  name: string;
  code: string;
  logoColor: string;
  rating: number;
}

export interface AircraftCabinZone {
  /** Zone label, e.g. Business, Premium Economy, Economy. */
  name: 'Business' | 'Premium Economy' | 'Economy';
  /** Inclusive row range for the zone. */
  fromRow: number;
  toRow: number;
  /** Seat letters available in each row of this zone. */
  columns: string[];
  /** Price multiplier applied to the base fare. */
  priceMultiplier: number;
}

export interface Aircraft {
  id: string;
  model: string;
  manufacturer: string;
  /** Total economy-equivalent capacity. */
  capacity: number;
  /** Rows across all cabins; zones define the layout. */
  rows: number;
  cabinZones: AircraftCabinZone[];
  /** Baggage allowance per cabin class in kg. */
  baggageKg: Record<'Economy' | 'Premium Economy' | 'Business', number>;
}

export type FlightStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'DEPARTED'
  | 'IN_FLIGHT'
  | 'LANDED'
  | 'DELAYED'
  | 'CANCELLED';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business';

export interface Flight {
  id: string;
  flightNumber: string;
  airlineId: string;
  aircraftId: string;
  from: string;
  to: string;
  /** ISO 8601 departure datetime. */
  departure: string;
  /** ISO 8601 arrival datetime. */
  arrival: string;
  durationMinutes: number;
  stops: number;
  stopCities: string[];
  basePrice: number;
  /** Per-cabin prices derived from base price and aircraft zones. */
  price: Record<CabinClass, number>;
  status: FlightStatus;
  gate: string | null;
  terminal: string;
  baggageKg: Record<CabinClass, number>;
  createdAt: string;
}

/** 'held' is a transient in-memory state (short-lived hold before payment). */
export type SeatState = 'available' | 'occupied' | 'held';

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

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

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

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi';

/** Demo-only, non-sensitive metadata kept for the receipt/e-ticket. */
export interface PaymentMethodDetail {
  brand?: string;
  last4?: string;
  holder?: string;
  expiry?: string;
  upiId?: string;
  bank?: string;
  provider?: string;
  tenureMonths?: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: 'INR';
  method: PaymentMethod;
  status: PaymentStatus;
  /** Always true — this is a simulated payment, never a real charge. */
  demo: true;
  methodDetail: PaymentMethodDetail;
  transactionRef: string;
  createdAt: string;
  processedAt: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
