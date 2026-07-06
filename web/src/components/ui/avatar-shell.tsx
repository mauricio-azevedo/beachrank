import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// The shared avatar circle both MemberAvatar and GroupAvatar render through, so the
// round shell exists once instead of being copied per primitive (or hand-rolled at a
// call site). It owns only the universal bits — the round, centered, non-shrinking
// circle and the one thing that must be inline, the gradient fill. Size, ring, tone
// and text colour stay with each wrapper (their scales differ on purpose), passed via
// className; content (initials or an icon) is the children.
export function AvatarShell({
  gradient,
  className,
  children,
}: {
  gradient?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      style={gradient ? { backgroundImage: gradient } : undefined}
      className={cn('flex shrink-0 items-center justify-center rounded-full', className)}
    >
      {children}
    </span>
  );
}
