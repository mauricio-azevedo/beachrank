'use client';

import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Body, Title } from '@/components/ui/text';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';

type Props = {
  canManageMatches: boolean;
  onOpenMembers: () => void;
};

// The 0-match group: one clear next step. Players can be created inside the match
// compose, so registering the first match is the primary action; the roster button
// is the quieter companion for whoever wants to set up the group first.
export function GroupEmptyState({ canManageMatches, onOpenMembers }: Props) {
  const { openCreate } = useMatchDrawer();

  return (
    <div className="flex flex-col items-center pt-loose text-center">
      <Title>Nenhuma partida ainda</Title>
      <Body className="mt-base max-w-72 text-muted-foreground">
        Registre a primeira partida e adicione os jogadores durante o registro.
      </Body>

      {canManageMatches && (
        <div className="mt-section flex w-full items-center gap-snug">
          <Button size="lg" className="flex-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Registrar partida
          </Button>
          <Button size="icon" variant="secondary" aria-label="Jogadores" onClick={onOpenMembers}>
            <Users className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
