import { useMemo } from 'react';
import { Armchair, CircleUser } from 'lucide-react';
import { groupSeatsByRow } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { SeatInfo } from '@/types/domain';

interface SeatMapProps {
  seats: SeatInfo[];
  selected: string[];
  onToggleSeat: (seat: SeatInfo) => void;
}

/** Split a row's letters into aisle-separated groups: before D, D–G, after G. */
function seatGroups(rowSeats: SeatInfo[]): SeatInfo[][] {
  const groups: SeatInfo[][] = [[], [], []];
  for (const seat of rowSeats) {
    if (seat.letter < 'D') groups[0]!.push(seat);
    else if (seat.letter <= 'G') groups[1]!.push(seat);
    else groups[2]!.push(seat);
  }
  return groups.filter((g) => g.length > 0);
}

const ZONE_STYLES: Record<SeatInfo['zone'], string> = {
  Business: 'border-champagne/70 bg-champagne/15 text-champagne-soft hover:border-champagne',
  'Premium Economy': 'border-sky-300/50 bg-sky-400/10 text-sky-200 hover:border-sky-300',
  Economy: 'border-silver/40 bg-white/5 text-frost hover:border-champagne/60',
};

export function SeatMap({ seats, selected, onToggleSeat }: SeatMapProps) {
  const rows = useMemo(() => groupSeatsByRow([...seats].sort((a, b) => a.row - b.row)), [seats]);
  const firstRow = rows.keys().next().value ?? 1;

  const elements: React.ReactNode[] = [];
  let previousZone: SeatInfo['zone'] | null = null;

  for (const [row, rowSeats] of rows) {
    const zone = rowSeats[0]!.zone;
    if (zone !== previousZone) {
      elements.push(
        <div key={`zone-${row}`} className="col-span-full mt-3 first:mt-0">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-silver">
            <span className="h-px flex-1 bg-white/10" />
            {zone} Cabin
            <span className="h-px flex-1 bg-white/10" />
          </p>
        </div>,
      );
      previousZone = zone;
    }

    const isSelected = (seat: SeatInfo): boolean => selected.includes(seat.id);

    elements.push(
      <div key={`row-${row}`} className="flex items-center justify-center gap-1.5">
        <span className="w-6 text-right text-[10px] text-silver/60">{row}</span>
        {seatGroups(rowSeats).map((group, groupIndex) => (
          <div key={groupIndex} className={cn('flex gap-1.5', groupIndex > 0 && 'ml-4')}>
            {group.map((seat) => {
              const disabled = seat.state !== 'available';
              const isSelectedSeat = isSelected(seat);
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleSeat(seat)}
                  title={
                    `${seat.id} · ${seat.zone} · ${seat.position}` +
                    (seat.priceSurcharge ? ` · +₹${seat.priceSurcharge}` : '') +
                    (seat.isExitRow ? ' · exit row' : '') +
                    (disabled ? ' · unavailable' : '')
                  }
                  aria-label={`Seat ${seat.id}, ${seat.zone}, ${seat.position}${disabled ? ', unavailable' : ''}${isSelectedSeat ? ', selected' : ''}`}
                  aria-pressed={isSelectedSeat}
                  className={cn(
                    'grid size-8 place-items-center rounded-lg border text-[10px] font-medium transition-all duration-150 sm:size-9 sm:text-[11px]',
                    ZONE_STYLES[seat.zone],
                    disabled && 'cursor-not-allowed border-white/5 bg-white/[0.03] text-silver/30 line-through hover:border-white/5',
                    isSelectedSeat && '!border-champagne !bg-champagne !text-obsidian shadow-[0_0_18px_rgba(212,176,106,0.45)]',
                    seat.isExitRow && !disabled && !isSelectedSeat && 'ring-1 ring-emerald-400/40',
                  )}
                >
                  {seat.isExitRow && !isSelectedSeat ? (
                    <CircleUser className="size-3.5" aria-hidden />
                  ) : (
                    seat.letter
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>,
    );
  }

  return (
    <div>
      <p className="mb-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-silver">
        <Armchair className="size-3.5 text-champagne" aria-hidden />
        Aircraft Front — row {firstRow}
      </p>
      <div className="grid gap-1.5">{elements}</div>
      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.35em] text-silver/60">Aircraft Rear</p>

      <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-silver">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-silver/40 bg-white/5" aria-hidden /> Available</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-champagne" aria-hidden /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-white/5 bg-white/[0.03]" aria-hidden /> Occupied</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-champagne/70 bg-champagne/15" aria-hidden /> Business</span>
        <span className="flex items-center gap-1.5"><CircleUser className="size-3" aria-hidden /> Exit row</span>
      </dl>
    </div>
  );
}
