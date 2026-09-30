import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Plane } from 'lucide-react';
import { formatINR, formatDuration, formatTime } from '@/utils/format';
import { FLIGHT_STATUS_META } from '@/constants/app';
import type { Flight } from '@/types/domain';

interface FlightCardProps {
  flight: Flight;
  index?: number;
  cabin?: string;
  passengers?: number;
}

export function FlightCard({ flight, index = 0, cabin = 'Economy', passengers = 1 }: FlightCardProps) {
  const statusMeta = FLIGHT_STATUS_META[flight.status];
  const price = flight.price[cabin as keyof typeof flight.price] ?? flight.price.Economy;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="glass rounded-2xl p-5 sm:p-6 transition-shadow hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid place-items-center size-10 rounded-xl text-xs font-bold text-obsidian"
            style={{ backgroundColor: flight.airline.logoColor }}
            aria-hidden
          >
            {flight.airline.code}
          </span>
          <div>
            <p className="text-sm font-medium text-frost">{flight.airline.name}</p>
            <p className="text-xs text-silver">
              {flight.flightNumber} · {flight.aircraft.model}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] tracking-wide ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="font-display text-2xl font-semibold text-frost">{formatTime(flight.departure)}</p>
          <p className="text-xs text-silver">{flight.from}</p>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="text-[11px] text-silver">{formatDuration(flight.durationMinutes)}</span>
          <span className="relative flex w-20 items-center sm:w-28" aria-hidden>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-silver/50 to-transparent" />
            <Plane className="size-3 text-champagne" />
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-silver/50 to-transparent" />
          </span>
          <span className="text-[11px] text-silver">
            {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop · ${flight.stopCities[0] ?? ''}`}
          </span>
        </div>

        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-frost">{formatTime(flight.arrival)}</p>
          <p className="text-xs text-silver">{flight.to}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="text-xs text-silver">
          {cabin} · {flight.stops === 0 ? 'Direct' : 'Via ' + (flight.stopCities[0] ?? '—')}
        </div>
        <div className="flex items-center gap-4">
          <p className="font-display text-xl font-semibold text-champagne">{formatINR(price)}</p>
          <Link
            to={`/flights/${flight.id}`}
            state={{ passengers, cabin }}
            className="group inline-flex items-center gap-2 rounded-full bg-champagne px-4 py-2 text-xs font-semibold text-obsidian transition-colors hover:bg-champagne-soft"
          >
            Select Flight
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
