'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DrawerActionHeader, DrawerFooter } from '@/components/ui/drawer';
import { SheetPasswordField } from '@/components/ui/sheet-field';
import { useToast } from '@/components/ui/toast';
import { Meta } from '@/components/ui/text';
import { apiRequest } from '@/lib/api-client';
import { apiErrorMessage, getApiErrorCode, getApiErrorStatus } from '@/lib/api-error';
import { setAccessToken } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_BYTES = 72;

// Change-password as a view inside the settings sheet: a back chevron returns to
// the menu; a successful change clears the fields and confirms with a toast.
export function PasswordView({ token, onBack }: { token: string; onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // A wrong current password is shown on the field itself (per design); other
  // failures fall back to a general message under the form.
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const validation = useMemo(
    () => validatePasswordForm(currentPassword, newPassword, confirmPassword),
    [currentPassword, newPassword, confirmPassword],
  );

  const canSubmit =
    Boolean(currentPassword) &&
    Boolean(newPassword) &&
    Boolean(confirmPassword) &&
    !validation.blockingMessage &&
    !isSubmitting;

  function handleFieldChange(setValue: (value: string) => void, value: string) {
    setError('');
    setCurrentPasswordError('');
    setValue(value);
  }

  async function handleSave(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;

    setError('');
    setCurrentPasswordError('');

    if (validation.blockingMessage) {
      setError(validation.blockingMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiRequest<{ accessToken?: string }>('/me/password', {
        method: 'PATCH',
        token,
        body: { currentPassword, newPassword },
      });

      if (result?.accessToken) {
        setAccessToken(result.accessToken);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Senha alterada');
    } catch (caughtError) {
      if (getApiErrorCode(caughtError) === 'INVALID_CURRENT_PASSWORD') {
        setCurrentPasswordError('Senha atual incorreta. Tente novamente.');
      } else {
        setError(getFriendlyPasswordError(caughtError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200">
      <DrawerActionHeader
        left={{ kind: 'back', onClick: onBack, disabled: isSubmitting }}
        title="Alterar senha"
      />

      <form
        onSubmit={handleSave}
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="overflow-hidden rounded-card bg-surface shadow-hairline">
          <SheetPasswordField
            id="settings-current-password"
            label="Senha atual"
            value={currentPassword}
            onChange={(value) => handleFieldChange(setCurrentPassword, value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting}
            error={currentPasswordError}
          />
          <div className="h-px bg-border" />
          <SheetPasswordField
            id="settings-new-password"
            label="Nova senha"
            value={newPassword}
            onChange={(value) => handleFieldChange(setNewPassword, value)}
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <div className="h-px bg-border" />
          <SheetPasswordField
            id="settings-confirm-password"
            label="Confirmar nova senha"
            value={confirmPassword}
            onChange={(value) => handleFieldChange(setConfirmPassword, value)}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit on Enter; the footer "Salvar" is the primary trigger. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden disabled={!canSubmit} />
      </form>

      <DrawerFooter className="gap-2.5 pt-2.5 pb-[30px] shadow-[0_-1px_0_var(--surface)]">
        {error && <Meta className="text-center text-danger">{error}</Meta>}
        <Button
          type="button"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={!canSubmit}
          onClick={() => handleSave()}
        >
          Salvar
        </Button>
      </DrawerFooter>
    </div>
  );
}

function validatePasswordForm(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  const hasMinimumLength = newPassword.length >= MIN_PASSWORD_LENGTH;
  const isWithinByteLimit = getUtf8ByteLength(newPassword) <= MAX_PASSWORD_BYTES;
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;

  let blockingMessage = '';

  if (!currentPassword) {
    blockingMessage = 'Informe sua senha atual.';
  } else if (!newPassword) {
    blockingMessage = 'Informe a nova senha.';
  } else if (!hasMinimumLength) {
    blockingMessage = `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (!isWithinByteLimit) {
    blockingMessage = 'A nova senha está longa demais.';
  } else if (!confirmPassword) {
    blockingMessage = 'Confirme a nova senha.';
  } else if (!passwordsMatch) {
    blockingMessage = 'A confirmação precisa ser igual à nova senha.';
  }

  return { hasMinimumLength, isWithinByteLimit, passwordsMatch, blockingMessage };
}

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function getFriendlyPasswordError(caughtError: unknown) {
  // A coded 401 (wrong current password) is handled field-level by the caller; any
  // other 401 here is the guard rejecting the token — session copy.
  const fallback =
    getApiErrorStatus(caughtError) === 401
      ? 'Sua sessão expirou. Entre novamente para continuar.'
      : 'Não foi possível alterar sua senha agora.';

  return apiErrorMessage(caughtError, fallback, {
    PASSWORD_SAME_AS_CURRENT: 'A nova senha precisa ser diferente da senha atual.',
    PASSWORD_TOO_SHORT: 'A nova senha precisa ter pelo menos 6 caracteres.',
    PASSWORD_TOO_LONG: 'A nova senha está longa demais.',
  });
}
