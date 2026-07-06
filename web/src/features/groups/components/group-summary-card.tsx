'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Group, GroupMember, Match, MyGroup } from '@/types/api';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Body, Dot, Label, Meta, Title } from '@/components/ui/text';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { StandingCard } from '@/features/groups/components/standing-card';

export type GroupSummaryCardProps = {
  group: Group;
  ranking: GroupMember[];
  members: GroupMember[];
  matches: Match[];
  membership: MyGroup | null;
  // 0-match group: identity only — search and standing wait for the first match.
  isEmpty: boolean;
};

export function GroupSummaryCard({
  group,
  ranking,
  members,
  matches,
  membership,
  isEmpty,
}: GroupSummaryCardProps) {
  const currentRankIndex = membership
    ? ranking.findIndex((member) => member.id === membership.id)
    : -1;
  const currentMember = membership
    ? (ranking[currentRankIndex] ?? members.find((member) => member.id === membership.id) ?? null)
    : null;
  // Live lists, not `group._count`: the counts must agree with what the members
  // drawer and the Partidas tab actually show (both exclude left members and
  // soft-deleted matches; `_count` does not).
  const memberCount = members.length;
  const matchCount = matches.length;
  const currentRating = currentMember?.rating ?? membership?.rating ?? null;

  const standing =
    membership && currentRating !== null
      ? buildStanding(ranking, currentRankIndex, currentRating)
      : null;

  const movement = currentMember?.rankingMovement ?? null;
  const lastChange = membership ? lastRatingChange(matches, membership.id) : null;

  return (
    <div className="space-y-5">
      <GroupIdentityHeader group={group} memberCount={memberCount} matchCount={matchCount} />

      {!isEmpty && (
        <>
          <GroupSearchField />

          {standing && currentRating !== null && (
            <StandingCard
              rank={standing.rank}
              progress={standing.progress}
              pointsToClimb={standing.pointsToClimb}
              rating={currentRating}
              lastChange={lastChange}
              movement={
                movement
                  ? {
                      direction: movement.direction,
                      positions: movement.positions,
                      occurredAt: movement.occurredAt,
                    }
                  : null
              }
            />
          )}
        </>
      )}
    </div>
  );
}

type Standing = {
  rank: number | null;
  progress: number;
  pointsToClimb: number | null;
};

function buildStanding(ranking: GroupMember[], index: number, rating: number): Standing {
  if (index < 0) {
    return { rank: null, progress: 0, pointsToClimb: null };
  }

  const rank = index + 1;
  const above = index > 0 ? ranking[index - 1] : null;
  const below = index < ranking.length - 1 ? ranking[index + 1] : null;

  if (!above) {
    return { rank, progress: 1, pointsToClimb: null };
  }

  const pointsToClimb = Math.max(1, Math.ceil(above.rating - rating));

  // The ring maps the viewer's rating within the band between the member
  // directly above (the target, full ring) and the one directly below (empty).
  // Last place has no member below to anchor the band, so it reads empty.
  const progress = below
    ? clamp01((rating - below.rating) / Math.max(1, above.rating - below.rating))
    : 0;

  return { rank, progress, pointsToClimb };
}

// The viewer's most recent rating change: net of all their matches on the most
// recent day they played. Returns null when they have no matches in the set.
function lastRatingChange(
  matches: Match[],
  membershipId: string,
): { delta: number; occurredAt: string } | null {
  const byDay = new Map<string, { delta: number; occurredAt: string }>();

  for (const match of matches) {
    for (const player of match.players) {
      if (player.groupMemberId !== membershipId) {
        continue;
      }
      const dayKey = new Date(match.playedAt).toDateString();
      const prev = byDay.get(dayKey);
      const occurredAt =
        prev && new Date(prev.occurredAt) > new Date(match.playedAt)
          ? prev.occurredAt
          : match.playedAt;
      byDay.set(dayKey, { delta: (prev?.delta ?? 0) + player.ratingDelta, occurredAt });
    }
  }

  let latest: { delta: number; occurredAt: string } | null = null;
  for (const entry of byDay.values()) {
    if (!latest || new Date(entry.occurredAt) > new Date(latest.occurredAt)) {
      latest = entry;
    }
  }

  return latest ? { delta: Math.round(latest.delta), occurredAt: latest.occurredAt } : null;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function GroupIdentityHeader({
  group,
  memberCount,
  matchCount,
}: {
  group: Group;
  memberCount: number;
  matchCount: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <GroupAvatar
        name={group.name}
        groupId={group.id}
        avatarColor={group.avatarColor}
        size="hero"
        className="shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_0_0_1px_var(--border-accent)]"
      />

      <Title className="mt-base">{group.name}</Title>

      <Meta className="mt-snug flex items-center gap-snug text-muted-foreground">
        <span className="flex items-center gap-tight">
          <span className="text-foreground">{memberCount}</span>
          {memberCount === 1 ? 'jogador' : 'jogadores'}
        </span>
        <Dot className="mx-0" />
        <span className="flex items-center gap-tight">
          <span className="text-foreground">{matchCount}</span>
          {matchCount === 1 ? 'partida' : 'partidas'}
        </span>
      </Meta>

      {group.description && <GroupDescription text={group.description} />}
    </div>
  );
}

function GroupDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Body
      asChild
      className={
        open
          ? 'mt-snug max-w-[320px] text-faint-foreground'
          : 'mt-snug flex max-w-[320px] items-baseline gap-tight text-faint-foreground'
      }
    >
      <div>
        <span className={open ? undefined : 'min-w-0 flex-1 truncate'}>{text}</span>
        <Label asChild>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 whitespace-nowrap text-brand-muted"
          >
            {open ? 'ler menos' : 'ler mais'}
          </button>
        </Label>
      </div>
    </Body>
  );
}

function GroupSearchField() {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder="Buscar jogador ou partida"
        aria-label="Buscar jogador ou partida"
      />
    </InputGroup>
  );
}
