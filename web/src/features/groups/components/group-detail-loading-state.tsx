export function GroupDetailLoadingState() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-loose">
      <span className="sr-only">Carregando grupo</span>

      <div className="space-y-base">
        <div className="space-y-5">
          {/* identity: monogram, name, counts */}
          <div className="flex flex-col items-center">
            <div className="size-[74px] animate-pulse rounded-full bg-muted" />
            <div className="mt-base h-6 w-44 animate-pulse rounded-full bg-muted" />
            <div className="mt-snug h-4 w-52 animate-pulse rounded-full bg-muted/70" />
          </div>

          {/* search */}
          <div className="h-12 animate-pulse rounded-pill bg-muted/70" />

          {/* standing card */}
          <div className="h-60 animate-pulse rounded-hero bg-muted/60" />
        </div>

        {/* actions: register match + players button */}
        <div className="flex items-center gap-snug">
          <div className="h-12 flex-1 animate-pulse rounded-pill bg-muted" />
          <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted/70" />
        </div>
      </div>

      {/* tabs */}
      <div className="space-y-5">
        <div className="flex gap-7 border-b border-divider">
          <div className="mt-3 mb-4 h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="mt-3 mb-4 h-5 w-16 animate-pulse rounded-full bg-muted/60" />
        </div>

        {/* ranking rows */}
        <div className="overflow-hidden rounded-3xl bg-card shadow-card">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-base border-t border-divider px-4 py-3 first:border-t-0"
            >
              <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-snug">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted/70" />
              </div>
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
