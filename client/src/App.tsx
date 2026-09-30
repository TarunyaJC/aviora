import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AppLayout } from '@/layouts/AppLayout';
import { PremiumCursor } from '@/components/navigation/PremiumCursor';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import type { ReactNode } from 'react';

const FlightSearchPage = lazy(() => import('@/pages/FlightSearchPage'));
const FlightDetailPage = lazy(() => import('@/pages/FlightDetailPage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const MyBookingsPage = lazy(() => import('@/pages/MyBookingsPage'));
const FlightStatusPage = lazy(() => import('@/pages/FlightStatusPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const AdminFlightsPage = lazy(() => import('@/pages/AdminFlightsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner label="Loading page" />
    </div>
  );
}

/** Role gate for /admin routes. Waits for session restore before deciding. */
function AdminGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'restoring') {
    return <RouteFallback />;
  }
  if (status !== 'authenticated' && !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <QueryProvider>
      <BrowserRouter>
        <PremiumCursor />
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback />}>
                  <LandingRoute />
                </Suspense>
              }
            />
            <Route path="/flights" element={<Suspense fallback={<RouteFallback />}><FlightSearchPage /></Suspense>} />
            <Route path="/flights/:id" element={<Suspense fallback={<RouteFallback />}><FlightDetailPage /></Suspense>} />
            <Route path="/booking" element={<Suspense fallback={<RouteFallback />}><BookingPage /></Suspense>} />
            <Route path="/bookings" element={<Suspense fallback={<RouteFallback />}><MyBookingsPage /></Suspense>} />
            <Route path="/status" element={<Suspense fallback={<RouteFallback />}><FlightStatusPage /></Suspense>} />
            <Route path="/login" element={<Suspense fallback={<RouteFallback />}><LoginPage /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<RouteFallback />}><RegisterPage /></Suspense>} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <Suspense fallback={<RouteFallback />}>
                    <AdminDashboardPage />
                  </Suspense>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/flights"
              element={
                <AdminGuard>
                  <Suspense fallback={<RouteFallback />}>
                    <AdminFlightsPage />
                  </Suspense>
                </AdminGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

const LandingPage = lazy(() => import('@/pages/LandingPage'));

function LandingRoute() {
  return <LandingPage />;
}
