import { useState } from 'react';
import { Radar, Search } from 'lucide-react';
import { useAirlines, useFlightStatus } from '@/hooks/useApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { FlightCardSkeleton } from '@/components/flight/FlightCardSkeleton';
import { formatDate, formatTime } from '@/utils/format';
import { FLIGHT_STATUS_META } from '@/constants/app';

const statusDot: Record<string, string> = {
  SCHEDULED: 'bg-silver',
  BOARDING: 'bg-emerald-400',
  DEPARTED: 'bg-sky-400',
  IN_FLIGHT: 'bg-sky-400 animate-pulse',
  LANDED: 'bg-frost',
  DELAYED: 'bg-amber-400',
  CANCELLED: 'bg-red-400',
};

export default function FlightStatusPage() {
  const { data: airlines } = useAirlines();
  const [flightNumber, setFlightNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [airlineId, setAirlineId] = useState('');
  const [query, setQuery] = useState<{
    flightNumber?: string;
    from?: string;
    to?: string;
    airlineId?: string;
  } | null>(null);

  const { data: results, isPending, isFetching } = useFlightStatus(query ?? {}, query !== null);

  function search(): void {
    setQuery({
      flightNumber: flightNumber.trim() || undefined,
      from: from.trim().toUpperCase() || undefined,
      to: to.trim().toUpperCase() || undefined,
      airlineId: airlineId || undefined,
    });
  }

  const inputClasses =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none';

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-champagne/90">
          <Radar className="size-3.5" aria-hidden /> Live operations
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Flight Status</h1>
      </header>

      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            className={inputClasses}
            placeholder="Flight number (e.g. 6E)"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            aria-label="Flight number"
          />
          <input
            className={inputClasses}
            placeholder="From (DEL)"
            maxLength={3}
            value={from}
            onChange={(e) => setFrom(e.target.value.toUpperCase())}
            aria-label="From airport"
          />
          <input
            className={inputClasses}
            placeholder="To (BOM)"
            maxLength={3}
            value={to}
            onChange={(e) => setTo(e.target.value.toUpperCase())}
            aria-label="To airport"
          />
          <select
            className={`${inputClasses} [&>option]:bg-graphite`}
            value={airlineId}
            onChange={(e) => setAirlineId(e.target.value)}
            aria-label="Airline"
          >
            <option value="">All airlines</option>
            {airlines?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={search}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-champagne py-3 text-sm font-semibold text-obsidian hover:bg-champagne-soft cursor-pointer"
        >
          <Search className="size-4" aria-hidden /> Check Status
        </button>
      </div>

      <div className="mt-8 space-y-4" aria-live="polite">
        {query === null ? (
          <EmptyState
            icon={Radar}
            title="Track a journey"
            description="Search by flight number, route or airline to see gates, terminals and live status."
          />
        ) : isPending ? (
          <>
            <FlightCardSkeleton />
            <FlightCardSkeleton />
          </>
        ) : results && results.length > 0 ? (
          <>
            {isFetching ? <div className="text-center"><Spinner label="Refreshing" /></div> : null}
            {results.map((flight) => {
              const meta = FLIGHT_STATUS_META[flight.status];
              return (
                <article key={flight.id} className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-10 place-items-center rounded-xl text-xs font-bold text-obsidian"
                        style={{ backgroundColor: flight.airline.logoColor }}
                        aria-hidden
                      >
                        {flight.airline.code}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-frost">
                          {flight.flightNumber} · {flight.from} → {flight.to}
                        </p>
                        <p className="text-xs text-silver">{formatDate(flight.departure)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${meta.tone}`}>
                      <span className={`size-1.5 rounded-full ${statusDot[flight.status]}`} aria-hidden />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-silver">Departure</p>
                      <p className="font-display text-lg text-frost">{formatTime(flight.departure)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-silver">Arrival</p>
                      <p className="font-display text-lg text-frost">{formatTime(flight.arrival)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-silver">Gate</p>
                      <p className="font-display text-lg text-frost">{flight.gate ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-silver">Terminal</p>
                      <p className="font-display text-lg text-frost">{flight.terminal}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </>
        ) : (
          <EmptyState
            icon={Radar}
            title="No flights matched"
            description="Try a different flight number, route or airline."
          />
        )}
      </div>
    </section>
  );
}
