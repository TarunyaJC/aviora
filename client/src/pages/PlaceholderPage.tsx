import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
}

/** Elegant placeholder for routes that arrive in later development phases. */
export function PlaceholderPage({ title, phase, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
      <span className="grid place-items-center size-14 rounded-2xl bg-champagne/10 border border-champagne/25 text-champagne">
        <Construction className="size-6" aria-hidden />
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs tracking-[0.25em] uppercase text-champagne/80">{phase}</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-silver">{description}</p>

      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-silver/30 px-5 py-2.5 text-sm text-frost transition-colors hover:border-champagne/60 hover:bg-champagne/5"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to home
      </Link>
    </section>
  );
}
