import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { Label, Meta, Overline, Stat } from '@/components/ui/text';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { avatarBgClass, nameInitial } from '@/lib/avatar';
import { formatFeedItemTime } from '@/features/feed/helpers/feed-item-time.helper';
import type { ClaimRecentMatch } from '@/types/api';

// The "de qual grupo / que convite é esse" chip at the top of every claim screen.
export function GroupBrandChip({
  groupName,
  title = 'Convite',
}: {
  groupName: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <GroupAvatar name={groupName} size="sm" tone="brand" />
      <div className="flex min-w-0 flex-col">
        <Label className="truncate text-foreground">{title}</Label>
        <Meta className="truncate text-faint-foreground">{groupName}</Meta>
      </div>
    </div>
  );
}

// The stub's faceless, dashed avatar — it has no account yet.
export function DashedAvatar({ initial, className }: { initial: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex items-center justify-center rounded-full border-2 border-dashed border-border-accent font-display text-muted-foreground',
        className,
      )}
    >
      {initial}
    </div>
  );
}

// A real person/account avatar with the stable per-member fill.
export function PersonAvatar({
  seed,
  name,
  className,
  accent,
}: {
  seed: string;
  name: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex items-center justify-center rounded-full font-display shadow-[inset_0_0_0_1px_var(--border-accent)]',
        avatarBgClass(seed),
        accent ? 'text-brand' : 'text-foreground',
        className,
      )}
    >
      {nameInitial(name)}
    </div>
  );
}

// Posição / Rating / Partidas — the history being inherited.
export function StatTrio({
  rank,
  rating,
  matchesCount,
}: {
  rank: number | null;
  rating: number;
  matchesCount: number;
}) {
  const cells = [
    { label: 'Posição', value: rank ? `#${rank}` : '—' },
    { label: 'Rating', value: String(Math.round(rating)) },
    { label: 'Partidas', value: String(matchesCount) },
  ];

  return (
    <div className="flex items-center rounded-3xl bg-surface px-1 py-4 shadow-hairline">
      {cells.map((cell, index) => (
        <Fragment key={cell.label}>
          {index > 0 && <span className="h-8 w-px shrink-0 bg-border-accent/50" aria-hidden />}
          <div className="flex flex-1 flex-col items-center gap-1">
            <Stat size="md" className="text-foreground">
              {cell.value}
            </Stat>
            <Overline size="xs" className="text-faint-foreground">
              {cell.label}
            </Overline>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// "Últimas partidas" — the recognition aid: a few of the stub's recent games.
export function RecentMatches({ matches }: { matches: ClaimRecentMatch[] }) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <Overline size="xs" className="px-0.5 text-faint-foreground">
        Últimas partidas
      </Overline>
      <div className="overflow-hidden rounded-3xl bg-surface shadow-hairline">
        {matches.map((match) => {
          const won = match.result === 'WIN';
          return (
            <div
              key={match.id}
              className="flex items-center gap-3 border-t border-divider px-3.5 py-3 first:border-t-0"
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg text-meta font-extrabold',
                  won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                )}
                aria-hidden
              >
                {won ? 'V' : 'D'}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <Label className="truncate text-foreground">
                  com {match.partners.join(' & ') || '—'}
                </Label>
                <Meta className="truncate text-muted-foreground">
                  vs {match.opponents.join(' & ')}
                </Meta>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <Stat size="sm" className="text-foreground">
                  {match.scoreFor}–{match.scoreAgainst}
                </Stat>
                <Meta className="text-faint-foreground">{formatFeedItemTime(match.playedAt)}</Meta>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
