'use client';

import { useEffect, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getMyGroups } from '@/features/groups/api/groups.api';
import { getAccessToken } from '@/lib/auth';

/**
 * Group options trigger in the top bar's trailing slot, visible to the group's admins.
 * Inviting moved into the players sheet, so the menu is empty for the moment — the
 * trigger stays as the anchor for the group management actions that land here next
 * (edit group, leave, etc.).
 */
export function GroupOptionsMenu({ groupId }: { groupId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const token = getAccessToken();

    if (!token) {
      return;
    }

    getMyGroups(token)
      .then((groups) => {
        if (!isCurrent) {
          return;
        }

        const membership = groups.find((group) => group.groupId === groupId);
        setIsAdmin(membership?.role === 'ADMIN');
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [groupId]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Button type="button" variant="secondary" size="icon" aria-label="Opções do grupo">
      <MoreHorizontal />
    </Button>
  );
}
