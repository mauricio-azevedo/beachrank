import { cn } from '@/lib/utils';
import { Overline } from '@/components/ui/text';

// The Arena brand lockup: the app mark in an accent-gradient tile beside the
// wordmark and "Beach Tennis" overline. Single-sourced so every unauthenticated
// surface (login today, a landing screen later) shows one identity. Token-driven
// — the tile fill is the brand gradient (accent → accent-dark) with the standard
// accent edge + shadow.
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <div className="flex size-[2.875rem] items-center justify-center rounded-[0.875rem] bg-gradient-to-br from-accent to-accent-dark text-brand-foreground shadow-button">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="9" r="6.2" />
          <path d="M12 15.2V21M8.4 12.6l7.2-7.2" />
        </svg>
      </div>
      <div className="flex flex-col">
        {/* Wordmark — a genuine one-off, so it reads the 26px size token but sets
            its own tight tracking / line-height rather than a text role. */}
        <span className="text-stat-lg leading-none tracking-[-0.9px]">Arena</span>
        <Overline className="mt-1 tracking-[0.125rem] text-faint-foreground">Beach Tennis</Overline>
      </div>
    </div>
  );
}
