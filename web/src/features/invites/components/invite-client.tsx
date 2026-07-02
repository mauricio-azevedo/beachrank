'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { AcceptClaimResult, GroupInvite } from '@/types/api';
import { getAccessToken } from '@/lib/auth';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { ClaimConflict } from '@/features/claim-offers/components/claim-conflict';
import { acceptInvite, claimInviteGuest } from '@/features/invites/api/invites.api';
import { InviteWelcome } from './invite-welcome';
import { InviteOpenRoster } from './invite-open-roster';
import { InviteClosedRecognition } from './invite-closed-recognition';

type Blocked = Extract<AcceptClaimResult, { outcome: 'BLOCKED' }>;
type Screen = 'welcome' | 'roster' | 'recognition';

// Orchestrates the invite landing: welcome → (open roster | closed recognition) → the
// commit (take over a guest, or join as new). The commit needs an account, so a signed-out
// visitor is sent to the auth screen carrying where to return and what to resume; on the
// way back the `?take`/`?join` param replays the commit automatically. Outcomes: a claim
// lands in the group, a shared-match block shows the conflict screen.
export function InviteClient({ invite }: { invite: GroupInvite }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isClosed = invite.kind === 'CLOSED' && !!invite.target;
  const [screen, setScreen] = useState<Screen>('welcome');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [error, setError] = useState('');

  const groupName = invite.group?.name ?? 'grupo';
  const inviterName = resolveInviterName(invite);

  function goToGroup() {
    router.push(`/groups/${invite.groupId}`);
    router.refresh();
  }

  async function doClaim(authToken: string, guestId: string) {
    setBusy(true);
    setError('');
    try {
      const result = await claimInviteGuest(authToken, invite.token, guestId);
      if (result.outcome === 'CLAIMED') {
        goToGroup();
      } else {
        setBlocked(result);
      }
    } catch {
      setError('Não foi possível assumir agora. Tente novamente.');
      setBusy(false);
    }
  }

  async function doJoin(authToken: string) {
    setBusy(true);
    setError('');
    try {
      await acceptInvite(authToken, invite.token);
      goToGroup();
    } catch {
      setError('Não foi possível entrar no grupo. Tente novamente.');
      setBusy(false);
    }
  }

  // The commit needs an account: run it now if signed in, otherwise hand off to auth with
  // the return + resume intent and the invite context (banner + apelido).
  function startClaim(guestId: string, guestName: string) {
    const authToken = getAccessToken();
    if (authToken) {
      void doClaim(authToken, guestId);
      return;
    }
    router.push(
      buildAuthPath({
        mode: 'login',
        redirect: `/invites/${invite.token}?take=${guestId}`,
        context: `${guestName} · ${groupName}`,
        nickname: guestName,
      }),
    );
  }

  function startJoin() {
    const authToken = getAccessToken();
    if (authToken) {
      void doJoin(authToken);
      return;
    }
    router.push(
      buildAuthPath({
        mode: 'signup',
        redirect: `/invites/${invite.token}?join=1`,
        context: groupName,
      }),
    );
  }

  // Replay the pending commit once, when returning from auth already signed in.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    const authToken = getAccessToken();
    if (!authToken) return;
    const take = searchParams.get('take');
    const join = searchParams.get('join');
    if (!take && !join) return;
    resumed.current = true;
    // Defer past the effect tick so the commit's first setState isn't a synchronous
    // cascade; the pending claim/join replays exactly once, on return from auth.
    queueMicrotask(() => {
      if (take) void doClaim(authToken, take);
      else void doJoin(authToken);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (blocked) {
    return (
      <ClaimConflict
        groupId={invite.groupId}
        groupName={groupName}
        stubName={blocked.stubName}
        sharedMatches={blocked.sharedMatches}
        admins={blocked.admins}
      />
    );
  }

  // Resuming a commit after auth: hold on a spinner until it lands or blocks.
  if (busy && screen === 'welcome' && !error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  if (screen === 'recognition' && invite.target) {
    return (
      <InviteClosedRecognition
        groupName={groupName}
        inviterName={inviterName}
        target={invite.target}
        busy={busy}
        error={error}
        onConfirm={() => startClaim(invite.target!.groupMemberId, invite.target!.displayName)}
      />
    );
  }

  if (screen === 'roster') {
    return (
      <InviteOpenRoster
        groupName={groupName}
        guests={invite.guests ?? []}
        targetUnavailable={invite.targetUnavailable ?? false}
        busy={busy}
        error={error}
        onClaim={startClaim}
        onJoinNew={startJoin}
      />
    );
  }

  return (
    <InviteWelcome
      groupName={groupName}
      inviterName={inviterName}
      onContinue={() => setScreen(isClosed ? 'recognition' : 'roster')}
    />
  );
}

// The inviter's first name for "{name} convidou você" — nickname wins, else first name.
function resolveInviterName(invite: GroupInvite): string | null {
  const inviter = invite.createdBy;
  if (!inviter) return null;
  return inviter.nickname?.trim() || inviter.firstName || null;
}
