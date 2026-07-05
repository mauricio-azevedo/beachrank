'use client';

import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';
import { cn } from '@/lib/utils';

type Props = {
  canManageMatches: boolean;
  onOpenMembers: () => void;
  // Layout only — the empty state centers/offsets the same row in its own context.
  className?: string;
};

// The single source of the screen's action row (register match + players sheet),
// rendered by both the active layout and the 0-match empty state.
export function GroupActions({ canManageMatches, onOpenMembers, className }: Props) {
  const { openCreate } = useMatchDrawer();

  return (
    <div className={cn('flex items-center gap-snug', className)}>
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
