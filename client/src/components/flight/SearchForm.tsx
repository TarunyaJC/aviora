import { useState } from 'react';
import { ArrowLeftRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { CABIN_CLASSES, TRIP_TYPES } from '@/constants/app';
import { cn } from '@/utils/cn';
import type { CabinClass } from '@/types/domain';

export interface SearchFormValues {
  from: string;
  to: string;
  date: string;
  cabin: CabinClass;
  passengers: number;
  tripType: 'oneway' | 'round' | 'multi';
}

interface SearchFormProps {
  airports: Array<{ code: string; city: string; name: string }>;
  initial: SearchFormValues;
  onSubmit: (values: SearchFormValues) => void;
  recentSearches: SearchFormValues[];
}

export function SearchForm({ airports, initial, onSubmit, recentSearches }: SearchFormProps) {
  const [values, setValues] = useState<SearchFormValues>(initial);
  const [airportQuery, setAirportQuery] = useState<'from' | 'to' | null>(null);
  const [error, setError] = useState('');

  const suggestions =
    airportQuery === null
      ? []
      : airports
          .filter((a) =>
            `${a.code} ${a.city} ${a.name}`.toLowerCase().includes(airportQuery === 'from' ? values.from.toLowerCase() : values.to.toLowerCase()),
          )
          .slice(0, 6);

  function swapAirports(): void {
    setValues((v) => ({ ...v, from: v.to, to: v.from }));
  }

  function submit(): void {
    if (!airports.some((a) => a.code === values.from)) return setError('Choose a valid origin airport');
    if (!airports.some((a) => a.code === values.to)) return setError('Choose a valid destination airport');
    if (values.from === values.to) return setError('Origin and destination must differ');
    if (!values.date) return setError('Pick a departure date');
    setError('');
    onSubmit(values);
  }

  const inputClasses =
    'w-full bg-transparent text-sm text-frost placeholder:text-silver/50 focus:outline-none';

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      {/* Trip type */}
      <div className="flex flex-wrap gap-1 rounded-full bg-white/5 p-1" role="tablist" aria-label="Trip type">
        {TRIP_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={values.tripType === t.value}
            onClick={() => setValues((v) => ({ ...v, tripType: t.value }))}
            className={cn(
              'flex-1 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-colors cursor-pointer',
              values.tripType === t.value ? 'bg-champagne text-obsidian' : 'text-silver hover:text-frost',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Route row */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_1fr_auto]">
        <label className="rounded-2xl bg-white/5 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-silver">
            <MapPin className="size-3" aria-hidden /> From
          </span>
          <input
            className={inputClasses}
            value={values.from}
            onChange={(e) => {
              setValues((v) => ({ ...v, from: e.target.value.toUpperCase().slice(0, 3) }));
              setAirportQuery('from');
            }}
            onFocus={() => setAirportQuery('from')}
            placeholder="DEL"
            aria-label="From airport"
          />
          <span className="block truncate text-[11px] text-silver/70">
            {airports.find((a) => a.code === values.from)?.city ?? '—'}
          </span>
        </label>

        <button
          type="button"
          onClick={swapAirports}
          aria-label="Swap origin and destination"
          className="btn-swap self-center rounded-full border border-silver/20 p-2.5 text-silver transition-colors hover:border-champagne/50 hover:text-champagne cursor-pointer"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
        </button>

        <label className="rounded-2xl bg-white/5 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-silver">
            <MapPin className="size-3" aria-hidden /> To
          </span>
          <input
            className={inputClasses}
            value={values.to}
            onChange={(e) => {
              setValues((v) => ({ ...v, to: e.target.value.toUpperCase().slice(0, 3) }));
              setAirportQuery('to');
            }}
            onFocus={() => setAirportQuery('to')}
            placeholder="BOM"
            aria-label="To airport"
          />
          <span className="block truncate text-[11px] text-silver/70">
            {airports.find((a) => a.code === values.to)?.city ?? '—'}
          </span>
        </label>

        <label className="rounded-2xl bg-white/5 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-silver">
            <CalendarDays className="size-3" aria-hidden /> Departure
          </span>
          <input
            type="date"
            className={cn(inputClasses, '[color-scheme:dark]')}
            value={values.date}
            min="2026-09-28"
            max="2026-10-18"
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            aria-label="Departure date"
          />
        </label>

        <label className="rounded-2xl bg-white/5 px-4 py-3 sm:min-w-36">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-silver">
            <Users className="size-3" aria-hidden /> Travellers · Cabin
          </span>
          <div className="flex items-center gap-2">
            <select
              className="bg-transparent text-sm text-frost focus:outline-none [&>option]:bg-graphite"
              value={values.passengers}
              onChange={(e) => setValues((v) => ({ ...v, passengers: Number(e.target.value) }))}
              aria-label="Passengers"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              className="bg-transparent text-sm text-frost focus:outline-none [&>option]:bg-graphite"
              value={values.cabin}
              onChange={(e) => setValues((v) => ({ ...v, cabin: e.target.value as CabinClass }))}
              aria-label="Cabin class"
            >
              {CABIN_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      {/* Airport suggestions */}
      {airportQuery !== null && suggestions.length > 0 ? (
        <ul className="mt-2 divide-y divide-white/5 rounded-2xl border border-white/10 bg-midnight/95 backdrop-blur-xl">
          {suggestions.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  setValues((v) => (airportQuery === 'from' ? { ...v, from: a.code } : { ...v, to: a.code }));
                  setAirportQuery(null);
                }}
              >
                <span className="text-frost">{a.city} <span className="text-silver">· {a.name}</span></span>
                <span className="font-display text-champagne">{a.code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Recent searches */}
      {recentSearches.length > 0 && airportQuery === null ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-silver">
          <span className="uppercase tracking-[0.2em]">Recent</span>
          {recentSearches.map((r) => (
            <button
              key={`${r.from}-${r.to}-${r.date}`}
              type="button"
              onClick={() => setValues(r)}
              className="rounded-full border border-white/10 px-3 py-1 transition-colors hover:border-champagne/40 hover:text-frost cursor-pointer"
            >
              {r.from} → {r.to}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        className="mt-4 w-full rounded-full bg-champagne py-3.5 text-sm font-semibold text-obsidian transition-colors hover:bg-champagne-soft cursor-pointer"
      >
        Search Flights
      </button>
    </div>
  );
}
