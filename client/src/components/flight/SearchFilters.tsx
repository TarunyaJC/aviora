import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useAirlines } from '@/hooks/useApi';
import { DEPARTURE_WINDOWS, SORT_OPTIONS } from '@/constants/app';
import { cn } from '@/utils/cn';

export interface FilterState {
  airline: string | undefined;
  maxPrice: number | undefined;
  maxDuration: number | undefined;
  stops: 'any' | 'nonstop';
  departureWindow: 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
  sort: 'cheapest' | 'fastest' | 'earliest' | 'latest';
}

export const DEFAULT_FILTERS: FilterState = {
  airline: undefined,
  maxPrice: undefined,
  maxDuration: undefined,
  stops: 'any',
  departureWindow: 'any',
  sort: 'cheapest',
};

interface SearchFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  priceBounds: [number, number];
}

export function SearchFilters({ value, onChange, priceBounds }: SearchFiltersProps) {
  const { data: airlines } = useAirlines();
  const [minPrice, maxPrice] = priceBounds;
  const [priceDraft, setPriceDraft] = useState(value.maxPrice ?? maxPrice);
  const [durationDraft, setDurationDraft] = useState(value.maxDuration ?? 400);

  // Debounce slider drafts into the filter state (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      onChange({
        ...value,
        maxPrice: priceDraft >= maxPrice ? undefined : priceDraft,
        maxDuration: durationDraft >= 400 ? undefined : durationDraft,
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceDraft, durationDraft]);

  const selectClasses = 'w-full rounded-xl bg-white/5 px-3 py-2 text-xs text-frost focus:outline-none [&>option]:bg-graphite';

  return (
    <aside className="glass rounded-2xl p-5" aria-label="Search filters">
      <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-silver">
        <SlidersHorizontal className="size-3.5 text-champagne" aria-hidden />
        Refine
      </div>

      <div className="mt-4 space-y-5">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-silver">Sort</span>
          <select
            className={cn(selectClasses, 'mt-1.5')}
            value={value.sort}
            onChange={(e) => onChange({ ...value, sort: e.target.value as FilterState['sort'] })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-silver">Airline</span>
          <select
            className={cn(selectClasses, 'mt-1.5')}
            value={value.airline ?? ''}
            onChange={(e) => onChange({ ...value, airline: e.target.value || undefined })}
          >
            <option value="">All airlines</option>
            {airlines?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-silver">
            Max price
            <span className="text-champagne">
              {priceDraft >= maxPrice ? 'Any' : `₹${priceDraft.toLocaleString('en-IN')}`}
            </span>
          </span>
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={100}
            value={Math.min(priceDraft, maxPrice)}
            onChange={(e) => setPriceDraft(Number(e.target.value))}
            className="mt-2 w-full accent-[#d4b06a]"
            aria-label="Maximum price"
          />
        </label>

        <label className="block">
          <span className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-silver">
            Max duration
            <span className="text-champagne">{durationDraft >= 400 ? 'Any' : `${Math.floor(durationDraft / 60)}h`}</span>
          </span>
          <input
            type="range"
            min={45}
            max={400}
            step={15}
            value={Math.min(durationDraft, 400)}
            onChange={(e) => setDurationDraft(Number(e.target.value))}
            className="mt-2 w-full accent-[#d4b06a]"
            aria-label="Maximum duration"
          />
        </label>

        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-silver">Stops</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
            {(['any', 'nonstop'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...value, stops: s })}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-[11px] transition-colors cursor-pointer',
                  value.stops === s ? 'bg-champagne text-obsidian font-semibold' : 'text-silver hover:text-frost',
                )}
              >
                {s === 'any' ? 'Any' : 'Non-stop'}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-silver">Departure window</span>
          <select
            className={cn(selectClasses, 'mt-1.5')}
            value={value.departureWindow}
            onChange={(e) => onChange({ ...value, departureWindow: e.target.value as FilterState['departureWindow'] })}
          >
            {DEPARTURE_WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
