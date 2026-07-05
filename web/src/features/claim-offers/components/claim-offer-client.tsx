'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Body, Meta, Title } from '@/components/ui/text';
import { apiErrorMessage } from '@/lib/api-error';
import { nameInitial } from '@/lib/avatar';
import { getAccessToken } from '@/lib/auth';
import type { ClaimAdmin, ClaimMembership, ClaimOfferDetail, SharedMatch } from '@/types/api';
import {
  confirmClaimOffer,
  declineClaimOffer,
  getClaimOffer,
} from '@/features/claim-offers/api/claim-offers.api';
import { DashedAvatar, GroupBrandChip, RecentMatches, StatTrio } from './claim-shared';
import { ClaimSuccess } from './claim-success';
import { ClaimConflict } from './claim-conflict';

type Props = { stubId: string };

type Status = 'loading' | 'ready' | 'error';
type Blocked = { stubName: string; sharedMatches: SharedMatch[]; admins: ClaimAdmin[] };

// The confirm screen for an email-anchored claim offer: the person an admin pointed at
// a stub sees its history and confirms ("Sou eu") or declines ("Não sou eu").
export function ClaimOfferClient({ stubId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [offer, setOffer] = useState<ClaimOfferDetail | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'decline' | null>(null);
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState<ClaimMembership | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        if (isCurrent) setStatus('error');
        return;
      }
      try {
        const data = await getClaimOffer(token, stubId);
        if (!isCurrent) return;
        setOffer(data);
        setStatus('ready');
      } catch {
        if (isCurrent) setStatus('error');
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, [stubId]);

  async function handleConfirm() {
    const token = getAccessToken();
    if (!token) return;
    setError('');
    setBusy('confirm');
    try {
      const result = await confirmClaimOffer(token, stubId);
      if (result.outcome === 'CLAIMED') {
        setClaimed(result.membership);
      } else {
        setBlocked({
          stubName: result.stubName,
          sharedMatches: result.sharedMatches,
          admins: result.admins,
        });
      }
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Não foi possível assumir agora. Tente novamente.'));
      setBusy(null);
    }
  }

  async function handleDecline() {
    const token = getAccessToken();
    if (!token) return;
    setError('');
    setBusy('decline');
    try {
      await declineClaimOffer(token, stubId);
      setDeclined(true);
    } catch {
      setError('Não foi possível agora. Tente novamente.');
      setBusy(null);
    }
  }

  if (claimed && offer) {
    return <ClaimSuccess stub={offer.stub} membership={claimed} groupName={offer.groupName} />;
  }

  if (blocked && offer) {
    return (
      <ClaimConflict
        groupId={offer.groupId}
        groupName={offer.groupName}
        stubName={blocked.stubName}
        sharedMatches={blocked.sharedMatches}
        admins={blocked.admins}
      />
    );
  }

  if (declined) {
    return (
      <EmptyState
        className="min-h-[70vh] pt-12"
        icon={<Check className="size-10 text-muted-foreground" strokeWidth={2.2} aria-hidden />}
        title="Tudo certo"
        hint="Avisamos o admin do grupo que esse perfil não é você."
      >
        <div className="mt-auto w-full pt-8">
          <Button size="lg" variant="secondary" className="w-full" onClick={() => router.push('/')}>
            Voltar
          </Button>
        </div>
      </EmptyState>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-faint-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (status === 'error' || !offer) {
    return (
      <Body className="py-16 text-center text-muted-foreground">
        Esse convite não está mais disponível.
      </Body>
    );
  }

  const { stub, groupName } = offer;

  return (
    <div className="flex flex-col gap-7 py-2">
      <GroupBrandChip groupName={groupName} />

      <div className="flex flex-col items-center gap-4 text-center">
        <DashedAvatar
          initial={nameInitial(stub.displayName)}
          className="size-[88px] text-stat-xl"
        />
        <div className="space-y-2">
          <Title className="text-balance text-foreground">Entre no {groupName}</Title>
          <Body className="mx-auto max-w-[18rem] text-muted-foreground">
            E já criaram partidas com você aqui — ao entrar, elas vão pra sua conta.
          </Body>
        </div>
      </div>

      <StatTrio rank={stub.rank} rating={stub.rating} matchesCount={stub.matchesCount} />

      <RecentMatches matches={stub.recentMatches} />

      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          loading={busy === 'confirm'}
          disabled={busy !== null}
          onClick={handleConfirm}
        >
          Entrar no grupo
        </Button>
        {error && <Meta className="block px-2 text-center text-tag-warn">{error}</Meta>}
        <Button
          variant="ghost"
          size="lg"
          className="w-full text-muted-foreground"
          loading={busy === 'decline'}
          disabled={busy !== null}
          onClick={handleDecline}
        >
          Não sou eu
        </Button>
      </div>
    </div>
  );
}
