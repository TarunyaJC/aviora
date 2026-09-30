import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CabinClass, PaymentRequestPayload } from '@/types/domain';

export interface PassengerDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  seatId: string;
}

export interface ExtrasState {
  baggage: boolean;
  meal: boolean;
  lounge: boolean;
  insurance: boolean;
}

export interface SearchDraft {
  from: string;
  to: string;
  date: string;
  cabin: CabinClass;
  passengers: number;
  tripType: 'oneway' | 'round' | 'multi';
}

interface BookingState {
  flightId: string | null;
  cabin: CabinClass;
  passengersDraft: PassengerDraft[];
  selectedSeats: string[];
  extras: ExtrasState;
  promoCode: string;
  contactEmail: string;
  contactPhone: string;
  paymentPayload: PaymentRequestPayload | null;
  recentSearches: SearchDraft[];

  startBooking: (flightId: string, cabin: CabinClass, passengerCount: number) => void;
  setPaymentPayload: (payload: PaymentRequestPayload) => void;
  setPassengerDraft: (index: number, patch: Partial<PassengerDraft>) => void;
  setPassengerCount: (count: number, cabin: CabinClass) => void;
  toggleSeat: (seatId: string) => void;
  setExtras: (patch: Partial<ExtrasState>) => void;
  setPromoCode: (code: string) => void;
  setContact: (patch: { contactEmail?: string; contactPhone?: string }) => void;
  resetFlow: () => void;
  recordSearch: (search: SearchDraft) => void;
}

const emptyPassenger = (): PassengerDraft => ({
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  nationality: 'Indian',
  passportNumber: '',
  passportExpiry: '',
  seatId: '',
});

const emptyExtras: ExtrasState = { baggage: false, meal: false, lounge: false, insurance: false };

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      flightId: null,
      cabin: 'Economy',
      passengersDraft: [emptyPassenger()],
      selectedSeats: [],
      extras: { ...emptyExtras },
      promoCode: '',
      contactEmail: '',
      contactPhone: '',
      paymentPayload: null,
      recentSearches: [],

      setPaymentPayload: (paymentPayload) => set({ paymentPayload }),

      startBooking: (flightId, cabin, passengerCount) =>
        set((state) => {
          const drafts = Array.from({ length: passengerCount }, (_, i) => state.passengersDraft[i] ?? emptyPassenger());
          return {
            flightId,
            cabin,
            passengersDraft: drafts,
            selectedSeats: [],
            extras: { ...emptyExtras },
            promoCode: '',
          };
        }),

      setPassengerDraft: (index, patch) =>
        set((state) => ({
          passengersDraft: state.passengersDraft.map((p, i) => (i === index ? { ...p, ...patch } : p)),
        })),

      setPassengerCount: (count, cabin) =>
        set((state) => {
          const drafts = Array.from({ length: count }, (_, i) => state.passengersDraft[i] ?? emptyPassenger());
          return { passengersDraft: drafts, cabin, selectedSeats: state.selectedSeats.slice(0, count) };
        }),

      toggleSeat: (seatId) =>
        set((state) => {
          const has = state.selectedSeats.includes(seatId);
          const limit = state.passengersDraft.length;
          if (has) {
            return { selectedSeats: state.selectedSeats.filter((s) => s !== seatId) };
          }
          if (state.selectedSeats.length >= limit) {
            return state; // at the passenger limit — ignore extra selections
            }
          const next = [...state.selectedSeats, seatId];
          // Assign to passengers in order; leave later ones blank.
          const passengersDraft = state.passengersDraft.map((p, i) => ({
            ...p,
            seatId: next[i] ?? '',
          }));
          return { selectedSeats: next, passengersDraft };
        }),

      setExtras: (patch) => set((state) => ({ extras: { ...state.extras, ...patch } })),
      setPromoCode: (promoCode) => set({ promoCode }),
      setContact: (patch) => set((state) => ({ ...state, ...patch })),

      resetFlow: () =>
        set({
          flightId: null,
          passengersDraft: [emptyPassenger()],
          selectedSeats: [],
          extras: { ...emptyExtras },
          promoCode: '',
          paymentPayload: null,
        }),

      recordSearch: (search) =>
        set((state) => ({
          recentSearches: [search, ...state.recentSearches.filter((s) => !(s.from === search.from && s.to === search.to && s.date === search.date))].slice(0, 5),
        })),
    }),
    {
      name: 'aviora.booking-draft',
      partialize: (state) => ({
        flightId: state.flightId,
        cabin: state.cabin,
        passengersDraft: state.passengersDraft,
        selectedSeats: state.selectedSeats,
        extras: state.extras,
        promoCode: state.promoCode,
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
        paymentPayload: state.paymentPayload,
        recentSearches: state.recentSearches,
      }),
    },
  ),
);
