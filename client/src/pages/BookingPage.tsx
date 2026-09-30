import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Luggage, UtensilsCrossed, Armchair, ShieldCheck } from 'lucide-react';
import { useFlight, useSeatMap } from '@/hooks/useApi';
import { useBookingStore, type PassengerDraft } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { SeatMap } from '@/components/seats/SeatMap';
import { PassengerForm } from '@/components/booking/PassengerForm';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { PaymentPanel } from '@/components/booking/PaymentPanel';
import { Ticket } from '@/components/booking/Ticket';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatINR, formatTime } from '@/utils/format';
import { EXTRAS, PROMO_CODES } from '@/constants/app';
import type { Booking, PaymentRequestPayload, SeatInfo } from '@/types/domain';

const STEP = { PASSENGERS: 1, SEATS: 2, EXTRAS: 3, PAYMENT: 4, CONFIRMED: 5 } as const;

const EXTRA_ICONS = { baggage: Luggage, meal: UtensilsCrossed, lounge: Armchair, insurance: ShieldCheck } as const;

type ApiSeat = SeatInfo;

/**
 * Personal-details completeness for the passenger step. Seat assignment is
 * deliberately NOT required here — seats are chosen in the next step and
 * validated separately via `seatsComplete`.
 */
function passengerDraftComplete(p: PassengerDraft): boolean {
  return (
    p.firstName.trim().length >= 1 &&
    p.lastName.trim().length >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth) &&
    p.gender !== '' &&
    p.nationality.trim().length >= 2
  );
}

