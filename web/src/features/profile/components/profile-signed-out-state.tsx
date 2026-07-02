'use client';

import Link from 'next/link';
import { Activity, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Body, Heading, Meta } from '@/components/ui/text';
import { buildAuthPath } from '@/features/auth/auth-navigation';

// What the user gets by signing in — the reason to tap "Entrar". It links to
// /login and, on success, lands back on the profile.
const VALUE_PROPS = [
  {
    icon: Activity,
    title: 'Registre suas partidas',
    description: 'Cada jogo entra no seu histórico.',
  },
  {
    icon: Trophy,
    title: 'Suba no ranking',
    description: 'Veja sua posição em cada grupo.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe sua evolução',
    description: 'Estatísticas individuais e de duplas.',
  },
];

export function ProfileSignedOutState() {
  return (
    <div className="flex min-h-[68vh] flex-col items-center justify-center px-2 text-center">
      <div className="flex size-[5.5rem] items-center justify-center rounded-full bg-surface shadow-hairline">
        <UserRound className="size-10 text-faint-foreground" strokeWidth={1.8} aria-hidden />
      </div>

      <Heading className="mt-section">Entre na sua conta</Heading>

      <div className="mt-loose flex w-full max-w-[19rem] flex-col gap-base text-left">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-center gap-base">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-brand/15 text-brand">
              <Icon className="size-5" strokeWidth={2.1} aria-hidden />
            </div>
            <div className="min-w-0">
              <Body className="font-bold">{title}</Body>
              <Meta className="block text-faint-foreground">{description}</Meta>
            </div>
          </div>
        ))}
      </div>

      <Button asChild size="lg" className="mt-loose w-full max-w-[19rem]">
        <Link href={buildAuthPath({ mode: 'login', redirect: '/profile' })}>Entrar</Link>
      </Button>
    </div>
  );
}
