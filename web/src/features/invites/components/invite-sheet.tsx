'use client';

import { useEffect, useState } from 'react';
import { Copy, Info, Link2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { DrawerTitle } from '@/components/ui/drawer';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Meta, Overline } from '@/components/ui/text';
import { createGroupInvite } from '@/features/invites/api/invites.api';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { getApiErrorCode } from '@/lib/api-error';
import { getAccessToken } from '@/lib/auth';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { GroupInvite } from '@/types/api';

type InviteSheetContentProps = {
  groupId: string;
  groupName: string;
  // null → the group's open invite; a guest → a closed invite addressed to them.
  guest: { id: string; name: string } | null;
};

type SheetStatus =
  | { state: 'loading' }
  | { state: 'ready'; invite: GroupInvite }
  | { state: 'error'; kind: 'claimed' | 'generic' };

// One sheet for both invite kinds: QR + copiable link, differing only in identity and
// explainer. It creates (or reuses, server-side) the invite as soon as it opens — no
// "generate" step. Admin-only entry points; the backend enforces it anyway.
export function InviteSheetContent({ groupId, groupName, guest }: InviteSheetContentProps) {
  const [status, setStatus] = useState<SheetStatus>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { copied, failed, copy } = useCopyToClipboard();

  const guestId = guest?.id ?? null;

  useEffect(() => {
    // The sheet mounts fresh per opening (view-conditional / keyed hosts), so the
    // initial `loading` state covers the fetch; retry resets it in the click handler.
    let isCurrent = true;

    const token = getAccessToken();
    const request = token
      ? createGroupInvite(token, groupId, guestId ? { targetGroupMemberId: guestId } : {})
      : Promise.reject(new Error('signed out'));

    request
      .then((invite) => {
        if (!isCurrent) return;
        setStatus({ state: 'ready', invite });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        // The only expected business rejection: the guest got claimed while this
        // entry point was still showing them as pending.
        const claimed = getApiErrorCode(error) === 'GUEST_ALREADY_CLAIMED';
        setStatus({ state: 'error', kind: claimed ? 'claimed' : 'generic' });
      });

    return () => {
      isCurrent = false;
    };
  }, [groupId, guestId, attempt]);

  const inviteUrl =
    status.state === 'ready' ? `${window.location.origin}${status.invite.path}` : '';
  const displayUrl = status.state === 'ready' ? `${window.location.host}${status.invite.path}` : '';

  return (
    <div className="px-5 pt-1 pb-10">
      {/* identity */}
      <div className="flex items-center gap-base pb-5">
        {guest ? (
          <MemberAvatar userId={null} name={guest.name} avatarColor={null} size="md" />
        ) : (
          <GroupAvatar name={groupName} groupId={groupId} size="md" tone="accent" />
        )}
        <div className="min-w-0 flex-1 text-left">
          <Overline size="xs">Convidar</Overline>
          <DrawerTitle className="truncate">{guest ? guest.name : groupName}</DrawerTitle>
        </div>
      </div>

      {/* what this link does */}
      <div className="flex items-start gap-2.5 pb-6">
        <Info className="mt-px size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Meta className="min-w-0 flex-1 text-left font-medium text-muted-foreground">
          {guest ? (
            <>
              Quando <span className="font-extrabold text-foreground">{guest.name}</span> entrar,
              assume este perfil com todo o histórico.
            </>
          ) : (
            <>
              Quem abrir entra como membro, podendo (ou não){' '}
              <span className="font-extrabold text-foreground">
                assumir um dos perfis de convidado
              </span>{' '}
              existentes.
            </>
          )}
        </Meta>
      </div>

      {status.state === 'loading' && (
        <div className="flex flex-col items-center">
          <div className="size-48 animate-pulse rounded-3xl bg-surface" />
          <div className="mt-section h-14 w-full animate-pulse rounded-2xl bg-surface" />
        </div>
      )}

      {status.state === 'error' && (
        <div className="flex flex-col items-center pt-2 pb-4 text-center">
          <Meta className="block max-w-64 text-muted-foreground">
            {status.kind === 'claimed'
              ? `${guest?.name ?? 'Esse jogador'} já tem uma conta — este perfil não precisa mais de convite.`
              : 'Não foi possível gerar o convite.'}
          </Meta>
          {status.kind === 'generic' && (
            <Button
              variant="secondary"
              className="mt-comfortable"
              onClick={() => {
                setStatus({ state: 'loading' });
                setAttempt((value) => value + 1);
              }}
            >
              Tentar de novo
            </Button>
          )}
        </div>
      )}

      {status.state === 'ready' && (
        <>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white p-3.5 shadow-float">
              <QRCodeSVG value={inviteUrl} size={164} bgColor="#ffffff" fgColor="#0b0d12" />
            </div>
          </div>

          <div className="mt-section flex items-center gap-2.5 rounded-2xl bg-surface py-2 pr-2 pl-4 shadow-hairline">
            <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Meta className="min-w-0 flex-1 truncate text-left font-bold text-muted-foreground">
              {displayUrl}
            </Meta>
            <Button size="sm" touchTarget className="shrink-0" onClick={() => copy(inviteUrl)}>
              <Copy aria-hidden />
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>

          {failed && (
            <Meta className="mt-snug block text-center text-destructive">
              Não foi possível copiar — use o QR ou compartilhe o link acima.
            </Meta>
          )}
        </>
      )}
    </div>
  );
}
