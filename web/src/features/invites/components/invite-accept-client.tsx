'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GroupInvite } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getMyGroups } from '@/features/groups/api/groups.api';
import { acceptInvite } from '@/features/invites/api/invites.api';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';

type Props = {
  invite: GroupInvite;
};

export function InviteAcceptClient({ invite }: Props) {
  const router = useRouter();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    setAuthToken(token);

    if (!token) {
      setIsCheckingMembership(false);
      return;
    }

    async function checkMembership(token: string) {
      try {
        const memberships = await getMyGroups(token);
        const membership = memberships.find((item) => item.groupId === invite.groupId);

        setAlreadyMember(Boolean(membership));
      } catch {
        setAlreadyMember(false);
      } finally {
        setIsCheckingMembership(false);
      }
    }

    checkMembership(token);
  }, [invite.groupId]);

  async function handleAcceptInvite() {
    if (!authToken) {
      return;
    }

    setError('');
    setIsAccepting(true);

    try {
      const result = await acceptInvite(authToken, invite.token);
      router.push(`/groups/${result.groupId}`);
      router.refresh();
    } catch {
      setError('Não foi possível entrar no grupo. Tente novamente.');
    } finally {
      setIsAccepting(false);
    }
  }

  const group = invite.group;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Você foi convidado para entrar em</p>

            <h1 className="text-2xl font-semibold tracking-tight">{group?.name ?? 'Grupo'}</h1>

            {group?.description && (
              <p className="text-sm leading-6 text-muted-foreground">{group.description}</p>
            )}
          </div>

          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{group?._count?.members ?? 0} membros</span>
            <span>{group?._count?.matches ?? 0} partidas</span>
          </div>

          {!authToken ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Para participar do grupo, entre na sua conta ou crie uma conta nova.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button asChild>
                  <Link
                    href={buildAuthPath({ mode: 'login', redirect: `/invites/${invite.token}` })}
                  >
                    Entrar
                  </Link>
                </Button>

                <Button asChild variant="outline">
                  <Link
                    href={buildAuthPath({ mode: 'signup', redirect: `/invites/${invite.token}` })}
                  >
                    Criar conta
                  </Link>
                </Button>
              </div>
            </div>
          ) : isCheckingMembership ? (
            <Button disabled className="w-full">
              Verificando convite...
            </Button>
          ) : alreadyMember ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Você já faz parte deste grupo.
              </p>

              <Button asChild className="w-full">
                <Link href={`/groups/${invite.groupId}`}>Ir para o grupo</Link>
              </Button>
            </div>
          ) : (
            <Button onClick={handleAcceptInvite} loading={isAccepting} className="w-full">
              Entrar no grupo
            </Button>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
