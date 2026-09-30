import { useEffect, useState } from 'react';
import AircraftScene from './AircraftScene';
import { cn } from '@/utils/cn';

interface AircraftHeroProps {
  className?: string;
}

/** Landing-page hero mount for the 3D experience. Purely decorative. */
export function AircraftHero({ className }: AircraftHeroProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    // Gentle scroll parallax; never blocks scrolling.
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      className={cn('pointer-events-none relative', className)}
      style={{ transform: `translateY(${Math.min(offset * 0.12, 90)}px)`, opacity: Math.max(1 - offset / 700, 0.25) }}
      aria-hidden
    >
      <AircraftScene className="h-full" />
    </div>
  );
}
