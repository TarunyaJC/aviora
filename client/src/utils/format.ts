const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** 130 -> "2h 10m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** ISO string -> "08:30" in the provided timezone-safe local render. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** ISO string -> "Wed, 15 Oct" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** ISO string -> "2026-10-15" (for date inputs and search params) */
export function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/** Seat rows grouped for rendering, e.g. [{row: 12, seats: [...]}] */
export function groupSeatsByRow<T extends { row: number }>(seats: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const seat of seats) {
    const list = map.get(seat.row);
    if (list) list.push(seat);
    else map.set(seat.row, [seat]);
  }
  return map;
}
