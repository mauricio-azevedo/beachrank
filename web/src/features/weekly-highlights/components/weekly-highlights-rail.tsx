'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Dot, Heading, Label, Meta } from '@/components/ui/text';
import { getWeeklyHighlights } from '@/features/weekly-highlights/api/weekly-highlights.api';
import { highlightSentence } from '@/features/weekly-highlights/helpers/highlight-copy';
import { highlightStyle } from '@/features/weekly-highlights/helpers/highlight-style';
import { hueFromId } from '@/lib/group-identity';
import type { WeeklyHighlightCard } from '@/features/weekly-highlights/types/weekly-highlight.type';
import { getAccessToken } from '@/lib/auth';

type LoadState = 'loading' | 'ready' | 'error';

export function WeeklyHighlightsRail() {
  const [state, setState] = useState<LoadState>('loading');
  const [cards, setCards] = useState<WeeklyHighlightCard[]>([]);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      setState('loading');

      try {
        const data = await getWeeklyHighlights(getAccessToken() ?? undefined);

        if (!isCurrent) {
          return;
        }

        setCards(data);
        setState('ready');
      } catch {
        if (!isCurrent) {
          return;
        }

        setState('error');
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, []);

  if (state === 'loading') {
    return <WeeklyHighlightsSkeleton />;
  }

  if (state === 'error' || cards.length === 0) {
    return null;
  }

  return (
    <section aria-label="Essa semana" className="space-y-3.5">
      <Heading className="px-0.5">Essa semana</Heading>

      {/* pt/pb dão folga pra sombra do card não ser clipada pelo overflow-x do scroll. */}
      {/* I didn't understand how paddint top and bottom would influence shadow clipping horizontally, so I removed them. */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <HighlightChip key={`${card.userId}-${card.achievement.type}`} card={card} />
        ))}
      </div>
    </section>
  );
}

function HighlightChip({ card }: { card: WeeklyHighlightCard }) {
  const sentence = highlightSentence(card.achievement.type, card.achievement.value);
  const style = highlightStyle(card.achievement.type);
  const Icon = style.icon;
  const hue = hueFromId(card.group.id);
  const isArena = card.origin === 'ARENA';

  return (
    <Link
      href={`/groups/${card.group.id}`}
      aria-label={`${card.displayName}: ${sentence}. ${card.group.name}.`}
      className="flex h-44 w-[12.75rem] shrink-0 snap-start flex-col justify-between rounded-card bg-surface p-4 shadow-card transition-[transform,background-color] active:scale-[0.98]"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <MemberAvatar
          userId={card.userId}
          name={card.displayName}
          avatarColor={card.avatarColor}
          size="sm"
        />
        <Label className="min-w-0 truncate">{card.displayName}</Label>
      </div>

      <div className="min-w-0">
        <span
          className="inline-flex max-w-full items-start gap-1.5 rounded-xl px-2.5 py-1.5"
          style={{ color: style.color, background: style.bg }}
        >
          <Icon className="mt-px size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          <Meta className="line-clamp-2 text-left" style={{ color: 'inherit' }}>
            {sentence}
          </Meta>
        </span>

        <div className="mt-2.5 flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: `oklch(65% 0.15 ${hue})` }}
          />
          <Meta className="min-w-0 truncate text-muted-foreground">
            {isArena ? (
              <>
                no Arena
                <Dot />
                {card.group.name}
              </>
            ) : (
              card.group.name
            )}
          </Meta>
        </div>
      </div>
    </Link>
  );
}

function WeeklyHighlightsSkeleton() {
  return (
    <section className="space-y-3.5" aria-label="Carregando destaques da semana" aria-busy="true">
      <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-44 w-[12.75rem] shrink-0 animate-pulse rounded-card bg-muted/80"
          />
        ))}
      </div>
    </section>
  );
}
