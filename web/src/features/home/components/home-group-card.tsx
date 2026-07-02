import Link from 'next/link';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dot, Label, Meta, Overline, Stat } from '@/components/ui/text';
import type { GroupHomeCard } from '@/features/groups/types/group-home.type';
import { hueFromId } from '@/features/weekly-highlights/helpers/highlight-style';
import { cn } from '@/lib/utils';

function groupInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

type Tone = 'recent' | 'medium' | 'old';

// Recente (hoje/ontem) = verde; meio-termo (até 1 semana) = 2º muted + bolinha
// amarela; antigo (> 1 semana) = 3º muted (mais escuro).
const TONE: Record<Tone, { text: string; dot: string }> = {
  recent: { text: 'text-success', dot: 'bg-success' },
  medium: { text: 'text-faint-foreground', dot: 'bg-tag-warn' },
  old: { text: 'text-dim-foreground', dot: 'bg-dim-foreground' },
};

function lastMatchDisplay(iso: string): { label: string; tone: Tone } {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  let label: string;
  if (days <= 0) label = 'Última partida hoje';
  else if (days === 1) label = 'Última partida ontem';
  else if (days < 7) label = `Última partida há ${days} dias`;
  else if (days < 14) label = 'Última partida há 1 semana';
  else if (days < 30) label = `Última partida há ${Math.floor(days / 7)} semanas`;
  else if (days < 60) label = 'Última partida há 1 mês';
  else label = `Última partida há ${Math.floor(days / 30)} meses`;

  const tone: Tone = days <= 1 ? 'recent' : days <= 7 ? 'medium' : 'old';
  return { label, tone };
}

export function HomeGroupCard({ card }: { card: GroupHomeCard }) {
  const hue = hueFromId(card.group.id);
  const isMember = card.relationship === 'MEMBER';
  const standing = card.currentUser?.standing;
  const movement = standing?.kind === 'RANKED' ? standing.rankingMovement : null;
  const lastMatch = card.group.lastMatchAt ? lastMatchDisplay(card.group.lastMatchAt) : null;

  return (
    <Link
      href={`/groups/${card.group.id}`}
      className="block transition-transform active:scale-[0.99]"
    >
      <Card size="sm">
        <CardContent className="flex items-center gap-comfortable">
          <span
            aria-hidden
            className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `linear-gradient(150deg, oklch(65% 0.15 ${hue}), oklch(58% 0.15 ${hue}))`,
              boxShadow: 'inset 0 0 0 1px var(--border-accent)',
            }}
          >
            <Stat size="md" className="text-white">
              {groupInitials(card.group.name)}
            </Stat>
          </span>

          <div className="min-w-0 flex-1">
            <Label className="block truncate">{card.group.name}</Label>
            <Meta className="mt-tight block text-muted-foreground">
              <span className="text-foreground">{card.group.membersCount}</span> jogadores
              <Dot />
              <span className="text-foreground">{card.group.matchesCount}</span> partidas
            </Meta>
            {lastMatch ? (
              <Meta
                className={cn('mt-tight flex items-center gap-tight', TONE[lastMatch.tone].text)}
              >
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', TONE[lastMatch.tone].dot)}
                />
                {lastMatch.label}
              </Meta>
            ) : null}
          </div>

          {isMember ? (
            <div className="shrink-0 text-right">
              <Overline>Você</Overline>
              {/* mt-0.5: 2px optical nudge under the "Você" overline — not layout spacing. */}
              <div className="mt-0.5 flex items-baseline justify-end gap-tight">
                <Stat size="md">{standing?.kind === 'RANKED' ? `#${standing.rank}` : '—'}</Stat>
                {movement ? (
                  <TrendBadge direction={movement.direction} positions={movement.positions} />
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function TrendBadge({ direction, positions }: { direction: 'UP' | 'DOWN'; positions: number }) {
  const up = direction === 'UP';
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-tight text-sm font-bold tabular-nums',
        up ? 'text-success' : 'text-danger',
      )}
    >
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {positions}
    </span>
  );
}
