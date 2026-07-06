'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Body, Heading, Label } from '@/components/ui/text';
import { getAllGroups } from '@/features/groups/api/groups.api';
import type { GroupHomeCard } from '@/features/groups/types/group-home.type';
import { CreateGroupSheet } from '@/features/groups/components/create-group-sheet';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { HomeGroupCard } from './home-group-card';
import { EmptyState } from '@/components/ui/empty-state';

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
  const [createOpen, setCreateOpen] = useState(false);

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
        <GroupsEmptyState isLoggedIn={isLoggedIn} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="space-y-base">
          {list.map((card) => (
            <HomeGroupCard key={card.group.id} card={card} />
          ))}
          {!isTodos && <CreateGroupRow onClick={() => setCreateOpen(true)} />}
        </div>
      )}

      <CreateGroupSheet open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}

function CreateGroupRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[3.75rem] w-full items-center gap-comfortable rounded-card px-4 shadow-[inset_0_0_0_1.5px_var(--border-accent)] transition-transform active:scale-[0.99]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-hairline">
        <Plus className="size-[1.125rem]" strokeWidth={2.6} aria-hidden />
      </span>
      <Label className="min-w-0 flex-1 text-left text-foreground">Criar grupo</Label>
      <ChevronRight
        className="size-5 shrink-0 text-faint-foreground"
        strokeWidth={2.2}
        aria-hidden
      />
    </button>
  );
}

function GroupsEmptyState({ isLoggedIn, onCreate }: { isLoggedIn: boolean; onCreate: () => void }) {
  return (
    <EmptyState
      className="px-4 pt-2"
      icon={
        isLoggedIn ? (
          <UserPlus className="size-8 text-faint-foreground" strokeWidth={1.7} aria-hidden />
        ) : (
          <Users className="size-8 text-faint-foreground" strokeWidth={1.7} aria-hidden />
        )
      }
      title={isLoggedIn ? 'Comece seu grupo' : 'Entre pra ver seus grupos'}
      hint={
        isLoggedIn
          ? 'Crie um grupo, chame a galera e registre partidas. O ranking começa aqui.'
          : 'Faça login pra acompanhar seu ranking e registrar partidas.'
      }
    >
      <div className="mt-5 flex w-full max-w-[19rem] flex-col gap-snug">
        {isLoggedIn ? (
          <Button size="lg" onClick={onCreate}>
            <Plus aria-hidden />
            Criar grupo
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={buildAuthPath({ mode: 'login' })}>Entrar</Link>
          </Button>
        )}
      </div>
    </EmptyState>
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
