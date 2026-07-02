'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SheetField, SheetPasswordField } from '@/components/ui/sheet-field';
import { Meta } from '@/components/ui/text';
import { register } from '@/features/auth/auth.api';
import {
  AUTH_EMAIL_REGEX,
  friendlySignupError,
  MAX_NICKNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/features/auth/auth-validation';
import { setAccessToken } from '@/lib/auth';

// The signup form: field card + primary CTA + switch-to-login link. Apelido is
// optional. Chrome-agnostic (the auth screen wraps it); on success it stores the
// token and hands off to `onAuthenticated` (a full-page navigation).
export function SignupForm({
  onAuthenticated,
  onSwitchToLogin,
}: {
  onAuthenticated: () => void;
  onSwitchToLogin: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    AUTH_EMAIL_REGEX.test(email.trim()) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    nickname.trim().length <= MAX_NICKNAME_LENGTH;

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        email: email.trim(),
        password,
      });
      setAccessToken(result.accessToken);
      onAuthenticated();
    } catch (caughtError) {
      setError(friendlySignupError(caughtError));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="overflow-hidden rounded-card bg-surface shadow-hairline">
        <div className="flex items-stretch">
          <SheetField
            id="auth-first-name"
            label="Nome"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
            disabled={isSubmitting}
          />
          <div className="w-px bg-border" />
          <SheetField
            id="auth-last-name"
            label="Sobrenome"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
            disabled={isSubmitting}
          />
        </div>
        <div className="h-px bg-border" />
        <SheetField
          id="auth-nickname"
          label="Apelido"
          value={nickname}
          onChange={setNickname}
          placeholder="Como te chamam"
          autoComplete="nickname"
          disabled={isSubmitting}
        />
        <div className="h-px bg-border" />
        <SheetField
          id="auth-signup-email"
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
          id="auth-signup-password"
          label="Senha"
          value={password}
          onChange={setPassword}
          placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
      </div>

      <Meta className="mt-snug block px-1.5 leading-relaxed text-faint-foreground">
        O apelido é como você aparece para outros jogadores nos grupos.
      </Meta>

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
          Criar conta
        </Button>
      </div>

      <button
        type="button"
        onClick={onSwitchToLogin}
        disabled={isSubmitting}
        className="mt-section text-center text-sm font-bold text-muted-foreground transition-opacity active:opacity-60 disabled:opacity-40"
      >
        Já tem conta? <span className="text-brand">Entrar</span>
      </button>

      {/* Submit on Enter; the "Criar conta" button is the primary trigger. */}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden disabled={!canSubmit} />
    </form>
  );
}
