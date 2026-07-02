'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeaderShell } from '@/components/app-header-shell';
import { Button } from '@/components/ui/button';
import { Meta, Title } from '@/components/ui/text';
import { getMe } from '@/features/auth/api/auth.api';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia,';
  if (hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

export function HomeHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    const token = getAccessToken();
    setIsLoggedIn(Boolean(token));

    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then((user) => {
        if (isCurrent) {
          setFirstName(user.firstName);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <AppHeaderShell>
      <div className="relative mx-auto flex h-12 w-full max-w-md items-center justify-between gap-base leading-tight">
        <div className="min-w-0">
          <Meta className="block text-muted-foreground">{isLoggedIn ? greeting() : 'Olá,'}</Meta>
          {loading ? (
            // mt-0.5: 2px optical nudge aligning the skeleton line where the Title sits.
            <div className="mt-0.5 h-5 w-28 animate-pulse rounded-full bg-muted" />
          ) : (
            <Title className="truncate">{isLoggedIn ? (firstName ?? 'Você') : 'Bem-vindo'}</Title>
          )}
        </div>

        {isLoggedIn ? (
          <NotificationBell />
        ) : (
          <Button asChild size="lg">
            <Link href={buildAuthPath({ mode: 'login' })}>Entrar</Link>
          </Button>
        )}
      </div>
    </AppHeaderShell>
  );
}
