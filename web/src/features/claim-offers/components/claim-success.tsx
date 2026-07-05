import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dot, Label, Meta } from '@/components/ui/text';
import type { ClaimMembership, ClaimStubSummary } from '@/types/api';
import { PersonAvatar } from './claim-shared';
import { EmptyState } from '@/components/ui/empty-state';

type ClaimSuccessProps = {
  stub: ClaimStubSummary;
  membership: ClaimMembership;
  groupName: string;
};

export function ClaimSuccess({ stub, membership, groupName }: ClaimSuccessProps) {
  const claimedName =
    `${membership.user.firstName} ${membership.user.lastName}`.trim() || stub.displayName;

  return (
    <EmptyState
      className="min-h-[70vh] pt-10"
      tone="success"
      icon={<Check className="size-11 text-success" strokeWidth={2.8} aria-hidden />}
      title={<>Você está no {groupName}</>}
      hint="Suas partidas e seu ranking já estão na sua conta."
    >
      <div className="mt-8 flex w-full items-center gap-3.5 rounded-[1.75rem] bg-surface p-4 shadow-hairline">
        <PersonAvatar
          seed={claimedName}
          name={claimedName}
          accent
          className="size-[54px] text-stat-md"
        />
        <div className="min-w-0 flex-1 text-left">
          <Label className="block truncate text-foreground">{claimedName}</Label>
          <Meta className="mt-0.5 block text-muted-foreground">
            {stub.rank ? (
              <>
                #{stub.rank}
                <Dot />
              </>
            ) : null}
            {Math.round(stub.rating)} pts
            <Dot />
            {stub.matchesCount} partidas
          </Meta>
        </div>
      </div>

      <div className="mt-auto w-full pt-8">
        <Button asChild size="lg" className="w-full">
          <Link href={`/groups/${membership.groupId}`}>Ir para o grupo</Link>
        </Button>
      </div>
    </EmptyState>
  );
}
