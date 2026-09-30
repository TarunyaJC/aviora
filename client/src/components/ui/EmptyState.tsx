import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-champagne/25 bg-champagne/10 text-champagne">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold tracking-wide text-frost">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-silver">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
