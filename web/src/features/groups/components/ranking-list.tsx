import { ArrowDown, ArrowUp } from 'lucide-react';
import type { GroupMember, RankingMovement } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { Body, Dot, Label, Meta, Overline, Stat } from '@/components/ui/text';
import { MemberName } from '@/features/members/components/member-name';
import { resolveMemberName } from '@/lib/member-name';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/components/ui/member-avatar';

type Props = {
  ranking: GroupMember[];
  currentMembershipId: string | null;
};

export function RankingList({ ranking, currentMembershipId }: Props) {
  if (ranking.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-snug p-4">
          <Label className="block text-foreground">Nenhum jogador no ranking ainda</Label>
          <Body className="text-muted-foreground">
            Registre partidas para transformar os jogadores em uma disputa real.
          </Body>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="Ranking do grupo" className="space-y-base">
      <div className="flex items-baseline justify-end px-0.5">
        <Meta className="text-faint-foreground">Rating</Meta>
      </div>

      <div className="overflow-hidden rounded-3xl bg-card shadow-card">
        {ranking.map((member, index) => (
          <RankingRow
            key={member.id}
            member={member}
            rank={index + 1}
            isCurrent={member.id === currentMembershipId}
          />
        ))}
      </div>
    </section>
  );
}

function RankingRow({
  member,
  rank,
  isCurrent,
}: {
  member: GroupMember;
  rank: number;
  isCurrent: boolean;
}) {
  const fullName = getMemberDisplayName(member);

  const rankColor =
    rank === 1
      ? 'text-medal-1'
      : rank === 2
        ? 'text-medal-2'
        : rank === 3
          ? 'text-medal-3'
          : isCurrent
            ? 'text-foreground'
            : 'text-faint-foreground';

  return (
    <div
      className={cn(
        'flex items-center gap-base border-t border-divider px-4 py-3 first:border-t-0',
        isCurrent && 'bg-brand/15',
      )}
    >
      <Stat size="sm" className={cn('w-6 shrink-0 text-center', rankColor)}>
        {rank}
      </Stat>

      <MemberAvatar
        userId={member.userId}
        name={fullName}
        avatarColor={member.user?.avatarColor ?? null}
        size="sm"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-tight">
        <div className="flex min-w-0 items-end gap-snug">
          <Label className="min-w-0 truncate text-foreground">
            <MemberName memberId={member.id}>{fullName}</MemberName>
          </Label>

          {isCurrent && (
            <span className="shrink-0 rounded-md bg-brand/20 px-1.5 py-px text-brand">
              <Overline size="xs" className="text-brand">
                Você
              </Overline>
            </span>
          )}

          <Movement movement={member.rankingMovement} />
        </div>

        <StatsLine member={member} />
      </div>

      <Stat size="sm" className="shrink-0 text-foreground">
        {member.rating.toFixed(0)}
      </Stat>
    </div>
  );
}

function Movement({ movement }: { movement?: RankingMovement | null }) {
  if (!movement) {
    return null;
  }

  const isUp = movement.direction === 'UP';
  const Icon = isUp ? ArrowUp : ArrowDown;
  const label = `${isUp ? 'Subiu' : 'Caiu'} ${movement.positions} ${
    movement.positions === 1 ? 'posição' : 'posições'
  }`;

  return (
    <Meta
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center gap-tight',
        isUp ? 'text-success' : 'text-danger',
      )}
    >
      <Icon className="size-2.5" strokeWidth={3.2} aria-hidden />
      {movement.positions}
    </Meta>
  );
}

// Two muted tones for hierarchy: the figures sit at `muted`, the words at the
// dimmer `faint` so the numbers read first.
function StatsLine({ member }: { member: GroupMember }) {
  const stats = member.stats ?? { matchesCount: 0, winsCount: 0 };

  if (stats.matchesCount === 0) {
    return <Meta className="text-faint-foreground">Sem partidas</Meta>;
  }

  const winPct = Math.round((stats.winsCount / stats.matchesCount) * 100);

  return (
    <Meta className="text-faint-foreground">
      <span className="text-muted-foreground">{stats.matchesCount}</span> jogos
      <Dot />
      <span className="text-muted-foreground">{winPct}%</span> vit.
    </Meta>
  );
}

function getMemberDisplayName(member: GroupMember) {
  return resolveMemberName(member).fullName;
}
