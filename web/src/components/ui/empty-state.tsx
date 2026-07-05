import type { ReactNode } from 'react';
import { Body, Label, Meta, Title } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type EmptyStateSize = 'sm' | 'lg';
type EmptyStateTone = 'surface' | 'dashed' | 'success';

const CIRCLE_SIZE: Record<EmptyStateSize, string> = {
  sm: 'size-14',
  lg: 'size-[88px]',
};

const CIRCLE_TONE: Record<EmptyStateTone, string> = {
  surface: 'bg-surface text-faint-foreground shadow-hairline',
  dashed: 'border border-dashed border-border-accent text-faint-foreground',
  success: 'bg-success/15 text-success shadow-[inset_0_0_0_1.5px_var(--success)]',
};

type EmptyStateProps = {
  // Rendered verbatim inside the circle — the caller owns icon size/stroke/color.
  icon: ReactNode;
  title?: ReactNode;
  hint?: ReactNode;
  // lg = screen/tab empties (Title + Body); sm = compact drawer/inline empties
  // (Label + Meta).
  size?: EmptyStateSize;
  tone?: EmptyStateTone;
  // Context spacing (paddings, min-h, justify) — the caller owns its placement.
  className?: string;
  // Follow-up content (CTAs, extra rows) below the text.
  children?: ReactNode;
};

// The centered icon-circle empty/terminal state used across drawers, tabs and full
// screens: one circle, one text rhythm, tone variants for surface/dashed/success.
// Titles render as plain text (no heading semantics) — callers that need a semantic
// heading own it themselves.
export function EmptyState({
  icon,
  title,
  hint,
  size = 'lg',
  tone = 'surface',
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-full',
          CIRCLE_SIZE[size],
          CIRCLE_TONE[tone],
        )}
      >
        {icon}
      </span>

      {title !== undefined &&
        (size === 'lg' ? (
          <Title asChild className="mt-comfortable text-foreground">
            <p>{title}</p>
          </Title>
        ) : (
          <Label asChild className="mt-comfortable text-muted-foreground">
            <p>{title}</p>
          </Label>
        ))}

      {hint !== undefined &&
        (size === 'lg' ? (
          <Body className="mx-auto mt-snug max-w-[19rem] text-muted-foreground">{hint}</Body>
        ) : (
          <Meta asChild className="mt-snug max-w-60 text-faint-foreground">
            <p>{hint}</p>
          </Meta>
        ))}

      {children}
    </div>
  );
}
