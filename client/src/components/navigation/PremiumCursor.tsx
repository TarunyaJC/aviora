import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * Premium desktop cursor: a champagne dot trailing a lagging ring.
 * Automatically disabled for touch devices and reduced-motion users.
 * Purely decorative — pointer events pass through, native cursor stays available.
 */
export function PremiumCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    setEnabled(true);

    let raf = 0;
    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;

    const onMove = (e: MouseEvent): void => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      }
      const target = e.target as HTMLElement | null;
      setActive(Boolean(target?.closest('a, button, [role="button"], input, select, textarea, [data-cursor="active"]')));
    };

    const loop = (): void => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className={cn(
          'pointer-events-none fixed left-0 top-0 z-[100] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne transition-[width,height] duration-150',
        )}
      />
      <div
        ref={ringRef}
        aria-hidden
        className={cn(
          'pointer-events-none fixed left-0 top-0 z-[100] size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200',
          active ? 'scale-125 border-champagne/80 bg-champagne/10' : 'border-white/25',
        )}
      />
    </>
  );
}
