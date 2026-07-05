'use client';

import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';

type Props = {
  canManageMatches: boolean;
  onOpenMembers: () => void;
};

export function GroupActions({ canManageMatches, onOpenMembers }: Props) {
  const { openCreate } = useMatchDrawer();

  return (
    <div className="flex items-center gap-snug">
      {canManageMatches && (
        <Button size="lg" className="flex-1" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Registrar partida
        </Button>
      )}
      <Button size="icon" variant="secondary" aria-label="Jogadores" onClick={onOpenMembers}>
        <Users className="h-4 w-4" />
      </Button>
    </div>
  );
}
