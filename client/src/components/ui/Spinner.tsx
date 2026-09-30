import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex text-silver', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
    </span>
  );
}
