'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BrandLockup } from '@/components/ui/brand-lockup';
import { getSafeAuthRedirectPath } from '@/features/auth/helpers/auth-redirect.helper';
import type { AuthMode, AuthNotice } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

// The full-screen auth experience: brand lockup on top, the active form (login or
// signup, toggled in place), and a "browse without login" escape hatch pinned to
// the bottom. On success the form hands off to `handleAuthenticated` — a hard
// navigation, so server components and client token reads pick up the new token.
export function AuthScreen({
  initialMode,
  redirect,
  notice,
}: {
  initialMode: AuthMode;
  redirect?: string;
  notice?: AuthNotice | null;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // An already-signed-in visitor has no business here — send them where they were
  // headed (or home). Runs client-side since the token lives in localStorage.
  useEffect(() => {
    if (getAccessToken()) {
      window.location.assign(getSafeAuthRedirectPath(redirect ?? '/'));
    }
  }, [redirect]);

  function handleAuthenticated() {
    window.location.assign(getSafeAuthRedirectPath(redirect ?? '/'));
  }

  return (
    <main className="flex min-h-[100dvh] flex-col px-6 pt-[max(env(safe-area-inset-top),5.5rem)] pb-[max(env(safe-area-inset-bottom),1.875rem)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <BrandLockup />

        <div className="mt-page">
          {mode === 'login' ? (
            <LoginForm
              notice={notice}
              onAuthenticated={handleAuthenticated}
              onSwitchToSignup={() => setMode('signup')}
            />
          ) : (
            <SignupForm
              onAuthenticated={handleAuthenticated}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        <Link
          href="/"
          className="mt-auto flex items-center justify-center gap-2 py-3 text-label text-muted-foreground transition-opacity active:opacity-60"
        >
          Navegar sem login
          <ChevronRight className="size-[0.9375rem]" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
    </main>
  );
}
