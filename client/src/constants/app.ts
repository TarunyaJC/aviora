import type { CabinClass, FlightStatus, PaymentMethod, PaymentStatus } from '@/types/domain';

export const CABIN_CLASSES: CabinClass[] = ['Economy', 'Premium Economy', 'Business'];

export const CABIN_MULTIPLIER_LABEL: Record<CabinClass, string> = {
  Economy: 'Standard fare',
  'Premium Economy': 'Extra legroom · priority',
  Business: 'Flat bed · lounge access',
};

export const TRIP_TYPES = [
  { value: 'oneway', label: 'One Way' },
  { value: 'round', label: 'Round Trip' },
  { value: 'multi', label: 'Multi City' },
] as const;

export const BOOKING_STEPS = ['Flight', 'Passengers', 'Seats', 'Extras', 'Payment', 'Confirmation'] as const;

export const SORT_OPTIONS = [
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'earliest', label: 'Earliest' },
  { value: 'latest', label: 'Latest' },
] as const;

export const DEPARTURE_WINDOWS = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning 05–11' },
  { value: 'afternoon', label: 'Afternoon 12–16' },
  { value: 'evening', label: 'Evening 17–20' },
  { value: 'night', label: 'Night 21–04' },
] as const;

export const SEAT_SURCHARGE: Record<'window' | 'middle' | 'aisle', number> = {
  window: 350,
  aisle: 200,
  middle: 0,
};

export const EXTRAS: Array<{ id: string; label: string; description: string; price: number; icon: string }> = [
  { id: 'baggage', label: 'Extra baggage +10kg', description: 'Additional checked allowance', price: 1200, icon: ' luggage' },
  { id: 'meal', label: 'Premium meal', description: 'Chef-curated inflight dining', price: 650, icon: 'utensils' },
  { id: 'lounge', label: 'Lounge access', description: 'Pre-departure luxury lounge', price: 1500, icon: 'armchair' },
  { id: 'insurance', label: 'Trip protection', description: 'Cancellation & delay cover', price: 499, icon: 'shield' },
];

export const PROMO_CODES: Record<string, number> = {
  AVIORA10: 0.1,
  FIRSTFLY: 0.15,
};

export const FLIGHT_STATUS_META: Record<FlightStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'text-silver border-silver/30' },
  BOARDING: { label: 'Boarding', tone: 'text-emerald-300 border-emerald-400/30' },
  DEPARTED: { label: 'Departed', tone: 'text-sky-300 border-sky-400/30' },
  IN_FLIGHT: { label: 'In Flight', tone: 'text-sky-300 border-sky-400/30' },
  LANDED: { label: 'Landed', tone: 'text-frost border-white/20' },
  DELAYED: { label: 'Delayed', tone: 'text-amber-300 border-amber-400/30' },
  CANCELLED: { label: 'Cancelled', tone: 'text-red-300 border-red-400/30' },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Pending', tone: 'text-silver' },
  PROCESSING: { label: 'Processing', tone: 'text-sky-300' },
  SUCCESS: { label: 'Success', tone: 'text-emerald-300' },
  FAILED: { label: 'Failed', tone: 'text-red-300' },
  REFUNDED: { label: 'Refunded', tone: 'text-amber-300' },
  CANCELLED: { label: 'Cancelled', tone: 'text-silver' },
};

export const BOARDING_GROUP_BY_CABIN: Record<CabinClass, number> = {
  Business: 1,
  'Premium Economy': 2,
  Economy: 3,
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Card',
  upi: 'UPI',
  netbanking: 'Netbanking',
  wallet: 'Wallet',
  emi: 'EMI',
};
