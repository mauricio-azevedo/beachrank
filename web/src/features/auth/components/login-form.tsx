'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SheetField, SheetPasswordField } from '@/components/ui/sheet-field';
import { Meta } from '@/components/ui/text';
import { login } from '@/features/auth/auth.api';
import { AUTH_EMAIL_REGEX, LOGIN_ERROR } from '@/features/auth/auth-validation';
import { NOTICE_COPY, type AuthNotice } from '@/features/auth/auth-navigation';
import { setAccessToken } from '@/lib/auth';

// The login form: field card + primary CTA + switch-to-signup link. Chrome-
// agnostic — the auth screen supplies the brand lockup and guest link around it.
// On success it stores the token and hands off to `onAuthenticated` (a full-page
// navigation), so there's no state to reset.
export function LoginForm({
  notice,
  onAuthenticated,
  onSwitchToSignup,
}: {
  notice?: AuthNotice | null;
  onAuthenticated: () => void;
  onSwitchToSignup: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = AUTH_EMAIL_REGEX.test(email.trim()) && password.length > 0;

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login({ email: email.trim(), password });
      setAccessToken(result.accessToken);
      onAuthenticated();
    } catch {
      setError(LOGIN_ERROR);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {notice && (
        <Meta className="mb-base text-center text-muted-foreground">{NOTICE_COPY[notice]}</Meta>
      )}

      <div className="overflow-hidden rounded-card bg-surface shadow-hairline">
        <SheetField
          id="auth-email"
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          disabled={isSubmitting}
        />
        <div className="h-px bg-border" />
        <SheetPasswordField
          id="auth-password"
          label="Senha"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-section flex flex-col gap-snug">
        {error && <Meta className="text-center text-danger">{error}</Meta>}
        <Button
          type="button"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={!canSubmit}
          onClick={() => handleSubmit()}
        >
          Entrar
        </Button>
      </div>

      <button
        type="button"
        onClick={onSwitchToSignup}
        disabled={isSubmitting}
        className="mt-section text-center text-sm font-bold text-muted-foreground transition-opacity active:opacity-60 disabled:opacity-40"
      >
        Não tem conta? <span className="text-brand">Criar conta</span>
      </button>

      {/* Submit on Enter; the "Entrar" button is the primary trigger. */}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden disabled={!canSubmit} />
    </form>
  );
}
