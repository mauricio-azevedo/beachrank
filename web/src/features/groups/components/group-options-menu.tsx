'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getMyGroups } from '@/features/groups/api/groups.api';
import { getAccessToken } from '@/lib/auth';

/**
 * Group actions menu in the top bar's trailing slot. Only the group's admins can
 * act on it today (invite members), so the trigger stays hidden for everyone else
 * rather than opening an empty menu.
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="icon" aria-label="Opções do grupo">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/groups/${groupId}/invite`}>
            <UserPlus />
            Convidar jogadores
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
