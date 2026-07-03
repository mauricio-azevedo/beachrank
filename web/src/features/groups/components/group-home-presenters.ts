import { formatFeedItemTime } from '@/features/feed/helpers/feed-item-time.helper';
import type { CloseMatchFeedMetadata } from '@/features/feed/types/close-match-feed-metadata.type';
import type { DominantWinFeedMetadata } from '@/features/feed/types/dominant-win-feed-metadata.type';
import type { RankingMovementFeedMetadata } from '@/features/feed/types/ranking-movement-feed-metadata.type';
import type { GroupHomeActivity, GroupHomeCard } from '@/features/groups/types/group-home.type';

export type GroupSystemStatus =
  | { kind: 'failed'; label: 'Atenção' }
  | { kind: 'processing'; label: 'Atualizando' };

export type StandingDisplay = {
  rank: number | null;
  headline: string;
  movement: { direction: 'UP' | 'DOWN'; positions: number } | null;
  rating: number | null;
  ratingSuffix: 'rating' | 'rating inicial' | null;
};

export function getGroupSystemStatus(item: GroupHomeCard): GroupSystemStatus | null {
  if (item.projection?.status === 'FAILED') {
    return { kind: 'failed', label: 'Atenção' };
  }

  if (item.projection?.status === 'PROCESSING') {
    return { kind: 'processing', label: 'Atualizando' };
  }

  return null;
}

export function getStandingDisplay(item: GroupHomeCard): StandingDisplay {
  if (!item.currentUser) {
    return {
      rank: null,
      headline: 'Entre para competir',
      movement: null,
      rating: null,
      ratingSuffix: null,
    };
  }

  const standing = item.currentUser.standing;

  if (standing.kind === 'UNRANKED') {
    return {
      rank: null,
      headline: 'Pronto para começar',
      movement: null,
      rating: standing.rating,
      ratingSuffix: 'rating inicial',
    };
  }

  return {
    rank: standing.rank,
    headline: standing.rank === 1 ? 'Você lidera' : `#${standing.rank} no ranking`,
    movement: standing.rankingMovement,
    rating: standing.rating,
    ratingSuffix: 'rating',
  };
}

export function getLeaderLine(item: GroupHomeCard, standing?: StandingDisplay) {
  const leader = item.leaders[0];

  if (!leader) {
    return 'Ranking ainda não começou';
  }

  if (standing?.rank && standing.rating !== null) {
    if (standing.rank === 1) {
      return 'Você lidera';
    }

    const gap = Math.round(leader.rating - standing.rating);

    if (gap > 0) {
      return `${gap} ${gap === 1 ? 'ponto' : 'pontos'} até o líder`;
    }
  }

  return `${getFirstName(leader.displayName)} lidera · ${Math.round(leader.rating)}`;
}

export function getActivityLine(item: GroupHomeCard) {
  const activity = item.activity.lastRelevant;

  if (!activity) {
    return null;
  }

  return `${formatFeedItemTime(activity.occurredAt)} · ${getActivityHeadline(activity)}`;
}

export function getLatestActivityItem(items: GroupHomeCard[]) {
  return items.reduce<GroupHomeCard | null>((latest, item) => {
    if (!item.activity.lastRelevantAt && !item.activity.lastRelevant) {
      return latest;
    }

    if (!latest) {
      return item;
    }

    return getTime(getActivityDate(item)) > getTime(getActivityDate(latest)) ? item : latest;
  }, null);
}

export function getActivityDate(item: GroupHomeCard) {
  return (
    item.activity.lastRelevant?.occurredAt ?? item.activity.lastRelevantAt ?? item.group.updatedAt
  );
}

export function getBestRank(items: GroupHomeCard[]) {
  const ranks = items
    .map((item) => item.currentUser?.standing)
    .filter(
      (
        standing,
      ): standing is Extract<
        NonNullable<GroupHomeCard['currentUser']>['standing'],
        { kind: 'RANKED' }
      > => Boolean(standing && standing.kind === 'RANKED'),
    )
    .map((standing) => standing.rank);

  return ranks.length > 0 ? Math.min(...ranks) : null;
}

export function formatGroupsCount(count: number) {
  return `${count} ${count === 1 ? 'grupo' : 'grupos'}`;
}

export function formatMembersCount(count: number) {
  return `${count} ${count === 1 ? 'jogador' : 'jogadores'}`;
}

function getActivityHeadline(activity: GroupHomeActivity) {
  if (activity.type === 'RANKING_MOVEMENT') {
    const metadata = activity.metadata as Partial<RankingMovementFeedMetadata>;

    return typeof metadata.headline === 'string' && metadata.headline.trim()
      ? metadata.headline
      : 'Ranking mudou depois da partida';
  }

  if (activity.type === 'MATCH_BLOWOUT') {
    const metadata = activity.metadata as Partial<DominantWinFeedMetadata>;

    return buildMatchHeadline(metadata);
  }

  if (activity.type === 'MATCH_CLOSE') {
    const metadata = activity.metadata as Partial<CloseMatchFeedMetadata>;

    return buildMatchHeadline(metadata);
  }

  return 'Novo destaque no grupo';
}

function buildMatchHeadline(metadata: Partial<DominantWinFeedMetadata | CloseMatchFeedMetadata>) {
  if (typeof metadata.gamesA !== 'number' || typeof metadata.gamesB !== 'number') {
    return 'Partida registrada';
  }

  const winnerScore = Math.max(metadata.gamesA, metadata.gamesB);
  const loserScore = Math.min(metadata.gamesA, metadata.gamesB);

  if (!Array.isArray(metadata.winners)) {
    return `Partida terminou ${winnerScore}–${loserScore}`;
  }

  const winnerNames = metadata.winners
    .map((player) => player.displayName)
    .filter((name): name is string => Boolean(name));
  const winners = formatNames(winnerNames);

  if (!winners) {
    return `Partida terminou ${winnerScore}–${loserScore}`;
  }

  return `${winners} ${winnerNames.length === 1 ? 'venceu' : 'venceram'} por ${winnerScore}–${loserScore}`;
}

function formatNames(names: string[]) {
  const cleanNames = names.filter(Boolean);

  if (cleanNames.length === 0) {
    return '';
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} e ${cleanNames[1]}`;
  }

  return `${cleanNames[0]}, ${cleanNames[1]} e mais ${cleanNames.length - 2}`;
}

function getFirstName(name: string) {
  return name.trim().split(' ')[0] || 'Jogador';
}

function getTime(value: string | Date | null) {
  return value ? new Date(value).getTime() : 0;
}
