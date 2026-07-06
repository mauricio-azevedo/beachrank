'use client';

import { useState } from 'react';
import { apiErrorMessage } from '@/lib/api-error';
import { setAccessToken } from '@/lib/auth';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker';
import { Button } from '@/components/ui/button';
import { DrawerActionHeader, DrawerFooter } from '@/components/ui/drawer';
import { SheetField } from '@/components/ui/sheet-field';
import { useToast } from '@/components/ui/toast';
import { Meta } from '@/components/ui/text';
import { updateProfile, type UpdateProfileInput } from '../api/profile.api';
import type { ProfileUser } from '../types/profile-user.type';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NICKNAME = 24;

export type EditedUser = {
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string | null;
  avatarColor: string | null;
};

// Edit-profile as a view inside the settings sheet: a back chevron returns to the
// menu, and a successful save applies the change and returns to the menu too.
export function EditProfileView({
  token,
  user,
  onBack,
  onSaved,
}: {
  token: string;
  user: ProfileUser;
  onBack: () => void;
  onSaved: (user: EditedUser) => void;
}) {
  const initial = {
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname ?? '',
    email: user.email ?? '',
    // Every account has a colour; fall back to blue only defensively.
    avatarColor: user.avatarColor ?? 'blue',
  };

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [email, setEmail] = useState(initial.email);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const trimmed = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    nickname: nickname.trim(),
    email: email.trim(),
  };

  const isValid =
    trimmed.firstName.length > 0 &&
    trimmed.lastName.length > 0 &&
    EMAIL_REGEX.test(trimmed.email) &&
    trimmed.nickname.length <= MAX_NICKNAME;

  const hasChanges =
    trimmed.firstName !== initial.firstName ||
    trimmed.lastName !== initial.lastName ||
    trimmed.nickname !== initial.nickname ||
    trimmed.email !== initial.email.trim() ||
    avatarColor !== initial.avatarColor;

  async function handleSave() {
    if (!isValid || !hasChanges || isSubmitting) {
      return;
    }

    const payload: UpdateProfileInput = {};
    if (trimmed.firstName !== initial.firstName) payload.firstName = trimmed.firstName;
    if (trimmed.lastName !== initial.lastName) payload.lastName = trimmed.lastName;
    if (trimmed.nickname !== initial.nickname) payload.nickname = trimmed.nickname;
    if (trimmed.email !== initial.email.trim()) payload.email = trimmed.email;
    if (avatarColor !== initial.avatarColor) payload.avatarColor = avatarColor;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await updateProfile(token, payload);
      setAccessToken(result.accessToken);
      onSaved({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        nickname: result.user.nickname,
        email: result.user.email,
        avatarColor: result.user.avatarColor,
      });
      showToast('Perfil atualizado');
    } catch (caughtError) {
      setError(apiErrorMessage(caughtError, 'Não foi possível salvar. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200">
      <DrawerActionHeader
        left={{ kind: 'back', onClick: onBack, disabled: isSubmitting }}
        title="Editar perfil"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* avatar hero + color picker */}
        <div className="mt-tight mb-loose flex flex-col items-center">
          <MemberAvatar
            userId={user.id}
            name={`${firstName} ${lastName}`}
            avatarColor={avatarColor}
            size="2xl"
            className="shadow-float"
          />

          <ColorSwatchPicker
            value={avatarColor}
            onChange={setAvatarColor}
            className="mt-section max-w-[19rem]"
          />
        </div>

        {/* fields */}
        <div className="overflow-hidden rounded-card bg-surface shadow-hairline">
          <div className="flex items-stretch">
            <SheetField
              id="edit-first-name"
              label="Nome"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
            />
            <div className="w-px bg-border" />
            <SheetField
              id="edit-last-name"
              label="Sobrenome"
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
            />
          </div>
          <div className="h-px bg-border" />
          <SheetField
            id="edit-nickname"
            label="Apelido"
            value={nickname}
            onChange={setNickname}
            placeholder="Como te chamam"
            autoComplete="nickname"
          />
          <div className="h-px bg-border" />
          <SheetField
            id="edit-email"
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
          />
        </div>
        <Meta className="mt-snug block px-1.5 leading-relaxed text-faint-foreground">
          O apelido é como você aparece para outros jogadores nos grupos.
        </Meta>
      </div>

      <DrawerFooter className="gap-2.5 pt-2.5 pb-[30px] shadow-[0_-1px_0_var(--surface)]">
        {error && <Meta className="text-center text-danger">{error}</Meta>}
        <Button
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={!isValid || !hasChanges}
          onClick={handleSave}
        >
          Salvar
        </Button>
      </DrawerFooter>
    </div>
  );
}
