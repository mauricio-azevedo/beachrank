'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Body, Heading, Label, Title } from '@/components/ui/text';
import { getAllGroups } from '@/features/groups/api/groups.api';
import type { GroupHomeCard } from '@/features/groups/types/group-home.type';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { HomeGroupCard } from './home-group-card';

type Filter = 'Meus' | 'Todos' | 'Movimentados' | 'Novos';

// Meus/Todos funcionam sobre a lista da home; Movimentados/Novos são placeholders
// (precisam de um endpoint de browse/sort de grupos — follow-up).
const FILTERS: { key: Filter; enabled: boolean }[] = [
  { key: 'Meus', enabled: true },
  { key: 'Todos', enabled: true },
  { key: 'Movimentados', enabled: false },
  { key: 'Novos', enabled: false },
];

type Status = 'loading' | 'ready' | 'error';

export function GroupsSection({
  status,
  cards,
  isLoggedIn,
}: {
  status: Status;
  cards: GroupHomeCard[];
  isLoggedIn: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('Meus');
  const [allGroups, setAllGroups] = useState<GroupHomeCard[] | null>(null);
  const [allStatus, setAllStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // Busca os grupos uma vez quando "Todos" é aberto. allStatus fica FORA das deps:
  // se estivesse, o setAllStatus('loading') aqui re-rodaria o effect e o cleanup
  // zeraria isCurrent do fetch em voo, travando no skeleton.
  useEffect(() => {
    if (filter !== 'Todos' || allGroups !== null) {
      return;
    }

    let isCurrent = true;
    setAllStatus('loading');

    getAllGroups(getAccessToken() ?? undefined)
      .then((data) => {
        if (!isCurrent) return;
        setAllGroups(data);
        setAllStatus('idle');
      })
      .catch(() => {
        if (isCurrent) setAllStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [filter, allGroups]);

  const memberCards = cards.filter((card) => card.relationship === 'MEMBER');
  const isTodos = filter === 'Todos';
  const list = isTodos ? (allGroups ?? []) : memberCards;
  const sectionStatus: Status = isTodos
    ? allStatus === 'error'
      ? 'error'
      : allGroups === null
        ? 'loading'
        : 'ready'
    : status;
  const showEmpty = !isTodos && memberCards.length === 0;

  return (
    <section className="space-y-comfortable" aria-label="Grupos">
      <Heading className="px-1">Grupos</Heading>

      <div className="-mx-4 flex gap-snug overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ key, enabled }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!enabled}
              aria-pressed={active}
              onClick={() => enabled && setFilter(key)}
              className={cn(
                'flex h-11 shrink-0 items-center rounded-pill px-4 shadow-hairline transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground',
                !enabled && 'opacity-40',
              )}
            >
              <Label>{key}</Label>
            </button>
          );
        })}
      </div>

      {sectionStatus === 'loading' ? (
        <GroupsSkeleton />
      ) : sectionStatus === 'error' ? (
        <GroupsError />
      ) : showEmpty || list.length === 0 ? (
        <GroupsEmptyState isLoggedIn={isLoggedIn} />
      ) : (
        <div className="space-y-base">
          {list.map((card) => (
            <HomeGroupCard key={card.group.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupsEmptyState({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex flex-col items-center px-4 pt-2 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-surface shadow-hairline">
        {isLoggedIn ? (
          <UserPlus className="size-8 text-faint-foreground" strokeWidth={1.7} aria-hidden />
        ) : (
          <Users className="size-8 text-faint-foreground" strokeWidth={1.7} aria-hidden />
        )}
      </div>
      <Title className="mt-5">
        {isLoggedIn ? 'Nenhum grupo ainda' : 'Entre pra ver seus grupos'}
      </Title>
      <Body className="mt-snug max-w-[18rem] text-muted-foreground">
        {isLoggedIn
          ? 'Entre num grupo pra registrar partidas e acompanhar seu ranking.'
          : 'Faça login pra acompanhar seu ranking e registrar partidas.'}
      </Body>
      <div className="mt-5 flex w-full max-w-[19rem] flex-col gap-snug">
        {isLoggedIn ? (
          <Button asChild size="lg">
            <Link href="/groups">
              <Plus aria-hidden />
              Entrar ou criar grupo
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={buildAuthPath({ mode: 'login' })}>Entrar</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div className="space-y-base" role="status" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-[5.25rem] animate-pulse rounded-card bg-muted/80" />
      ))}
    </div>
  );
}

function GroupsError() {
  return (
    <Card>
      <CardContent className="space-y-snug p-4">
        <Label className="block text-foreground">Não foi possível carregar os grupos</Label>
        <Body className="text-muted-foreground">Verifique sua conexão e tente novamente.</Body>
      </CardContent>
    </Card>
  );
}
