import Link from 'next/link';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Heading, Label, Meta, Stat } from '@/components/ui/text';
import { GroupAvatar } from '@/components/ui/group-avatar';
import type { ProfileSummaryGroup } from '../types/profile-summary-group.type';

export function ProfileGroupsRail({ groups }: { groups: ProfileSummaryGroup[] }) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="space-y-comfortable">
      <div className="flex items-center justify-between px-1">
        <Heading>Seus grupos</Heading>
        <Meta className="text-muted-foreground">{groups.length}</Meta>
      </div>

      {/* I removed the padding top and bottom here for the same re I did in weekly-highlights-rail.tsx. */}
      <div className="-mx-4 flex gap-base overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <GroupRailCard key={group.id} group={group} />
        ))}
      </div>
    </section>
  );
}

function GroupRailCard({ group }: { group: ProfileSummaryGroup }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="flex w-[9.875rem] shrink-0 flex-col rounded-card bg-surface p-4 shadow-card transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <GroupAvatar name={group.name} groupId={group.id} size="md" />
        <RankTrend rankDelta={group.rankDelta} />
      </div>

      <Label className="mt-comfortable truncate font-bold">{group.name}</Label>
      {group.description && (
        <Meta className="truncate text-faint-foreground">{group.description}</Meta>
      )}

      <div className="mt-comfortable flex items-baseline gap-tight">
        <Stat size="lg" className="font-extrabold">
          {group.currentRank != null ? `#${group.currentRank}` : '—'}
        </Stat>
        <Meta className="text-faint-foreground">de {group.membersCount ?? 0}</Meta>
      </div>
    </Link>
  );
}

function RankTrend({ rankDelta }: { rankDelta: number | null }) {
  if (rankDelta == null || rankDelta === 0) {
    return <Meta className="text-faint-foreground">–</Meta>;
  }

  const up = rankDelta > 0;
  const Icon = up ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-tight font-display text-meta font-extrabold tabular-nums',
        up ? 'text-success' : 'text-danger',
      )}
    >
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {Math.abs(rankDelta)}
    </span>
  );
}
