export function FlightCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="h-7 w-16 animate-pulse rounded bg-white/10" />
        <div className="h-2 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-7 w-16 animate-pulse rounded bg-white/10 justify-self-end" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-32 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}
