import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, LogIn, Plane, Ticket as TicketIcon } from 'lucide-react';
import { useBookings, useCancelBooking, useFlight } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { Ticket } from '@/components/booking/Ticket';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatINR } from '@/utils/format';
import type { Booking } from '@/types/domain';

const EMAIL_STORAGE_KEY = 'aviora.lookup-email';

function readStoredEmail(): string {
  try {
    return sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function BookingRow({
  booking,
  onOpenTicket,
  onCancel,
  cancelling,
}: {
  booking: Booking;
  onOpenTicket: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { data: flight } = useFlight(booking.flightId);
  const statusTone =
    booking.status === 'CONFIRMED'
      ? 'text-emerald-300 border-emerald-400/30'
      : booking.status === 'COMPLETED'
        ? 'text-sky-300 border-sky-400/30'
        : 'text-silver border-white/15';

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-frost">
            {flight ? `${flight.from} → ${flight.to}` : booking.flightId}
          </p>
          <p className="text-xs text-silver">
            {flight ? `${flight.airline.name} · ${flight.flightNumber} · ${formatDate(flight.departure)} · ` : ''}
            {booking.passengers.length} pax · <span className="text-champagne">{formatINR(booking.totalAmount)}</span>
          </p>
          <p className="mt-1 text-[11px] text-silver/70">
            {booking.passengers.map((p) => `${p.firstName} ${p.lastName} (${p.seatId})`).join(', ')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-sm text-champagne">{booking.reference}</p>
          <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] ${statusTone}`}>
            {booking.status}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenTicket}
          className="inline-flex items-center gap-1.5 rounded-full border border-silver/25 px-3.5 py-1.5 text-xs text-frost transition-colors hover:border-champagne/60 hover:text-champagne cursor-pointer"
        >
          <TicketIcon className="size-3.5" aria-hidden /> Ticket
        </button>
        {booking.status === 'CONFIRMED' ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 px-3.5 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-40 cursor-pointer"
          >
            <CalendarX className="size-3.5" aria-hidden /> {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BookingsSection({
  title,
  bookings,
  onOpenTicket,
  onCancel,
  cancellingId,
}: {
  title: string;
  bookings: Booking[];
  onOpenTicket: (booking: Booking) => void;
  onCancel: (reference: string) => void;
  cancellingId: string | null;
}) {
  if (bookings.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-xs uppercase tracking-[0.25em] text-silver">{title}</h2>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            onOpenTicket={() => onOpenTicket(booking)}
            onCancel={() => onCancel(booking.reference)}
            cancelling={cancellingId === booking.reference}
          />
        ))}
      </div>
    </section>
  );
}

export default function MyBookingsPage() {
  const user = useAuthStore((s) => s.user);
  const [lookupEmail, setLookupEmail] = useState(readStoredEmail);
  const [submittedEmail, setSubmittedEmail] = useState(readStoredEmail);
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);

  const emailKey = user ? undefined : submittedEmail || undefined;
  const { data: bookings, isPending, isError, error } = useBookings(emailKey);
  const cancelMutation = useCancelBooking();

  const sections = useMemo(() => {
    const list = bookings ?? [];
    return {
      upcoming: list.filter((b) => b.status === 'CONFIRMED'),
      completed: list.filter((b) => b.status === 'COMPLETED'),
      cancelled: list.filter((b) => b.status === 'CANCELLED'),
    };
  }, [bookings]);

  function submitEmail(): void {
    try {
      sessionStorage.setItem(EMAIL_STORAGE_KEY, lookupEmail);
    } catch {
      /* private mode */
    }
    setSubmittedEmail(lookupEmail);
  }

  function handleCancel(reference: string): void {
    setPendingCancel(reference);
  }

  function confirmCancel(): void {
    if (!pendingCancel) return;
    cancelMutation.mutate(pendingCancel, { onSettled: () => setPendingCancel(null) });
  }

  const hasLookup = Boolean(user || submittedEmail);

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-champagne/90">Your journeys</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">My Bookings</h1>
      </header>

      {!user ? (
        <div className="glass mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-5">
          <label className="flex-1 min-w-56">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">
              Retrieve bookings by email
            </span>
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={submitEmail}
            className="rounded-full bg-champagne px-6 py-2.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft cursor-pointer"
          >
            Find bookings
          </button>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-silver hover:text-champagne">
            <LogIn className="size-3.5" aria-hidden /> Sign in instead
          </Link>
        </div>
      ) : null}

      {isPending && hasLookup ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner label="Loading bookings" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Plane}
          title="Could not load bookings"
          description={error instanceof Error ? error.message : 'Sign in or enter the email used during booking.'}
        />
      ) : !hasLookup ? (
        <EmptyState
          icon={Plane}
          title="NO BOOKINGS YET"
          description="Your next journey is waiting. Search flights and your bookings will appear here."
          action={
            <Link
              to="/flights"
              className="rounded-full bg-champagne px-6 py-2.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft"
            >
              Explore Flights
            </Link>
          }
        />
      ) : bookings && bookings.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="NO BOOKINGS YET"
          description="Your next journey is waiting. Search flights and your bookings will appear here."
          action={
            <Link
              to="/flights"
              className="rounded-full bg-champagne px-6 py-2.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft"
            >
              Explore Flights
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <BookingsSection
            title="Upcoming"
            bookings={sections.upcoming}
            onOpenTicket={setTicketBooking}
            onCancel={handleCancel}
            cancellingId={pendingCancel}
          />
          <BookingsSection
            title="Completed"
            bookings={sections.completed}
            onOpenTicket={setTicketBooking}
            onCancel={handleCancel}
            cancellingId={pendingCancel}
          />
          <BookingsSection
            title="Cancelled"
            bookings={sections.cancelled}
            onOpenTicket={setTicketBooking}
            onCancel={handleCancel}
            cancellingId={pendingCancel}
          />
        </div>
      )}

      {/* Ticket overlay */}
      {ticketBooking ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-obsidian/80 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Ticket for booking ${ticketBooking.reference}`}
          onClick={() => setTicketBooking(null)}
        >
          <div className="mx-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <Ticket booking={ticketBooking} />
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setTicketBooking(null)}
                className="rounded-full border border-silver/30 px-6 py-2 text-xs text-silver hover:border-champagne/60 hover:text-frost cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel confirmation */}
      {pendingCancel ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-obsidian/80 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm cancellation"
        >
          <div className="glass w-full max-w-md rounded-3xl p-6 text-center">
            <h3 className="font-display text-lg font-semibold text-frost">Cancel this booking?</h3>
            <p className="mt-2 text-sm text-silver">
              Reference <span className="text-champagne">{pendingCancel}</span> will be cancelled and the demo
              payment marked as refunded. Seats return to the pool.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setPendingCancel(null)}
                className="rounded-full border border-silver/30 px-5 py-2 text-sm text-frost hover:border-white/40 cursor-pointer"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelMutation.isPending}
                className="rounded-full bg-red-400/90 px-5 py-2 text-sm font-semibold text-obsidian hover:bg-red-300 disabled:opacity-50 cursor-pointer"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
