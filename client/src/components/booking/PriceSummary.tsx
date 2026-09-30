import { formatINR } from '@/utils/format';
import type { Flight } from '@/types/domain';
import type { ExtrasState } from '@/store/bookingStore';

interface PriceSummaryProps {
  flight: Flight | undefined;
  passengerCount: number;
  cabin: string;
  selectedSeats: string[];
  extras: ExtrasState;
  promoDiscount: number;
}

const EXTRA_PRICES: Record<keyof ExtrasState, number> = {
  baggage: 1200,
  meal: 650,
  lounge: 1500,
  insurance: 499,
};

export function priceBreakdown(input: {
  flight?: Flight;
  passengerCount: number;
  selectedSeats: string[];
  seatSurcharges: Map<string, number>;
  extras: ExtrasState;
  promoDiscount: number;
}): { base: number; seats: number; extras: number; discount: number; total: number } {
  const base = (input.flight?.price.Economy ?? 0) * input.passengerCount;
  const seats = input.selectedSeats.reduce((sum, seatId) => sum + (input.seatSurcharges.get(seatId) ?? 0), 0);
  const extras = (Object.keys(input.extras) as Array<keyof ExtrasState>).reduce(
    (sum, key) => sum + (input.extras[key] ? EXTRA_PRICES[key] : 0),
    0,
  );
  const subtotal = base + seats + extras;
  const discount = Math.round(subtotal * input.promoDiscount);
  return { base, seats, extras, discount, total: subtotal - discount };
}

export function PriceSummary(props: PriceSummaryProps & { seatSurcharges: Map<string, number> }) {
  const { base, seats, extras, discount, total } = priceBreakdown(props);
  const rows: Array<[string, number]> = [
    [`Base fare × ${props.passengerCount}`, base],
    ['Seat selection', seats],
    ['Add-ons', extras],
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-xs uppercase tracking-[0.25em] text-silver">Fare summary</h3>
      <dl className="mt-4 space-y-2.5 text-sm">
        {rows
          .filter(([, amount]) => amount > 0)
          .map(([label, amount]) => (
            <div key={label} className="flex justify-between text-silver">
              <dt>{label}</dt>
              <dd className="text-frost">{formatINR(amount)}</dd>
            </div>
          ))}
        {discount > 0 ? (
          <div className="flex justify-between text-emerald-300">
            <dt>Promo discount</dt>
            <dd>−{formatINR(discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-white/10 pt-3 font-display text-base font-semibold">
          <dt className="text-frost">Total</dt>
          <dd className="text-champagne">{formatINR(total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] leading-relaxed text-silver/60">
        Demo pricing. The server recalculates the authoritative total at booking time.
      </p>
    </div>
  );
}
