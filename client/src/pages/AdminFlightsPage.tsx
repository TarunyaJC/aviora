import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plane, Plus } from 'lucide-react';
import { useAdminCreateFlight, useAdminDeleteFlight, useAdminFlights, useAdminFlightAction, useAirlines, useAircraft } from '@/hooks/useApi';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatTime } from '@/utils/format';
import { FLIGHT_STATUS_META } from '@/constants/app';
import { cn } from '@/utils/cn';

const DELAY_OPTIONS = [15, 30, 60, 120];

export default function AdminFlightsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const filters = { search: search || undefined, status: status || undefined };
  const { data: flights, isPending, isError, error } = useAdminFlights(filters);
  const action = useAdminFlightAction();
  const createFlight = useAdminCreateFlight();
  const deleteFlight = useAdminDeleteFlight();
  const { data: airlines } = useAirlines();
  const { data: aircraft } = useAircraft();

  const inputClasses =
    'rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none [&>option]:bg-graphite';

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-champagne/90">Network control</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Manage Flights</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-champagne px-5 py-2 text-xs font-semibold text-obsidian hover:bg-champagne-soft cursor-pointer"
          >
            <Plus className="size-3.5" aria-hidden /> Add Flight
          </button>
          <Link
            to="/admin"
            className="rounded-full border border-silver/30 px-5 py-2 text-xs text-silver hover:border-champagne/60 hover:text-frost"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="glass mb-6 flex flex-wrap gap-3 rounded-2xl p-4">
        <input
          className={`${inputClasses} min-w-56 flex-1`}
          placeholder="Search flight number or route…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search flights"
        />
        <select className={inputClasses} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(FLIGHT_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
      </div>

      {showAdd ? (
        <AddFlightForm
          airlines={airlines ?? []}
          aircraft={aircraft ?? []}
          onSubmit={(body) => {
            createFlight.mutate(body, { onSuccess: () => setShowAdd(false) });
          }}
          submitting={createFlight.isPending}
          error={createFlight.error instanceof Error ? createFlight.error.message : ''}
        />
      ) : null}

      {isPending ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner label="Loading flights" />
        </div>
      ) : isError ? (
        <EmptyState icon={Plane} title="Admin access required" description={error instanceof Error ? error.message : ''} />
      ) : !flights || flights.length === 0 ? (
        <EmptyState icon={Plane} title="No flights matched" description="Adjust the search or status filter." />
      ) : (
        <div className="space-y-3">
          {flights.map((flight) => {
            const meta = FLIGHT_STATUS_META[flight.status];
            const busy = action.isPending && action.variables?.id === flight.id;
            return (
              <article key={flight.id} className={cn('glass rounded-2xl p-4 sm:p-5', busy && 'opacity-60')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-52">
                    <p className="text-sm font-medium text-frost">
                      {flight.flightNumber} · {flight.from} → {flight.to}
                    </p>
                    <p className="text-xs text-silver">
                      {flight.airline.name} · {flight.aircraft.model} · {formatDate(flight.departure)}
                    </p>
                  </div>

                  <div className="text-center text-xs text-silver">
                    {formatTime(flight.departure)} → {formatTime(flight.arrival)}
                    <span className="ml-2">T{flight.terminal} · Gate {flight.gate ?? '—'}</span>
                  </div>

                  <span className={cn('rounded-full border px-3 py-1 text-[11px]', meta.tone)}>{meta.label}</span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {flight.status !== 'CANCELLED' && flight.status !== 'LANDED' ? (
                      DELAY_OPTIONS.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          title={`Delay by ${minutes} minutes`}
                          onClick={() => action.mutate({ id: flight.id, body: { action: 'delay', minutes } })}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-400/10 cursor-pointer"
                        >
                          <Clock className="size-3" aria-hidden />+{minutes}m
                        </button>
                      ))
                    ) : null}

                    {flight.status !== 'CANCELLED' && flight.status !== 'LANDED' ? (
                      <button
                        type="button"
                        onClick={() => action.mutate({ id: flight.id, body: { action: 'cancel' } })}
                        className="rounded-full border border-red-400/30 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-400/10 cursor-pointer"
                      >
                        Cancel flight
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => action.mutate({ id: flight.id, body: { action: 'status', status: 'SCHEDULED' } })}
                        className="rounded-full border border-emerald-400/30 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10 cursor-pointer"
                      >
                        Restore
                      </button>
                    )}

                    <button
                      type="button"
                      title="Delete flight"
                      onClick={() => {
                        if (window.confirm(`Delete ${flight.flightNumber}? This cannot be undone.`)) {
                          deleteFlight.mutate(flight.id);
                        }
                      }}
                      className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-silver hover:border-red-400/40 hover:text-red-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-center text-[11px] text-silver/60">
        Delay, cancel, gate and terminal changes write straight to the SQLite database.
      </p>
    </section>
  );
}

function AddFlightForm({
  airlines,
  aircraft,
  onSubmit,
  submitting,
  error,
}: {
  airlines: Array<{ id: string; name: string }>;
  aircraft: Array<{ id: string; model: string }>;
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
  error: string;
}) {
  const [form, setForm] = useState({
    flightNumber: '',
    airlineId: airlines[0]?.id ?? '',
    aircraftId: aircraft[0]?.id ?? '',
    from: 'DEL',
    to: 'BOM',
    departure: '2026-10-10T06:30',
    arrival: '2026-10-10T08:45',
    basePrice: 6499,
    terminal: '1',
    gate: '',
  });

  const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-frost focus:border-champagne/50 focus:outline-none [&>option]:bg-graphite';
  const label = 'block text-[10px] uppercase tracking-[0.18em] text-silver mb-1';

  return (
    <form
      className="glass mb-6 rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          flightNumber: form.flightNumber.toUpperCase(),
          from: form.from.toUpperCase(),
          to: form.to.toUpperCase(),
          departure: new Date(form.departure).toISOString(),
          arrival: new Date(form.arrival).toISOString(),
          basePrice: Number(form.basePrice),
          stops: 0,
          stopCities: [],
          gate: form.gate || null,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label><span className={label}>Flight no.</span>
          <input className={field} placeholder="6E-234" value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} required />
        </label>
        <label><span className={label}>Airline</span>
          <select className={field} value={form.airlineId} onChange={(e) => setForm({ ...form, airlineId: e.target.value })}>
            {airlines.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label><span className={label}>Aircraft</span>
          <select className={field} value={form.aircraftId} onChange={(e) => setForm({ ...form, aircraftId: e.target.value })}>
            {aircraft.map((a) => <option key={a.id} value={a.id}>{a.model}</option>)}
          </select>
        </label>
        <label><span className={label}>From</span>
          <input className={field} maxLength={3} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value.toUpperCase() })} required />
        </label>
        <label><span className={label}>To</span>
          <input className={field} maxLength={3} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value.toUpperCase() })} required />
        </label>
        <label><span className={label}>Departure</span>
          <input className={field} type="datetime-local" value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} required />
        </label>
        <label><span className={label}>Arrival</span>
          <input className={field} type="datetime-local" value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })} required />
        </label>
        <label><span className={label}>Base price ₹</span>
          <input className={field} type="number" min={999} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} required />
        </label>
        <label><span className={label}>Terminal</span>
          <input className={field} value={form.terminal} onChange={(e) => setForm({ ...form, terminal: e.target.value })} />
        </label>
        <label><span className={label}>Gate</span>
          <input className={field} value={form.gate} onChange={(e) => setForm({ ...form, gate: e.target.value })} placeholder="optional" />
        </label>
      </div>
      {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-full bg-champagne px-8 py-2.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft disabled:opacity-50 cursor-pointer"
      >
        {submitting ? 'Creating…' : 'Create flight'}
      </button>
    </form>
  );
}
