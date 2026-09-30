import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Gauge } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useApi';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR } from '@/utils/format';

const PIE_COLORS = ['#96a0b5', '#34d399', '#38bdf8', '#0ea5e9', '#e9edf5', '#fbbf24', '#f87171'];

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-silver">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-frost">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-silver">{sub}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isPending, isError, error } = useAdminDashboard();

  if (isPending) {
    return (
      <section className="grid min-h-[50vh] place-items-center">
        <Spinner label="Loading dashboard" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState
          icon={Gauge}
          title="Dashboard unavailable"
          description={error instanceof Error ? error.message : 'Admin access required. Sign in with an administrator account.'}
        />
      </section>
    );
  }

  const { stats, bookingTrend, revenueTrend, statusBreakdown, popularRoutes, cabinOccupancy } = data;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-champagne/90">Operations</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Admin Dashboard</h1>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Today's flights" value={String(stats.todayFlights)} />
        <KpiCard label="Bookings" value={String(stats.bookings)} />
        <KpiCard label="Passengers" value={String(stats.passengers)} />
        <KpiCard label="Revenue" value={formatINR(stats.revenue)} />
        <KpiCard label="Occupancy" value={`${stats.occupancy}%`} />
        <KpiCard label="Delays" value={String(stats.delays)} sub="network-wide" />
        <KpiCard label="Cancellations" value={String(stats.cancellations)} sub="network-wide" />
      </div>

      {/* Trends */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-silver">Booking trend — 14 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrend}>
                <defs>
                  <linearGradient id="gBooking" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4b06a" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#d4b06a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(150,160,181,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#96a0b5', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#96a0b5', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#121a2b', border: '1px solid rgba(150,160,181,0.2)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#e9edf5' }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#d4b06a" fill="url(#gBooking)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-silver">Revenue — 14 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(150,160,181,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#96a0b5', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: '#96a0b5', fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: '#121a2b', border: '1px solid rgba(150,160,181,0.2)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#e9edf5' }}
                  formatter={(value) => formatINR(Number(value))}
                />
                <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fill="url(#gRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-silver">Flight status mix</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown.filter((s) => s.count > 0)}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusBreakdown.filter((s) => s.count > 0).map((entry, i) => (
                    <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#121a2b', border: '1px solid rgba(150,160,181,0.2)', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-silver">Popular routes</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={popularRoutes} layout="vertical">
                <CartesianGrid stroke="rgba(150,160,181,0.12)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#96a0b5', fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="route"
                  width={70}
                  tick={{ fill: '#96a0b5', fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(212,176,106,0.06)' }}
                  contentStyle={{ background: '#121a2b', border: '1px solid rgba(150,160,181,0.2)', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#d4b06a" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-silver">Cabin demand share</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cabinOccupancy}>
                <CartesianGrid stroke="rgba(150,160,181,0.12)" vertical={false} />
                <XAxis dataKey="cabin" tick={{ fill: '#96a0b5', fontSize: 10 }} />
                <YAxis tick={{ fill: '#96a0b5', fontSize: 10 }} unit="%" />
                <Tooltip
                  cursor={{ fill: 'rgba(56,189,248,0.06)' }}
                  contentStyle={{ background: '#121a2b', border: '1px solid rgba(150,160,181,0.2)', borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="occupancy" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
