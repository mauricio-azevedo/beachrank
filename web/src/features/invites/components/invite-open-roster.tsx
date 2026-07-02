'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Body, Label, Meta, Title } from '@/components/ui/text';
import { GroupBrandChip } from '@/features/claim-offers/components/claim-shared';
import type { InviteGuest } from '@/types/api';

// Open invite: the person self-identifies against the group's unclaimed guests (or joins
// as new). Selecting a row + "Continuar" takes over that guest; "sou novo" joins fresh.
export function InviteOpenRoster({
  groupName,
  guests,
  targetUnavailable,
  busy,
  error,
  onClaim,
  onJoinNew,
}: {
  groupName: string;
  guests: InviteGuest[];
  targetUnavailable: boolean;
  busy: boolean;
  error: string;
  onClaim: (guestId: string, guestName: string) => void;
  onJoinNew: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = guests.find((guest) => guest.groupMemberId === selectedId) ?? null;

  return (
    <div className="flex min-h-[78dvh] flex-col">
      <GroupBrandChip groupName={groupName} />

      <Title className="mt-6">
        Algum desses
        <br />é você?
      </Title>
      <Body className="mt-3 text-muted-foreground">
        Um admin pode já ter adicionado seu nome ao grupo. Toque nele para herdar seu histórico.
      </Body>

      {targetUnavailable && (
        <Meta className="mt-3 block text-faint-foreground">
          Esse perfil já foi assumido — escolha o seu ou entre como novo.
        </Meta>
      )}

      {guests.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl bg-surface shadow-hairline">
          {guests.map((guest, index) => {
            const isSelected = guest.groupMemberId === selectedId;
            return (
              <button
                key={guest.groupMemberId}
                type="button"
                onClick={() => setSelectedId(guest.groupMemberId)}
                className={cn(
                  'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors',
                  index > 0 && 'border-t border-divider',
                  isSelected && 'bg-surface-hover',
                )}
              >
                <MemberAvatar userId={null} name={guest.displayName} avatarColor={null} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Label className="truncate text-foreground">{guest.displayName}</Label>
                  <Meta className="text-faint-foreground">
                    {guest.matchesCount} {guest.matchesCount === 1 ? 'jogo' : 'jogos'}
                  </Meta>
                </div>
                {isSelected && (
                  <Check className="size-5 shrink-0 text-brand" strokeWidth={2.6} aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <Meta className="mt-5 block text-muted-foreground">
          Ninguém por aqui ainda — entre como novo.
        </Meta>
      )}

      <div className="sticky bottom-0 mt-auto flex flex-col gap-1 bg-gradient-to-t from-background from-70% to-transparent pt-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {error && <Meta className="text-center text-danger">{error}</Meta>}
        <Button
          size="lg"
          className="w-full"
          disabled={!selected}
          loading={busy}
          onClick={() => selected && onClaim(selected.groupMemberId, selected.displayName)}
        >
          Continuar
        </Button>
        <button
          type="button"
          onClick={onJoinNew}
          disabled={busy}
          className="h-12 text-center text-label font-bold text-brand transition-opacity active:opacity-60 disabled:opacity-40"
        >
          Não estou na lista — sou novo
        </button>
      </div>
    </div>
  );
}
