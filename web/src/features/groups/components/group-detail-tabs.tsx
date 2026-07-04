'use client';

import { type ReactNode, useMemo } from 'react';
import type { GroupMember, Match } from '@/types/api';
import { Label } from '@/components/ui/text';
import { MatchesList } from '@/features/matches/components/matches-list';
import { RankingList } from '@/features/groups/components/ranking-list';
import { cn } from '@/lib/utils';

export type GroupTab = 'ranking' | 'matches';

type Props = {
  groupId: string;
  activeTab: GroupTab;
  // Fully controlled: the parent owns the tab state (the "N partidas" stat in the
  // identity header switches tabs too) and syncs the URL in one place.
  onTabChange: (tab: GroupTab) => void;
  ranking: GroupMember[];
  matches: Match[];
  canManageMatches: boolean;
  currentMembershipId: string | null;
};

export function GroupDetailTabs({
  groupId,
  activeTab,
  onTabChange,
  ranking,
  matches,
  canManageMatches,
  currentMembershipId,
}: Props) {
  const tabs = useMemo(
    () => [
      { value: 'ranking' as const, label: 'Ranking' },
      { value: 'matches' as const, label: 'Partidas' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-7 border-b border-divider">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              aria-pressed={isSelected}
              className={cn(
                '-mb-px flex h-12 items-center gap-tight border-b-2 whitespace-nowrap transition-colors',
                isSelected
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-faint-foreground hover:text-foreground',
              )}
            >
              <Label>{tab.label}</Label>
            </button>
          );
        })}
      </div>

      {activeTab === 'ranking' && (
        <TabPanel>
          <RankingList ranking={ranking} currentMembershipId={currentMembershipId} />
        </TabPanel>
      )}

      {activeTab === 'matches' && (
        <TabPanel>
          <MatchesTab matches={matches} groupId={groupId} canManage={canManageMatches} />
        </TabPanel>
      )}
    </div>
  );
}

function TabPanel({ children }: { children: ReactNode }) {
  return <div className="outline-none">{children}</div>;
}

function MatchesTab({
  matches,
  groupId,
  canManage,
}: {
  matches: Match[];
  groupId: string;
  canManage: boolean;
}) {
  return (
    <MatchesList
      matches={matches}
      groupId={groupId}
      canManage={canManage}
      emptyTitle="Nenhuma partida registrada"
      emptyDescription="Registre a primeira partida para começar a movimentar o ranking."
    />
  );
}
