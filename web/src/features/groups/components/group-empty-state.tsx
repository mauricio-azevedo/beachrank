'use client';

import { Body, Title } from '@/components/ui/text';
import { GroupActions } from '@/features/groups/components/group-actions';

type Props = {
  canManageMatches: boolean;
  onOpenMembers: () => void;
};

// The 0-match group: one clear next step. Players can be created inside the match
// compose, so registering the first match is the primary action; the roster button
// is the quieter companion for whoever wants to set up the group first.
export function GroupEmptyState({ canManageMatches, onOpenMembers }: Props) {
  return (
    <div className="flex flex-col items-center pt-loose text-center">
      <Title>Nenhuma partida ainda</Title>
      <Body className="mt-base max-w-72 text-muted-foreground">
        {canManageMatches
          ? 'Registre a primeira partida e adicione os jogadores durante o registro.'
          : 'As partidas e o ranking do grupo vão aparecer aqui.'}
      </Body>

      <GroupActions
        canManageMatches={canManageMatches}
        onOpenMembers={onOpenMembers}
        className="mt-section w-full justify-center"
      />
    </div>
  );
}
