'use client';

import { Button } from '@/components/ui/button';
import { Body, Meta, Title } from '@/components/ui/text';
import { DashedAvatar, GroupBrandChip } from '@/features/claim-offers/components/claim-shared';
import { nameInitial } from '@/lib/avatar';
import type { ClaimStubSummary } from '@/types/api';

// Closed invite: addressed to one guest, so it lands straight on the "is this you?"
// recognition — a one-tap identity confirmation before taking over the profile.
export function InviteClosedRecognition({
  groupName,
  inviterName,
  target,
  busy,
  error,
  onConfirm,
}: {
  groupName: string;
  inviterName: string | null;
  target: ClaimStubSummary;
  busy: boolean;
  error: string;
  onConfirm: () => void;
}) {
  const stats = buildStats(target);

  return (
    <div className="flex min-h-[78dvh] flex-col">
      <GroupBrandChip groupName={groupName} />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <DashedAvatar
          initial={nameInitial(target.displayName)}
          className="size-[6.5rem] border-brand bg-brand/15 text-stat-xl text-foreground shadow-[0_16px_40px_var(--shadow-accent)]"
        />
        <Title className="mt-6">É você, {target.displayName}?</Title>
        <Body className="mt-3 max-w-[17rem] text-muted-foreground">
          {inviterName ? `${inviterName} te adicionou` : 'Você foi adicionado'} como{' '}
          <span className="text-foreground">{target.displayName}</span>. Entre para assumir esse
          perfil e seu histórico — <span className="tabular-nums">{stats}</span>.
        </Body>
      </div>

      <div className="mt-8 flex flex-col gap-1">
        {error && <Meta className="text-center text-danger">{error}</Meta>}
        <Button size="lg" className="w-full" loading={busy} onClick={onConfirm}>
          Sim, sou eu
        </Button>
      </div>
    </div>
  );
}

// "#2 no ranking, 28 jogos" — rank (when ranked) and match count, the history at stake.
function buildStats(target: ClaimStubSummary): string {
  const parts: string[] = [];
  if (target.rank) parts.push(`#${target.rank} no ranking`);
  parts.push(`${target.matchesCount} ${target.matchesCount === 1 ? 'jogo' : 'jogos'}`);
  return parts.join(', ');
}
