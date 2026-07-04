'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GroupActions } from '@/features/groups/components/group-actions';
import { GroupDetailTabs, type GroupTab } from '@/features/groups/components/group-detail-tabs';
import { GroupEmptyState } from '@/features/groups/components/group-empty-state';
import { GroupMembersDrawer } from '@/features/groups/components/group-members-drawer';
import { GroupSummaryCard } from '@/features/groups/components/group-summary-card';
import {
  getGroup,
  getGroupMembers,
  getGroupRanking,
  getMyGroups,
} from '@/features/groups/api/groups.api';
import { getGroupMatches } from '@/features/matches/api/matches.api';
import { getAccessToken } from '@/lib/auth';
import type { Group, GroupMember, Match, MyGroup } from '@/types/api';
import { GroupDetailLoadingState } from '@/features/groups/components/group-detail-loading-state';
import { Card, CardContent } from '@/components/ui/card';
import { Body, Label } from '@/components/ui/text';
import { MatchDrawerProvider } from '@/features/matches/match-drawer/match-drawer-context';
import { MemberProfileDrawerProvider } from '@/features/members/member-profile-drawer-context';

const groupTabs = ['ranking', 'matches'] as const;

type Props = {
  groupId: string;
  tab?: string;
  autoOpenCompose?: boolean;
};

type GroupDetailData = {
  group: Group;
  ranking: GroupMember[];
  members: GroupMember[];
  matches: Match[];
  membership: MyGroup | null;
};

export function GroupDetail({ groupId, tab, autoOpenCompose = false }: Props) {
  const router = useRouter();
  const activeTab: GroupTab = groupTabs.includes(tab as GroupTab) ? (tab as GroupTab) : 'ranking';
  const [data, setData] = useState<GroupDetailData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshKey, setRefreshKey] = useState(0);
  // Owned here (not in the tabs) so the "N partidas" identity stat can switch tabs too.
  const [selectedTab, setSelectedTab] = useState<GroupTab>(activeTab);
  const [membersOpen, setMembersOpen] = useState(false);
  const loadedGroupIdRef = useRef<string | null>(null);

  // Re-sync with the URL-derived tab when navigation changes it (render-time
  // adjustment — our own tab switches already update both together).
  const [syncedTab, setSyncedTab] = useState(activeTab);
  if (syncedTab !== activeTab) {
    setSyncedTab(activeTab);
    setSelectedTab(activeTab);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadGroupDetail() {
      // Skeleton only on the first load or when switching groups. A background refresh
      // (refreshKey bump — e.g. after adding a guest) keeps the current view mounted so
      // an open drawer stays open while the roster updates underneath it.
      const isBackgroundRefresh = loadedGroupIdRef.current === groupId;
      if (!isBackgroundRefresh) {
        setStatus('loading');
        setData(null);
      }

      try {
        const token = getAccessToken();
        const membershipPromise = token
          ? getMyGroups(token).then(
              (memberships) =>
                memberships.find((membership) => membership.groupId === groupId) ?? null,
            )
          : Promise.resolve(null);

        const [group, ranking, members, matches, membership] = await Promise.all([
          getGroup(groupId),
          getGroupRanking(groupId),
          getGroupMembers(groupId),
          getGroupMatches(groupId),
          membershipPromise,
        ]);

        if (!isCurrent) {
          return;
        }

        setData({ group, ranking, members, matches, membership });
        setStatus('ready');
        loadedGroupIdRef.current = groupId;
      } catch {
        if (!isCurrent) {
          return;
        }

        // A background refresh that fails leaves the current view intact; only the
        // initial load surfaces the error screen.
        if (!isBackgroundRefresh) {
          setStatus('error');
        }
      }
    }

    loadGroupDetail();

    return () => {
      isCurrent = false;
    };
  }, [groupId, refreshKey]);

  if (status === 'loading') {
    return <GroupDetailLoadingState />;
  }

  if (status === 'error' || !data) {
    return <GroupDetailErrorState />;
  }

  const canManageMatches = Boolean(data.membership);
  const currentMembershipId = data.membership?.id ?? null;
  // The matches list already excludes soft-deleted matches and includes the ones still
  // processing, so "no matches" here means the group really has nothing to show yet.
  const isEmpty = data.matches.length === 0;

  function changeTab(nextTab: GroupTab) {
    setSelectedTab(nextTab);
    const nextUrl =
      nextTab === 'ranking' ? `/groups/${groupId}` : `/groups/${groupId}?tab=${nextTab}`;
    router.replace(nextUrl, { scroll: false });
  }

  return (
    <MatchDrawerProvider
      groupId={data.group.id}
      groupName={data.group.name}
      members={data.members}
      ranking={data.ranking}
      currentMembershipId={currentMembershipId}
      onSaved={() => setRefreshKey((key) => key + 1)}
      autoOpenCreate={autoOpenCompose && canManageMatches}
    >
      <MemberProfileDrawerProvider
        groupId={data.group.id}
        groupName={data.group.name}
        ranking={data.ranking}
        viewerRole={data.membership?.role ?? null}
      >
        <div className="space-y-loose">
          <div className="space-y-base">
            <GroupSummaryCard
              group={data.group}
              ranking={data.ranking}
              members={data.members}
              matches={data.matches}
              membership={data.membership}
              isEmpty={isEmpty}
              onOpenMembers={() => setMembersOpen(true)}
              onOpenMatches={() => changeTab('matches')}
            />

            {isEmpty ? (
              <GroupEmptyState
                canManageMatches={canManageMatches}
                onOpenMembers={() => setMembersOpen(true)}
              />
            ) : (
              <GroupActions canManageMatches={canManageMatches} />
            )}
          </div>

          {!isEmpty && (
            <GroupDetailTabs
              groupId={data.group.id}
              activeTab={selectedTab}
              onTabChange={changeTab}
              ranking={data.ranking}
              matches={data.matches}
              canManageMatches={canManageMatches}
              currentMembershipId={currentMembershipId}
            />
          )}
        </div>

        {/* Single instance, outside the empty/non-empty branches: a background refresh
            that flips the group between them must not unmount an open drawer. */}
        <GroupMembersDrawer
          open={membersOpen}
          onOpenChange={setMembersOpen}
          groupId={data.group.id}
          groupName={data.group.name}
          viewerRole={data.membership?.role ?? null}
          members={data.members}
          ranking={data.ranking}
          onMembersChanged={() => setRefreshKey((key) => key + 1)}
        />
      </MemberProfileDrawerProvider>
    </MatchDrawerProvider>
  );
}

function GroupDetailErrorState() {
  return (
    <Card>
      <CardContent className="space-y-snug p-4">
        <Label className="block text-foreground">Não foi possível carregar o grupo</Label>
        <Body className="text-muted-foreground">
          Verifique sua conexão e tente abrir o grupo novamente.
        </Body>
      </CardContent>
    </Card>
  );
}
