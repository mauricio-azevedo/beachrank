'use client';

import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { Group, GroupMember, GroupMemberRole, Match, MyGroup } from '@/types/api';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Body, Dot, Label, Meta, Stat, Title } from '@/components/ui/text';
import { StandingCard } from '@/features/groups/components/standing-card';
import { GroupMembersDrawer } from '@/features/groups/components/group-members-drawer';
import { cn } from '@/lib/utils';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';

export type GroupSummaryCardProps = {
  group: Group;
  ranking: GroupMember[];
  members: GroupMember[];
  matches: Match[];
  membership: MyGroup | null;
};

export function GroupSummaryCard({
  group,
  ranking,
  members,
  matches,
  membership,
}: GroupSummaryCardProps) {
  const currentRankIndex = membership
    ? ranking.findIndex((member) => member.id === membership.id)
    : -1;
  const currentMember = membership
    ? (ranking[currentRankIndex] ?? members.find((member) => member.id === membership.id) ?? null)
    : null;
  const memberCount = group._count?.members ?? members.length;
  const matchCount = group._count?.matches ?? matches.length;
  const currentRating = currentMember?.rating ?? membership?.rating ?? null;

  const standing =
    membership && currentRating !== null
      ? buildStanding(ranking, currentRankIndex, currentRating)
      : null;

  const movement = currentMember?.rankingMovement ?? null;
  const lastChange = membership ? lastRatingChange(matches, membership.id) : null;

  return (
    <div className="space-y-5">
      <GroupIdentityHeader
        group={group}
        members={members}
        ranking={ranking}
        memberCount={memberCount}
        matchCount={matchCount}
        viewerRole={membership?.role ?? null}
      />

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
  members,
  ranking,
  memberCount,
  matchCount,
  viewerRole,
}: {
  group: Group;
  members: GroupMember[];
  ranking: GroupMember[];
  memberCount: number;
  matchCount: number;
  viewerRole: GroupMemberRole | null;
}) {
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <div className="flex flex-col items-center text-center">
      <Stat
        size="lg"
        className="flex size-[74px] items-center justify-center rounded-full bg-[linear-gradient(150deg,var(--accent),var(--accent-dark))] text-white shadow-[0_8px_20px_rgba(31,73,135,0.45),inset_0_0_0_1px_var(--border-accent)]"
      >
        {getGroupInitials(group.name)}
      </Stat>

      <Title className="mt-base">{group.name}</Title>

      <Meta className="mt-snug flex items-center gap-snug text-muted-foreground">
        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className={cn(
            'flex items-center gap-tight transition-opacity active:opacity-60',
            TOUCH_TARGET_48,
          )}
        >
          <span className="text-foreground">{memberCount}</span>
          {memberCount === 1 ? 'jogador' : 'jogadores'}
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
        <Dot className="mx-0" />
        <span className="flex items-center gap-tight">
          <span className="text-foreground">{matchCount}</span>
          {matchCount === 1 ? 'partida' : 'partidas'}
        </span>
      </Meta>

      {group.description && <GroupDescription text={group.description} />}

      <GroupMembersDrawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        groupId={group.id}
        groupName={group.name}
        viewerRole={viewerRole}
        members={members}
        ranking={ranking}
      />
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

function getGroupInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
