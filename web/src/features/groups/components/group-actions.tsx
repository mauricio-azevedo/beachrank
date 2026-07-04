'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupMembersDrawer } from '@/features/groups/components/group-members-drawer';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';
import type { Group, GroupMember, GroupMemberRole } from '@/types/api';

type Props = {
  group: Group;
  members: GroupMember[];
  ranking: GroupMember[];
  viewerRole: GroupMemberRole | null;
  canManageMatches: boolean;
  onMembersChanged: () => void;
};

export function GroupActions({
  group,
  members,
  ranking,
  viewerRole,
  canManageMatches,
  onMembersChanged,
}: Props) {
  const { openCreate } = useMatchDrawer();
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-snug">
        {canManageMatches && (
          <Button size="lg" className="flex-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Registrar partida
          </Button>
        )}
        <Button
          size="icon"
          variant="secondary"
          aria-label="Jogadores"
          onClick={() => setMembersOpen(true)}
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>

      <GroupMembersDrawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        groupId={group.id}
        groupName={group.name}
        viewerRole={viewerRole}
        members={members}
        ranking={ranking}
        onMembersChanged={onMembersChanged}
      />
    </>
  );
}
