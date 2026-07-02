'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Plus, UsersRound } from 'lucide-react';
import type { MyGroup } from '@/types/api';
import { getMyGroups } from '@/features/groups/api/groups.api';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getGroupInitials } from '@/features/groups/helpers/group-initials.helper';

type Props = {
  loadGroups?: () => Promise<MyGroup[]>;
  ratingLabel?: string;
};

export function MyGroupsList({ loadGroups, ratingLabel = 'rating' }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = getAccessToken();
    setToken(storedToken);

    if (!storedToken && !loadGroups) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        setError('');
        const data = loadGroups ? await loadGroups() : await getMyGroups(storedToken as string);
        setMyGroups(data);
      } catch {
        setError('Não foi possível carregar os grupos.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [loadGroups]);

  if (!token && !loadGroups) {
    return <SignedOutGroupsState />;
  }

  if (isLoading) {
    return <GroupsLoadingState />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-snug p-4">
          <p className="text-sm font-semibold text-foreground">Algo deu errado</p>
          <p className="text-sm leading-6 text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (myGroups.length === 0) {
    return loadGroups ? <EmptyPublicGroupsState /> : <EmptyGroupsState />;
  }

  return (
    <section className="space-y-base" aria-label="Grupos do perfil">
      {myGroups.map((membership) => (
        <MyGroupCard key={membership.id} membership={membership} ratingLabel={ratingLabel} />
      ))}
    </section>
  );
}

function MyGroupCard({ membership, ratingLabel }: { membership: MyGroup; ratingLabel: string }) {
  const group = membership.group;
  const memberCount = group._count?.members ?? 0;
  const matchCount = group._count?.matches ?? 0;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Card className="br-pressable bg-gradient-to-br from-card via-card to-primary/8">
        <CardContent className="space-y-comfortable p-4">
          <div className="flex items-start gap-base">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-muted text-sm font-semibold text-foreground">
              {getGroupInitials(group.name)}
            </div>

            <div className="min-w-0 flex-1 space-y-tight">
              <div className="flex min-w-0 items-center gap-snug">
                <p className="truncate text-base font-semibold tracking-[-0.025em] text-foreground">
                  {group.name}
                </p>
                {membership.role === 'ADMIN' && <RoleBadge />}
              </div>

              {group.description && (
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>

            <ChevronRight className="mt-tight h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-3 gap-snug">
            <GroupMetric label="membros" value={memberCount} />
            <GroupMetric label="partidas" value={matchCount} />
            <GroupMetric label={ratingLabel.toLowerCase()} value={Math.round(membership.rating)} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function GroupMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-[1.2rem] bg-white/42 px-3 py-2 text-center ring-1 ring-border/50 backdrop-blur-xl dark:bg-white/8">
      <p className="truncate text-lg font-semibold leading-none tracking-[-0.05em] text-foreground">
        {value}
      </p>
      <p className="mt-tight truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function RoleBadge() {
  return (
    <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold leading-none text-primary">
      Admin
    </span>
  );
}

function GroupsLoadingState() {
  return (
    <section className="space-y-base" aria-label="Carregando grupos">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="bg-gradient-to-br from-card via-card to-primary/8">
          <CardContent className="space-y-comfortable p-4">
            <div className="flex items-start gap-base">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-[1.35rem] bg-muted" />
              <div className="min-w-0 flex-1 space-y-snug">
                <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-full animate-pulse rounded-full bg-muted/70" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-snug">
              <div className="h-14 animate-pulse rounded-[1.2rem] bg-muted/80" />
              <div className="h-14 animate-pulse rounded-[1.2rem] bg-muted/70" />
              <div className="h-14 animate-pulse rounded-[1.2rem] bg-muted/60" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function SignedOutGroupsState() {
  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/8">
      <CardContent className="space-y-comfortable p-4">
        <div className="space-y-snug">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-muted text-foreground">
            <UsersRound className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Entre para ver seus grupos</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Seus grupos aparecem aqui quando você entra na sua conta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-snug">
          <Button asChild>
            <Link href={buildAuthPath({ mode: 'login' })}>Entrar</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={buildAuthPath({ mode: 'signup' })}>Criar conta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyGroupsState() {
  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/8">
      <CardContent className="space-y-comfortable p-4">
        <div className="space-y-snug">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-muted text-foreground">
            <UsersRound className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nenhum grupo ainda</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Crie um grupo ou entre por convite para começar.
          </p>
        </div>

        <Button asChild className="w-full rounded-full">
          <Link href="/groups/new">
            <Plus className="mr-snug h-4 w-4" />
            Criar grupo
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyPublicGroupsState() {
  return (
    <Card>
      <CardContent className="p-4 text-sm text-muted-foreground">Nenhum grupo ainda.</CardContent>
    </Card>
  );
}
