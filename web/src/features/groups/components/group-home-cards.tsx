import Link from 'next/link';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatFeedItemTime } from '@/features/feed/helpers/feed-item-time.helper';
import { GroupAvatar } from '@/components/ui/group-avatar';
import type { GroupHomeCard } from '@/features/groups/types/group-home.type';
import {
  formatGroupsCount,
  formatMembersCount,
  getActivityDate,
  getActivityLine,
  getBestRank,
  getGroupSystemStatus,
  getLatestActivityItem,
  getLeaderLine,
  getStandingDisplay,
  type GroupSystemStatus,
  type StandingDisplay,
} from './group-home-presenters';

export function HomeTopline({ items }: { items: GroupHomeCard[] }) {
  const bestRank = getBestRank(items);
  const latestItem = getLatestActivityItem(items);
  const latestLine = latestItem
    ? `${formatFeedItemTime(getActivityDate(latestItem))} em ${latestItem.group.name}`
    : 'Registre uma partida para movimentar o ranking';
  const primaryLine = `${formatGroupsCount(items.length)}${bestRank ? ` · melhor #${bestRank}` : ''}`;

  return (
    <div className="flex items-start justify-between gap-comfortable px-1">
      <div className="min-w-0 space-y-tight">
        <p className="text-sm font-semibold tracking-[-0.015em] text-foreground">{primaryLine}</p>
        <p className="text-sm leading-6 text-muted-foreground">{latestLine}</p>
      </div>
      <Button asChild size="icon" variant="secondary" className="h-11 w-11 shrink-0 rounded-full">
        <Link href="/groups/new" aria-label="Criar grupo">
          <Plus className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function FeaturedGroupCard({ item }: { item: GroupHomeCard }) {
  const systemStatus = getGroupSystemStatus(item);
  const standing = getStandingDisplay(item);
  const leaderLine = getLeaderLine(item, standing);
  const activityLine = getActivityLine(item);

  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/12">
      <CardContent className="space-y-comfortable p-4">
        <Link
          href={`/groups/${item.group.id}`}
          className="block rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <div className="space-y-comfortable">
            <div className="flex items-start gap-base">
              <GroupAvatar name={item.group.name} groupId={item.group.id} size="lg" />
              <div className="min-w-0 flex-1 space-y-tight">
                <h2 className="min-w-0 truncate text-lg font-semibold tracking-[-0.035em]">
                  {item.group.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatMembersCount(item.group.membersCount)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-snug">
                {systemStatus && <SystemStatusBadge status={systemStatus} />}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-snug rounded-[1.75rem] bg-white/42 p-4 ring-1 ring-border/50 backdrop-blur-xl dark:bg-white/8">
              <div className="min-w-0 space-y-tight">
                <FeaturedStanding standing={standing} />
                <RatingText standing={standing} size="featured" />
              </div>
              <div className="space-y-tight border-t border-border/50 pt-3 text-sm leading-6">
                <p className="text-foreground">{leaderLine}</p>
                {activityLine && (
                  <p className="line-clamp-1 text-muted-foreground">{activityLine}</p>
                )}
              </div>
            </div>
          </div>
        </Link>
        <Button asChild size="lg" className="h-12 w-full rounded-full font-semibold">
          <Link href={`/groups/${item.group.id}?compose=match`}>
            <Plus className="h-4 w-4" /> Registrar partida
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CompactGroupCard({ item }: { item: GroupHomeCard }) {
  const systemStatus = getGroupSystemStatus(item);
  const standing = getStandingDisplay(item);
  const leaderLine = getLeaderLine(item, standing);
  const activityLine = getActivityLine(item);

  return (
    <Link href={`/groups/${item.group.id}`} className="block">
      <Card className="br-pressable hover:bg-card/95">
        <CardContent className="space-y-base p-4">
          <div className="flex items-start gap-base">
            <GroupAvatar name={item.group.name} groupId={item.group.id} size="md" />
            <div className="min-w-0 flex-1">
              <h2 className="min-w-0 truncate text-base font-semibold tracking-[-0.025em]">
                {item.group.name}
              </h2>
              {/* mt-0.5: 2px optical nudge tucking the count under the name — not layout spacing. */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatMembersCount(item.group.membersCount)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-snug">
              {systemStatus && <SystemStatusBadge status={systemStatus} />}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="min-w-0 space-y-tight">
            <div className="flex min-w-0 items-center gap-snug">
              <p className="truncate text-lg font-semibold tracking-[-0.045em]">
                {standing.headline}
              </p>
              {standing.movement && <MovementBadge movement={standing.movement} />}
            </div>
            <RatingText standing={standing} size="compact" />
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {activityLine ? `${leaderLine} · ${activityLine}` : leaderLine}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DiscoveryGroupCard({ item }: { item: GroupHomeCard }) {
  const leaderLine = getLeaderLine(item);
  const activityLine = getActivityLine(item);

  return (
    <Link href={`/groups/${item.group.id}`} className="block">
      <Card className="br-pressable hover:bg-card/95">
        <CardContent className="space-y-base p-4">
          <div className="flex items-start gap-base">
            <GroupAvatar name={item.group.name} groupId={item.group.id} size="md" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold tracking-[-0.025em]">
                {item.group.name}
              </h2>
              {/* mt-0.5: 2px optical nudge tucking the count under the name — not layout spacing. */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatMembersCount(item.group.membersCount)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {activityLine ? `${leaderLine} · ${activityLine}` : leaderLine}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PublicSuggestionIntro() {
  return (
    <Card>
      <CardContent className="space-y-tight p-4">
        <p className="text-sm font-semibold text-foreground">Entre em uma disputa</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Escolha um grupo público e acompanhe o ranking antes de jogar.
        </p>
      </CardContent>
    </Card>
  );
}

function FeaturedStanding({ standing }: { standing: StandingDisplay }) {
  if (!standing.rank) {
    return (
      <p className="text-3xl font-semibold tracking-[-0.075em] text-foreground">
        {standing.headline}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-x-snug gap-y-tight">
      <p className="text-5xl font-semibold leading-none tracking-[-0.09em] text-foreground">
        #{standing.rank}
      </p>
      <div className="flex items-center gap-snug pb-1.5">
        <p className="text-sm font-semibold text-muted-foreground">
          {standing.rank === 1 ? 'liderando' : 'no ranking'}
        </p>
        {standing.movement && <MovementBadge movement={standing.movement} />}
      </div>
    </div>
  );
}

function RatingText({
  standing,
  size,
}: {
  standing: StandingDisplay;
  size: 'featured' | 'compact';
}) {
  if (standing.rating === null || !standing.ratingSuffix) {
    return null;
  }

  return (
    <p
      className={
        size === 'featured' ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground'
      }
    >
      <span className="font-semibold text-foreground">{Math.round(standing.rating)}</span>{' '}
      {standing.ratingSuffix}
    </p>
  );
}

function SystemStatusBadge({ status }: { status: GroupSystemStatus }) {
  const isFailed = status.kind === 'failed';
  const Icon = isFailed ? AlertTriangle : Loader2;
  const className = isFailed
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

  return (
    <span
      className={`inline-flex items-center gap-tight rounded-full px-2 py-1 text-[11px] font-medium leading-none ${className}`}
    >
      <Icon className={`h-3 w-3 ${status.kind === 'processing' ? 'animate-spin' : ''}`} />
      {status.label}
    </span>
  );
}

function MovementBadge({
  movement,
}: {
  movement: { direction: 'UP' | 'DOWN'; positions: number };
}) {
  const isUp = movement.direction === 'UP';
  const Icon = isUp ? ArrowUp : ArrowDown;
  const verb = isUp ? 'subiu' : 'caiu';
  const label = `${verb} ${movement.positions} ${movement.positions === 1 ? 'posição' : 'posições'}`;
  const className = isUp
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';

  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-tight rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${className}`}
    >
      <Icon className="h-3 w-3" /> {movement.positions}
    </span>
  );
}
