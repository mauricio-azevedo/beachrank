'use client';

import { useEffect, useRef, useState } from 'react';
import { GroupActions } from '@/features/groups/components/group-actions';
import { GroupDetailTabs } from '@/features/groups/components/group-detail-tabs';
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
type GroupTab = (typeof groupTabs)[number];

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
  const activeTab: GroupTab = groupTabs.includes(tab as GroupTab) ? (tab as GroupTab) : 'ranking';
  const [data, setData] = useState<GroupDetailData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedGroupIdRef = useRef<string | null>(null);

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
              onMembersChanged={() => setRefreshKey((key) => key + 1)}
            />

            <GroupActions groupId={data.group.id} canManageMatches={canManageMatches} />
          </div>

          <GroupDetailTabs
            groupId={data.group.id}
            activeTab={activeTab}
            ranking={data.ranking}
            matches={data.matches}
            canManageMatches={canManageMatches}
            currentMembershipId={currentMembershipId}
          />
        </div>
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
