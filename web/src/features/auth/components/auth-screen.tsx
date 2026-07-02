'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLockup } from '@/components/ui/brand-lockup';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Label, Overline } from '@/components/ui/text';
import { getSafeAuthRedirectPath } from '@/features/auth/helpers/auth-redirect.helper';
import type { AuthInviteContext, AuthMode, AuthNotice } from '@/features/auth/auth-navigation';
import { getAccessToken } from '@/lib/auth';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

// The full-screen auth experience: brand lockup on top, the active form (login or
// signup, toggled in place), and a "browse without login" escape hatch pinned to the
// bottom. Reached from an invite, it swaps the escape hatch for a back button + a context
// banner, and pre-fills the signup apelido. On success it hands off to
// `handleAuthenticated` — a hard navigation, so token reads pick up the new session.
export function AuthScreen({
  initialMode,
  redirect,
  notice,
  invite,
}: {
  initialMode: AuthMode;
  redirect?: string;
  notice?: AuthNotice | null;
  invite?: AuthInviteContext | null;
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

  // Back goes to the invite itself (without the resume query), not into the app.
  const backHref = redirect ? redirect.split('?')[0] : '/';

  return (
    <main className="relative flex min-h-[100dvh] flex-col px-6 pt-[max(env(safe-area-inset-top),5.5rem)] pb-[max(env(safe-area-inset-bottom),1.875rem)]">
      {invite && (
        <Button
          asChild
          variant="secondary"
          size="icon"
          className="absolute left-5 top-[max(env(safe-area-inset-top),1rem)]"
        >
          <Link href={backHref} aria-label="Voltar">
            <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
          </Link>
        </Button>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <BrandLockup />

        {invite && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-hairline">
            <MemberAvatar
              userId={null}
              name={invite.context}
              avatarColor={null}
              size="sm"
              initials={1}
            />
            <div className="flex min-w-0 flex-col">
              <Overline size="xs" className="text-faint-foreground">
                {invite.nickname ? 'Entrando como' : 'Entrando no grupo'}
              </Overline>
              <Label className="truncate text-foreground">{invite.context}</Label>
            </div>
          </div>
        )}

        <div className="mt-page">
          {mode === 'login' ? (
            <LoginForm
              notice={notice}
              onAuthenticated={handleAuthenticated}
              onSwitchToSignup={() => setMode('signup')}
            />
          ) : (
            <SignupForm
              initialNickname={invite?.nickname}
              onAuthenticated={handleAuthenticated}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        {!invite && (
          <Link
            href="/"
            className="mt-auto flex items-center justify-center gap-2 py-3 text-label text-muted-foreground transition-opacity active:opacity-60"
          >
            Navegar sem login
            <ChevronRight className="size-[0.9375rem]" strokeWidth={2.4} aria-hidden />
          </Link>
        )}
      </div>
    </main>
  );
}
