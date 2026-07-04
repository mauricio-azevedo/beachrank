'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';

type Props = {
  canManageMatches: boolean;
};

export function GroupActions({ canManageMatches }: Props) {
  const { openCreate } = useMatchDrawer();

  if (!canManageMatches) {
    return null;
  }

  return (
    <Button size="lg" className="w-full" onClick={openCreate}>
      <Plus className="h-4 w-4" />
      Registrar partida
    </Button>
  );
}
