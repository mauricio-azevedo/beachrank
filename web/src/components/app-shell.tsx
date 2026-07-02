'use client';

import { Suspense, type ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppTopBar, type AppTopBarBack } from '@/components/app-top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { buildAuthPath } from '@/features/auth/auth-navigation';
import { getMyGroups } from '@/features/groups/api/groups.api';
import { getAccessToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { getRoutePolicy } from '@/lib/route-policy';
import { NavigationTracker } from '@/providers/navigation-tracker';

export type AppShellChrome = {
  title?: string;
  back?: AppTopBarBack;
  trailing?: ReactNode;
  topBar?: boolean;
  bottomNav?: boolean;
  trackNavigation?: boolean;
  // Header fixo customizado que substitui a top bar de título (mesma posição/altura).
  header?: ReactNode;
};

type AppShellProps = {
  children: ReactNode;
  chrome?: AppShellChrome;
};

type AccessState = 'checking' | 'allowed' | 'redirecting';

export function AppShell({ children, chrome }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentPathname = pathname ?? '/';
  const routePolicy = useMemo(() => getRoutePolicy(currentPathname), [currentPathname]);
  const routeAccess = routePolicy.access;
  const [accessState, setAccessState] = useState<AccessState>(
    routeAccess.requiresCheck ? 'checking' : 'allowed',
  );

  useEffect(() => {
    let isCurrent = true;

    async function checkAccess() {
      if (!routeAccess.requiresCheck) {
        setAccessState('allowed');
        return;
      }

      setAccessState('checking');

      const token = getAccessToken();

      if (!token) {
        // No token on a gated route: send them to the login screen, remembering
        // where they meant to go so success lands them back there.
        setAccessState('redirecting');
        router.replace(buildAuthPath({ redirect: getCurrentPathWithSearch() }));
        return;
      }

      if (!routeAccess.groupId) {
        setAccessState('allowed');
        return;
      }

      try {
        const memberships = await getMyGroups(token);

        if (!isCurrent) {
          return;
        }

        const membership = memberships.find((item) => item.groupId === routeAccess.groupId);

        if (!membership) {
          setAccessState('redirecting');
          router.replace(`/groups/${routeAccess.groupId}`);
          return;
        }

        if (routeAccess.requiredRole === 'ADMIN' && membership.role !== 'ADMIN') {
          setAccessState('redirecting');
          router.replace(`/groups/${routeAccess.groupId}`);
          return;
        }

        setAccessState('allowed');
      } catch {
        if (!isCurrent) {
          return;
        }

        setAccessState('redirecting');
        router.replace('/');
      }
    }

    checkAccess();

    return () => {
      isCurrent = false;
    };
  }, [routeAccess, router]);

  const shouldHoldContent = routeAccess.requiresCheck && accessState !== 'allowed';
  const customHeader = chrome?.header;
  const showTopBar = !customHeader && (chrome?.topBar ?? routePolicy.chrome.topBar);
  const showBottomNav = chrome?.bottomNav ?? routePolicy.chrome.bottomNav;
  const shouldTrackNavigation =
    !shouldHoldContent &&
    (chrome?.trackNavigation ?? routePolicy.chrome.trackNavigation) &&
    chrome?.back?.behavior !== 'fallback';
  const contentTopPadding =
    showTopBar || customHeader
      ? 'pt-[calc(4.75rem+env(safe-area-inset-top))]'
      : 'pt-[calc(1.5rem+env(safe-area-inset-top))]';
  // Folga acima do dock flutuante: ele fica a max(1.25rem,safe) do fundo + 4.5rem de
  // altura; o max() espelha o piso do dock pra a folga ser constante (2rem) em qualquer
  // device — antes usava +safe e no browser (safe=0) o último card colava no dock.
  const contentBottomPadding = showBottomNav
    ? 'pb-[calc(6.5rem+max(1.25rem,env(safe-area-inset-bottom)))]'
    : 'pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

  return (
    <main className="relative h-[100dvh] min-h-[100dvh] overflow-hidden text-foreground">
      <div
        className={cn(
          'absolute inset-0 z-10 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]',
          contentTopPadding,
          contentBottomPadding,
        )}
      >
        <div className="mx-auto w-full max-w-md space-y-6">
          {shouldHoldContent ? <AccessGuardSkeleton /> : children}
        </div>
      </div>

      {showTopBar && (
        <AppTopBar title={chrome?.title} back={chrome?.back} trailing={chrome?.trailing} />
      )}
      {customHeader}
      {showBottomNav && <BottomNav />}
      <Suspense fallback={null}>
        <NavigationTracker enabled={shouldTrackNavigation} />
      </Suspense>
    </main>
  );
}

function AccessGuardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-4 rounded-[2rem] bg-card p-4"
    >
      <span className="sr-only">Carregando página</span>
      <div className="h-28 animate-pulse rounded-[1.5rem] bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function getCurrentPathWithSearch() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}`;
}