export default function BookingPage() {
  const [params] = useSearchParams();
  const flightId = params.get('flight') ?? useBookingStore((s) => s.flightId) ?? '';

  const {
    passengersDraft, selectedSeats, extras, promoCode, contactEmail, contactPhone,
    setPassengerDraft, setPassengerCount, toggleSeat, setExtras, setPromoCode, setContact, setPaymentPayload, resetFlow,
  } = useBookingStore();

  const { data: flight, isPending: flightPending } = useFlight(flightId || undefined);
  const { data: seatData, isPending: seatsPending } = useSeatMap(flightId || undefined);
  const seatSurcharges = useMemo(
    () => new Map((seatData?.seats ?? []).map((s: ApiSeat) => [s.id, s.priceSurcharge])),
    [seatData],
  );

  const [step, setStep] = useState<number>(STEP.PASSENGERS);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Signed-in users get their contact details pre-filled (still editable).
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user && !contactEmail) setContact({ contactEmail: user.email });
  }, [user, contactEmail, setContact]);

  const passengerCount = passengersDraft.length;
  const seatsComplete = selectedSeats.length === passengerCount && passengerCount > 0;
  const savedPassengers = passengersDraft.filter(passengerDraftComplete).length;
  const passengersComplete = savedPassengers === passengerCount;
  const promoDiscount = PROMO_CODES[promoCode.trim().toUpperCase()] ?? 0;
  const isInternational = Boolean(flight && ['DXB', 'SIN', 'LHR', 'BKK'].includes(flight.to));

  function goToStep(next: number): void {
    setError('');
    setStep(next);
  }

  /** Enter the seat step — every passenger must have complete details. */
  function proceedToSeats(): void {
    if (!passengersComplete) {
      setError('Complete every passenger\'s details before continuing — each form saves individually.');
      return;
    }
    goToStep(STEP.SEATS);
  }

  async function confirmBooking(): Promise<void> {
    setError('');
    if (!flightId) return setError('Your session expired — please search again');
    if (!contactEmail.includes('@')) return setError('A valid contact email is required');
    if (contactPhone.replace(/\D/g, '').length < 8) return setError('A valid contact phone is required');

    setProcessing(true);
    try {
      const created = await apiClient<Booking>('/api/bookings', {
        method: 'POST',
        auth: true,
        body: {
          flightId,
          cabin: useBookingStore.getState().cabin,
          passengers: passengersDraft.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth,
            gender: p.gender === '' ? 'other' : p.gender,
            nationality: p.nationality,
            passportNumber: p.passportNumber || undefined,
            passportExpiry: p.passportExpiry || undefined,
            seatId: p.seatId,
          })),
          contactEmail,
          contactPhone,
          promoCode: promoCode || undefined,
        },
      });
      setBooking(created);
      setStep(STEP.PAYMENT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setProcessing(false);
    }
  }

  async function payAndFinalize(payload: PaymentRequestPayload): Promise<void> {
    if (!booking) return;
    setProcessing(true);
    setError('');
    try {
      setPaymentPayload(payload);
      // Every attempt creates a fresh demo payment — a previously FAILED
      // payment never blocks a retry, and SUCCESS payments can't recur.
      const payment = await apiClient<{ id: string; status: string }>('/api/payments', {
        method: 'POST',
        auth: true,
        body: { bookingId: booking.id, ...payload },
      });
      const processed = await apiClient<{ id: string; status: string }>(`/api/payments/${payment.id}/process`, {
        method: 'POST',
        auth: true,
      });
      if (processed.status !== 'SUCCESS') {
        setError('The demo payment was declined — try again with any details.');
        return;
      }

      const finalBooking = await apiClient<Booking>(`/api/bookings/${booking.id}`, { auth: true });
      setBooking(finalBooking);
      resetFlow();
      setStep(STEP.CONFIRMED);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed — you can retry');
    } finally {
      setProcessing(false);
    }
  }

  if (!flightId && step !== STEP.CONFIRMED) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState
          icon={ArrowLeft}
          title="No flight selected"
          description="Start by searching for a flight and selecting one."
          action={<Link to="/flights" className="text-sm text-champagne underline">Search flights</Link>}
        />
      </section>
    );
  }

  if (flightPending) {
    return (
      <section className="grid min-h-[50vh] place-items-center">
        <Spinner label="Loading booking flow" />
      </section>
    );
  }

  const stepIndex = step - 1;

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <BookingProgress current={stepIndex} />

      {flight ? (
        <p className="mt-4 text-center text-xs text-silver">
          {flight.from} → {flight.to} · {flight.flightNumber} · departs {formatTime(flight.departure)}
          {' · '}
          <span className="text-champagne">{formatINR(flight.price.Economy)}</span> per passenger
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* ── Step 1: Passengers — one full details form per passenger ── */}
          {step === STEP.PASSENGERS ? (
            <>
              <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Remove passenger"
                      onClick={() => setPassengerCount(passengerCount - 1, useBookingStore.getState().cabin)}
                      disabled={passengerCount <= 1}
                      className="grid size-8 place-items-center rounded-full border border-white/15 text-frost transition-colors hover:border-champagne/60 disabled:opacity-30 cursor-pointer"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center font-display text-lg font-bold text-frost">{passengerCount}</span>
                    <button
                      type="button"
                      aria-label="Add passenger"
                      onClick={() => setPassengerCount(passengerCount + 1, useBookingStore.getState().cabin)}
                      disabled={passengerCount >= 9}
                      className="grid size-8 place-items-center rounded-full border border-white/15 text-frost transition-colors hover:border-champagne/60 disabled:opacity-30 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-frost">
                    <span className="sr-only">{passengerCount}</span>
                    passenger{passengerCount > 1 ? 's' : ''} — a full details form is collected for each one.
                  </p>
                </div>
                <p className="text-xs text-silver">
                  {savedPassengers} of {passengerCount} saved
                </p>
              </div>
              {passengersDraft.map((draft: PassengerDraft, index: number) => (
                <PassengerForm
                  key={index}
                  index={index}
                  defaultValues={draft}
                  isInternational={isInternational}
                  onChange={(values) =>
                    setPassengerDraft(index, {
                      ...values,
                      passportNumber: values.passportNumber ?? '',
                      passportExpiry: values.passportExpiry ?? '',
                      seatId: draft.seatId,
                    })
                  }
                />
              ))}
              <button
                type="button"
                onClick={proceedToSeats}
                className="w-full rounded-full bg-champagne py-3.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft cursor-pointer"
              >
                Continue to seat selection
                <ArrowRight className="ml-1 inline size-4" aria-hidden />
              </button>
            </>
          ) : null}

          {/* ── Step 2: Seats ── */}
          {step === STEP.SEATS ? (
            seatsPending ? (
              <div className="glass grid h-96 place-items-center rounded-3xl"><Spinner label="Loading seat map" /></div>
            ) : seatData ? (
              <>
                <div className="glass rounded-3xl p-5 sm:p-8">
                  <SeatMap
                    seats={seatData.seats}
                    selected={selectedSeats}
                    onToggleSeat={(seat: ApiSeat) => {
                      if (seat.zone !== useBookingStore.getState().cabin) {
                        setError(`Seat ${seat.id} is in ${seat.zone} — switch cabins to select it`);
                        return;
                      }
                      toggleSeat(seat.id);
                    }}
                  />
                  {selectedSeats.length < passengerCount ? (
                    <p className="mt-5 text-center text-xs text-amber-300">
                      Select {passengerCount - selectedSeats.length} more seat{passengerCount - selectedSeats.length > 1 ? 's' : ''}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => goToStep(STEP.EXTRAS)}
                  disabled={!seatsComplete}
                  className="w-full rounded-full bg-champagne py-3.5 text-sm font-semibold text-obsidian disabled:opacity-40 cursor-pointer"
                >
                  Continue to extras
                </button>
              </>
            ) : (
              <EmptyState icon={Armchair} title="Seat map unavailable" description="We couldn't load the cabin for this flight." />
            )
          ) : null}

          {/* ── Step 3: Extras ── */}
          {step === STEP.EXTRAS ? (
            <div className="glass rounded-3xl p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-frost">Enhance your journey</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {EXTRAS.map((extra) => {
                  const Icon = EXTRA_ICONS[extra.id as keyof typeof EXTRA_ICONS];
                  const active = extras[extra.id as keyof typeof extras];
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setExtras({ [extra.id]: !active })}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                        active ? 'border-champagne bg-champagne/10' : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <Icon className={`mt-0.5 size-5 ${active ? 'text-champagne' : 'text-silver'}`} aria-hidden />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-frost">{extra.label}</span>
                        <span className="block text-[11px] text-silver">{extra.description}</span>
                      </span>
                      <span className="text-sm font-semibold text-champagne">+{formatINR(extra.price)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <label className="flex-1">
                  <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Promo code</span>
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="AVIORA10"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void confirmBooking()}
                  disabled={processing}
                  className="rounded-full bg-champagne px-8 py-3 text-sm font-semibold text-obsidian hover:bg-champagne-soft disabled:opacity-50 cursor-pointer"
                >
                  {processing ? 'Creating booking…' : 'Continue to payment'}
                  <ArrowRight className="ml-1 inline size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Step 4: Payment — every method creates its own demo charge ── */}
          {step === STEP.PAYMENT && booking ? (
            <PaymentPanel
              amount={booking.totalAmount}
              processing={processing}
              onPay={(payload) => {
                void payAndFinalize(payload);
              }}
            />
          ) : null}

          {/* ── Step 5: Confirmation ── */}
          {step === STEP.CONFIRMED && booking ? (
            <div>
              <div className="glass mb-6 rounded-3xl p-6 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Booking confirmed</p>
                <p className="mt-2 font-display text-3xl font-bold text-frost">{booking.reference}</p>
                <p className="mt-1 text-sm text-silver">Reference {booking.reference} · e-tickets are ready below and in My Bookings</p>
              </div>
              <Ticket booking={booking} />
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/bookings" className="rounded-full border border-silver/30 px-6 py-2.5 text-sm text-frost hover:border-champagne/60 cursor-pointer">
                  My Bookings
                </Link>
                <Link to="/" className="rounded-full bg-champagne px-6 py-2.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft cursor-pointer">
                  Back to home
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          <PriceSummary
            flight={flight}
            passengerCount={passengerCount}
            cabin={useBookingStore.getState().cabin}
            selectedSeats={selectedSeats}
            seatSurcharges={seatSurcharges}
            extras={extras}
            promoDiscount={promoDiscount}
          />

          {step >= STEP.PASSENGERS && step < STEP.PAYMENT ? (
            <div className="glass space-y-3 rounded-2xl p-5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Contact email</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContact({ contactEmail: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Contact phone</span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContact({ contactPhone: e.target.value })}
                  placeholder="+91 98xxx xxxxx"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 focus:border-champagne/50 focus:outline-none"
                />
              </label>
            </div>
          ) : null}

          {step >= STEP.SEATS && step < STEP.CONFIRMED ? (
            <button
              type="button"
              onClick={() => goToStep(Math.max(STEP.PASSENGERS, step - 1))}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-silver/30 py-2.5 text-xs text-silver hover:border-champagne/60 hover:text-frost cursor-pointer"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Go back a step
            </button>
          ) : null}
        </aside>
      </div>

      {error ? (
        <p className="mt-4 text-center text-xs text-red-300" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
