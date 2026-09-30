import { Link } from 'react-router-dom';
import { ArrowRight, Radar, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { AircraftHero } from '@/components/3d/AircraftHero';
import FlightWorld from '@/components/3d/FlightWorld';
import { useAirports } from '@/hooks/useApi';
import { useHealth } from '@/hooks/useHealth';
import type { Airport } from '@/types/domain';

function ApiStatusCard() {
  const { data, isPending, isError } = useHealth();

  return (
    <div className="glass rounded-2xl p-5 w-full max-w-sm" data-testid="api-status">
      <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-silver">
        <Radar className="size-3.5 text-champagne" aria-hidden />
        System
      </div>
      {isPending ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-40 rounded bg-white/10 animate-pulse" />
        </div>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-300/90">API offline — start the server with `npm run dev`.</p>
      ) : (
        <p className="mt-3 text-sm text-frost/90">
          <span className="text-champagne font-medium">{data.service}</span> v{data.version} · online ·{' '}
          {data.uptimeSeconds}s uptime
        </p>
      )}
    </div>
  );
}

const FEATURES = [
  { icon: Sparkles, title: 'Curated cabins', text: 'Economy to First — every cabin hand-verified for the season.' },
  { icon: Timer, title: 'Live operations', text: 'Gates, terminals and delays streamed the moment they change.' },
  { icon: ShieldCheck, title: 'Frictionless checkout', text: 'Held seats, transparent fares, instant demo tickets.' },
];

export default function LandingPage() {
  const { data: airports } = useAirports();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_20%,rgba(212,176,106,0.08),transparent_70%)]"
        />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-20 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-28">
          <div className="relative z-10">
            <p className="text-xs tracking-[0.35em] uppercase text-champagne/90">Premium Flight Reservation</p>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              THE JOURNEY
              <br />
              <span className="text-gradient-gold">STARTS HERE.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-silver sm:text-lg">
              Discover seamless flight booking designed around your journey.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/flights"
                className="group inline-flex items-center gap-2 rounded-full bg-champagne px-8 py-3.5 text-sm font-semibold text-obsidian shadow-[0_8px_30px_rgba(212,176,106,0.25)] transition-colors hover:bg-champagne-soft"
              >
                Explore Flights
                <ArrowRight className="size-4 transition-transform duration-300 ease-lux group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                to="/status"
                className="inline-flex items-center gap-2 rounded-full border border-silver/30 px-8 py-3.5 text-sm font-semibold text-frost transition-colors hover:border-champagne/60 hover:bg-champagne/5"
              >
                Check Flight Status
              </Link>
            </div>

            <div className="mt-12">
              <ApiStatusCard />
            </div>
          </div>

          {/* Interactive 3D aircraft — decorative, never blocks interaction */}
          <AircraftHero className="order-first h-[300px] sm:h-[380px] lg:order-none lg:h-full lg:min-h-[520px]" />
        </div>
      </section>

      {/* ── Feature strip ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-2xl p-6">
              <Icon className="size-5 text-champagne" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold text-frost">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-silver">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flight network section ──────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="glass overflow-hidden rounded-[2rem]">
          <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-champagne/90">The Network</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Fourteen airports. One seamless experience.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-silver">
                From Delhi to Dubai, Mumbai to Singapore — {airports?.length ?? 14} destinations across the
                network, backed by real-time status and honest, demo-only payments.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {(airports ?? []).slice(0, 10).map((airport: Airport) => (
                  <li
                    key={airport.code}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-silver"
                  >
                    <span className="font-display text-champagne">{airport.code}</span> {airport.city}
                  </li>
                ))}
              </ul>
            </div>
            <FlightWorld className="min-h-[320px]" />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-4 text-center lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready when you are.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-silver">
          Demo accounts are seeded — sign in as <span className="text-champagne">user@example.com</span> or explore as
          an administrator.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/flights"
            className="rounded-full bg-champagne px-8 py-3.5 text-sm font-semibold text-obsidian hover:bg-champagne-soft"
          >
            Explore Flights
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-silver/30 px-8 py-3.5 text-sm font-semibold text-frost hover:border-champagne/60"
          >
            Sign in
          </Link>
        </div>
      </section>
    </>
  );
}
