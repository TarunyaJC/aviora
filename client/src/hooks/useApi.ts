import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type {
  Airport,
  Airline,
  Aircraft,
  Booking,
  DashboardData,
  Flight,
  Payment,
  SeatInfo,
} from '@/types/domain';

// ── Catalog ──────────────────────────────────────────────────────
export function useAirports() {
  return useQuery({
    queryKey: ['airports'],
    queryFn: () => apiClient<Airport[]>('/api/airports'),
    staleTime: 10 * 60_000,
  });
}

export function useAirlines() {
  return useQuery({
    queryKey: ['airlines'],
    queryFn: () => apiClient<Airline[]>('/api/airlines'),
    staleTime: 10 * 60_000,
  });
}

export function useAircraft() {
  return useQuery({
    queryKey: ['aircraft'],
    queryFn: () => apiClient<Aircraft[]>('/api/aircraft'),
    staleTime: 10 * 60_000,
  });
}

// ── Flights ──────────────────────────────────────────────────────
export interface FlightSearchResponse {
  flights: Flight[];
  total: number;
  page: number;
  pageSize: number;
}

export function useFlightSearch(params: Record<string, string | number | undefined>, enabled: boolean) {
  return useQuery({
    queryKey: ['flights', params],
    queryFn: () =>
      apiClient<FlightSearchResponse>('/api/flights', {
        searchParams: {
          from: params.from,
          to: params.to,
          date: params.date,
          cabin: params.cabin,
          passengers: params.passengers,
          airline: params.airline,
          maxPrice: params.maxPrice,
          maxDuration: params.maxDuration,
          stops: params.stops,
          departureWindow: params.departureWindow,
          sort: params.sort,
          page: params.page,
          pageSize: params.pageSize,
        },
      }),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useFlight(flightId: string | undefined) {
  return useQuery({
    queryKey: ['flight', flightId],
    queryFn: () => apiClient<Flight>(`/api/flights/${flightId}`),
    enabled: Boolean(flightId),
  });
}

export function useSeatMap(flightId: string | undefined) {
  return useQuery({
    queryKey: ['seats', flightId],
    queryFn: () => apiClient<{ flightId: string; seats: SeatInfo[] }>(`/api/flights/${flightId}/seats`),
    enabled: Boolean(flightId),
  });
}

export function useFlightStatus(params: { flightNumber?: string; from?: string; to?: string; date?: string }, enabled: boolean) {
  return useQuery({
    queryKey: ['status', params],
    queryFn: () => apiClient<Flight[]>('/api/status', { searchParams: { ...params } }),
    enabled,
    placeholderData: (prev) => prev,
  });
}

// ── Bookings ─────────────────────────────────────────────────────
export function useBookings(email?: string) {
  return useQuery({
    queryKey: ['bookings', { email }],
    queryFn: () =>
      apiClient<Booking[]>('/api/bookings', {
        auth: true,
        searchParams: { email },
      }),
  });
}

export function useBooking(idOrReference: string | undefined) {
  return useQuery({
    queryKey: ['booking', idOrReference],
    queryFn: () => apiClient<Booking>(`/api/bookings/${idOrReference}`),
    enabled: Boolean(idOrReference),
  });
}

export function usePayment(paymentId: string | undefined | null) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => apiClient<Payment>(`/api/payments/${paymentId}`),
    enabled: Boolean(paymentId),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idOrReference: string) =>
      apiClient<Booking>(`/api/bookings/${idOrReference}/cancel`, { method: 'POST', body: {}, auth: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['booking'] });
      void queryClient.invalidateQueries({ queryKey: ['seats'] });
    },
  });
}

// ── Admin ────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient<DashboardData>('/api/admin/dashboard', { auth: true }),
  });
}

export function useAdminFlights(filters: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'flights', filters],
    queryFn: () =>
      apiClient<Flight[]>('/api/admin/flights', { auth: true, searchParams: { ...filters } }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminFlightAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiClient<Flight>(`/api/admin/flights/${id}/actions`, { method: 'POST', body, auth: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['flights'] });
      void queryClient.invalidateQueries({ queryKey: ['flight'] });
      void queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useAdminCreateFlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient<Flight>('/api/admin/flights', { method: 'POST', body, auth: true }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminDeleteFlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ deleted: boolean }>(`/api/admin/flights/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}
