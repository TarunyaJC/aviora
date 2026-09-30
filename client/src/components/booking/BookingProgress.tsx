import { Check } from 'lucide-react';
import { BOOKING_STEPS } from '@/constants/app';
import { cn } from '@/utils/cn';

export function BookingProgress({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-4" aria-label="Booking progress">
      {BOOKING_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-[11px] font-semibold transition-colors',
                  done && 'border-champagne bg-champagne text-obsidian',
                  active && 'border-champagne text-champagne',
                  !done && !active && 'border-white/15 text-silver/50',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-[11px] tracking-[0.15em] uppercase',
                  active ? 'text-champagne' : done ? 'text-frost/80' : 'text-silver/50',
                )}
              >
                {step}
              </span>
            </div>
            {index < BOOKING_STEPS.length - 1 ? (
              <span className={cn('h-px w-4 sm:w-8', done ? 'bg-champagne/60' : 'bg-white/10')} aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
