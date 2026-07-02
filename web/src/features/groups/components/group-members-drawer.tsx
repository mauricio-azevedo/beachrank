'use client';

import { useMemo, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label, Meta } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { resolveMemberName } from '@/lib/member-name';
import { memberRoleTag } from '@/lib/member-role';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';
import { StubClaimEmailPanel } from '@/features/members/components/stub-claim-email-panel';
import { MemberProfileContent } from '@/features/members/member-profile-drawer';
import type { GroupMember, GroupMemberRole } from '@/types/api';

type GroupMembersDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  viewerRole: GroupMemberRole | null;
  members: GroupMember[];
  // Live ranking — for the position line in a member's profile.
  ranking: GroupMember[];
};

export function GroupMembersDrawer({
  open,
  onOpenChange,
  groupId,
  groupName,
  viewerRole,
  members,
  ranking,
}: GroupMembersDrawerProps) {
  const isAdmin = viewerRole === 'ADMIN';

  // Members listed A–Z by display name.
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        resolveMemberName(a).fullName.localeCompare(resolveMemberName(b).fullName, 'pt-BR'),
      ),
    [members],
  );

  // Both the profile and the "Convidar" panel open as nested sheets over this list, so
  // closing them returns here. Kept mounted (target persists) so they animate out cleanly.
  const seq = useRef(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<{ memberId: string; key: number } | null>(
    null,
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{
    memberId: string;
    name: string;
    key: number;
  } | null>(null);

  function openProfile(memberId: string) {
    seq.current += 1;
    setProfileTarget({ memberId, key: seq.current });
    setProfileOpen(true);
  }

  function openInvite(memberId: string, name: string) {
    seq.current += 1;
    setInviteTarget({ memberId, name, key: seq.current });
    setInviteOpen(true);
  }

  function rankOf(memberId: string): number | undefined {
    const index = ranking.findIndex((member) => member.id === memberId);
    return index >= 0 ? index + 1 : undefined;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined} size="fit">
        <DrawerHeader className="items-center pb-3 pt-1 text-center">
          <DrawerTitle>Jogadores</DrawerTitle>
          <Meta className="text-muted-foreground">{members.length} no grupo</Meta>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 [scrollbar-width:none]">
          <div className="overflow-hidden rounded-3xl bg-surface shadow-hairline">
            {sortedMembers.map((member) => {
              const { fullName } = resolveMemberName(member);
              const isStub = member.userId === null;
              const tag = memberRoleTag(member);

              return (
                <div
                  key={member.id}
                  className="relative flex items-center gap-base border-t border-divider px-4 py-3 first:border-t-0"
                >
                  {/* Stretched hit area: the whole row opens this member's profile. */}
                  <button
                    type="button"
                    aria-label={`Ver perfil de ${fullName}`}
                    onClick={() => openProfile(member.id)}
                    className="absolute inset-0"
                  />

                  <MemberAvatar
                    userId={member.userId}
                    name={fullName}
                    avatarColor={member.user?.avatarColor ?? null}
                    size="md"
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Label className="truncate text-foreground">{fullName}</Label>
                    {member.user?.email && (
                      <Meta className="truncate text-muted-foreground">{member.user.email}</Meta>
                    )}
                  </div>

                  {isStub && isAdmin ? (
                    <button
                      type="button"
                      onClick={() => openInvite(member.id, fullName)}
                      className={cn(
                        'relative z-10 flex shrink-0 items-center gap-tight rounded-pill bg-brand px-3 py-1.5 text-brand-foreground shadow-button transition-opacity active:opacity-90',
                        TOUCH_TARGET_48,
                      )}
                    >
                      <UserPlus className="size-3.5" strokeWidth={2.4} aria-hidden />
                      <span className="text-[11px] font-extrabold uppercase tracking-wide">
                        Convidar
                      </span>
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide',
                        tag.className,
                      )}
                    >
                      {tag.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Opens over the list — closing returns here, not to the page. */}
        <DrawerNested open={profileOpen} onOpenChange={setProfileOpen}>
          <DrawerContent aria-describedby={undefined} size="fit">
            {profileTarget && (
              <MemberProfileContent
                key={profileTarget.key}
                groupId={groupId}
                groupName={groupName}
                totalMembers={ranking.length}
                viewerRole={viewerRole}
                memberId={profileTarget.memberId}
                rank={rankOf(profileTarget.memberId)}
              />
            )}
          </DrawerContent>
        </DrawerNested>

        <DrawerNested open={inviteOpen} onOpenChange={setInviteOpen}>
          <DrawerContent aria-describedby={undefined} size="fit">
            {inviteTarget && (
              <StubClaimEmailPanel
                key={inviteTarget.key}
                groupId={groupId}
                memberId={inviteTarget.memberId}
                stubName={inviteTarget.name}
                onBack={() => setInviteOpen(false)}
              />
            )}
          </DrawerContent>
        </DrawerNested>
      </DrawerContent>
    </Drawer>
  );
}
