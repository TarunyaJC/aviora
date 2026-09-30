import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Clock, Gauge, Plane, Users } from 'lucide-react';
import { useFlight } from '@/hooks/useApi';
import { useBookingStore } from '@/store/bookingStore';
import { FlightCardSkeleton } from '@/components/flight/FlightCardSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatINR, formatDuration, formatTime, formatDate } from '@/utils/format';
import { CABIN_CLASSES, FLIGHT_STATUS_META } from '@/constants/app';
import type { CabinClass } from '@/types/domain';

export default function FlightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: flight, isPending, isError } = useFlight(id);
  const navigate = useNavigate();
  const location = useLocation();
  const startBooking = useBookingStore((s) => s.startBooking);

  // Passenger count & cabin flow in from the search results (router state).
  const routeState = (location.state ?? {}) as { passengers?: number; cabin?: CabinClass };
  const pax = Math.min(Math.max(routeState.passengers ?? 1, 1), 9);
  const cabin: CabinClass = routeState.cabin ?? 'Economy';

  if (isPending) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-10">
        <FlightCardSkeleton />
        <FlightCardSkeleton />
      </section>
    );
  }

  if (isError || !flight) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <EmptyState
          icon={Plane}
          title="Flight not found"
          description="This flight may have been removed or the link is incorrect."
          action={<Link to="/flights" className="...">Browse flights</Link>}
        />
      </section>
    );
  }

  const statusMeta = FLIGHT_STATUS_META[flight.status];
  const flightId = flight.id;

  function continueToSeats(): void {
    startBooking(flightId, cabin, pax);
    navigate(`/booking?flight=${flightId}`);
  }

  const label = 'text-[11px] uppercase tracking-[0.2em] text-silver';

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <Link to="/flights" className="inline-flex items-center gap-1.5 text-xs text-silver transition-colors hover:text-champagne">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to results
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-xs font-bold text-obsidian"
              style={{ backgroundColor: flight.airline.logoColor }}
              aria-hidden
            >
              {flight.airline.code}
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-frost">
                {flight.airline.name} · {flight.flightNumber}
              </h1>
              <p className="text-xs text-silver">
                {flight.aircraft.manufacturer} {flight.aircraft.model}
              </p>
            </div>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] ${statusMeta.tone}`}>{statusMeta.label}</span>
      </header>

      {/* Route timeline */}
      <div className="glass mt-6 rounded-3xl p-6 sm:p-8">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr_auto]">
          <div>
            <p className="font-display text-4xl font-bold text-frost">{formatTime(flight.departure)}</p>
            <p className="mt-1 text-sm text-frost/80">{flight.from}</p>
            <p className="text-xs text-silver">{formatDate(flight.departure)} · Terminal {flight.terminal}</p>
          </div>

          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-silver">
              <Clock className="size-3.5" aria-hidden /> {formatDuration(flight.durationMinutes)}
            </p>
            <div className="my-2 flex items-center" aria-hidden>
              <span className="h-px flex-1 bg-gradient-to-r from-champagne/60 via-silver/30 to-champagne/60" />
              <Plane className="size-4 text-champagne" />
              <span className="h-px flex-1 bg-gradient-to-r from-champagne/60 via-silver/30 to-champagne/60" />
            </div>
            <p className="text-xs text-silver">
              {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop · ${flight.stopCities.join(', ')}`}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="font-display text-4xl font-bold text-frost">{formatTime(flight.arrival)}</p>
            <p className="mt-1 text-sm text-frost/80">{flight.to}</p>
            <p className="text-xs text-silver">{formatDate(flight.arrival)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-white/5 pt-5 sm:grid-cols-3">
          <div>
            <p className={label}>Gate</p>
            <p className="mt-0.5 text-sm text-frost">{flight.gate ?? 'To be assigned'}</p>
          </div>
          <div>
            <p className={label}>Terminal</p>
            <p className="mt-0.5 text-sm text-frost">{flight.terminal}</p>
          </div>
          <div>
            <p className={label}>Status</p>
            <p className="mt-0.5 text-sm text-frost">{statusMeta.label}</p>
          </div>
        </div>
      </div>

      {/* Baggage & fares */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-frost">
            <Briefcase className="size-4.5 text-champagne" aria-hidden /> Baggage allowance
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {CABIN_CLASSES.map((cabin) => (
              <li key={cabin} className="flex items-center justify-between text-silver">
                <span>{cabin}</span>
                <span className="text-frost">{flight.baggageKg[cabin]} kg checked + 7 kg cabin</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-frost">
            <Gauge className="size-4.5 text-champagne" aria-hidden /> Fares per passenger
          </h2>
          <ul className="mt-4 space-y-3">
            {CABIN_CLASSES.map((c) => (
              <li
                key={c}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  c === cabin ? 'bg-champagne/10 ring-1 ring-champagne/40' : ''
                }`}
              >
                <div>
                  <p className={`text-sm ${c === cabin ? 'font-semibold text-champagne' : 'text-frost'}`}>
                    {c}
                    {c === cabin ? ' · selected' : ''}
                  </p>
                  <p className="text-[11px] text-silver">
                    {c === 'Economy' ? 'Standard seat selection' : c === 'Premium Economy' ? 'Extra legroom rows' : 'Flat bed · lounge'}
                  </p>
                </div>
                <p className={`font-display text-lg font-semibold ${c === cabin ? 'text-champagne' : 'text-frost/80'}`}>
                  {formatINR(flight.price[c as CabinClass])}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button onClick={continueToSeats} className="px-10">
          Continue to Seats <ArrowRight className="size-4" aria-hidden />
        </Button>
        <p className="inline-flex items-center gap-1.5 text-xs text-silver">
          <Users className="size-3.5 text-champagne" aria-hidden />
          Booking for {pax} passenger{pax > 1 ? 's' : ''} · {cabin}
        </p>
      </div>
    </section>
  );
}
