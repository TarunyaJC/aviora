import { useMemo, useState } from 'react';
import { PlaneTakeoff } from 'lucide-react';
import { SearchForm, type SearchFormValues } from '@/components/flight/SearchForm';
import { SearchFilters, DEFAULT_FILTERS, type FilterState } from '@/components/flight/SearchFilters';
import { FlightCard } from '@/components/flight/FlightCard';
import { FlightCardSkeleton } from '@/components/flight/FlightCardSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAirports, useFlightSearch } from '@/hooks/useApi';
import { useBookingStore } from '@/store/bookingStore';
import type { CabinClass } from '@/types/domain';

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function FlightSearchPage() {
  const { data: airports, isPending: airportsLoading } = useAirports();
  const recentSearches = useBookingStore((s) => s.recentSearches);
  const recordSearch = useBookingStore((s) => s.recordSearch);

  const [search, setSearch] = useState<SearchFormValues | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [minFare, maxFare] = useMemo(() => [1500, 60000], []);
  const enabled = search !== null;

  const { data, isPending, isFetching, isError, error } = useFlightSearch(
    {
      from: search?.from,
      to: search?.to,
      date: search?.date,
      cabin: search?.cabin,
      passengers: search?.passengers,
      airline: filters.airline,
      maxPrice: filters.maxPrice,
      maxDuration: filters.maxDuration,
      stops: filters.stops,
      departureWindow: filters.departureWindow,
      sort: filters.sort,
      pageSize: 20,
    },
    enabled,
  );

  function handleSearch(values: SearchFormValues): void {
    setSearch(values);
    recordSearch(values);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-champagne/90">Discover</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Find your flight</h1>
      </header>

      {airportsLoading || !airports ? (
        <div className="glass h-48 animate-pulse rounded-3xl" aria-label="Loading search form" />
      ) : (
        <SearchForm
          airports={airports}
          initial={{
            from: 'DEL',
            to: 'BOM',
            date: isoDatePlus(7),
            cabin: 'Economy',
            passengers: 1,
            tripType: 'oneway',
          }}
          onSubmit={handleSearch}
          recentSearches={recentSearches}
        />
      )}

      {search ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <SearchFilters value={filters} onChange={setFilters} priceBounds={[minFare, maxFare]} />

          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-silver" aria-live="polite">
              <span>
                {data ? `${data.total} flights` : 'Searching…'}
                {isFetching && !isPending ? ' · updating…' : ''}
              </span>
              <span>
                {search.from} → {search.to} · {search.date} · {search.cabin}
              </span>
            </div>

            {isPending ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <FlightCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={PlaneTakeoff}
                title="Search failed"
                description={error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              />
            ) : data && data.flights.length > 0 ? (
              <div className="space-y-4">
                {data.flights.map((flight, i) => (
                  <FlightCard key={flight.id} flight={flight} index={i} cabin={search.cabin as CabinClass} passengers={search.passengers} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={PlaneTakeoff}
                title="NO FLIGHTS FOUND"
                description="Try changing your travel dates, cabin or filters — new routes are added regularly."
              />
            )}
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-silver">
          Enter a route above — try <span className="text-champagne">DEL → BOM</span> or{' '}
          <span className="text-champagne">BOM → DXB</span>.
        </p>
      )}
    </section>
  );
}
