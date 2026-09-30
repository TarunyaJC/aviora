/**
 * Premium button primitive — champagne primary, ghost secondary, outline tertiary.
 * Design tokens come from the Tailwind 4 theme; variants keep the UI consistent.
 */
import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'ghost' | 'outline';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  loading?: boolean;
  /** Render as a child element (e.g. react-router Link) instead of <button>. */
  asChild?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-champagne text-obsidian font-semibold hover:bg-champagne-soft active:bg-champagne shadow-[0_8px_30px_rgba(212,176,106,0.25)]',
  ghost: 'text-frost/80 hover:text-frost hover:bg-white/5',
  outline:
    'border border-silver/30 text-frost hover:border-champagne/60 hover:bg-champagne/5 transition-colors',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm tracking-wide ' +
  'transition-all duration-200 ease-lux disabled:opacity-50 disabled:pointer-events-none ' +
  'cursor-pointer select-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, asChild = false, className, children, disabled, ...rest },
  ref,
) {
  const classes = cn(BASE_CLASSES, VARIANT_CLASSES[variant], className);

  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: cn(classes, (children.props as { className?: string } | undefined)?.className),
    });
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
