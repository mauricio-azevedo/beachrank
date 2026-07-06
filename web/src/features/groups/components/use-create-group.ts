'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { DEFAULT_AVATAR_COLOR } from '@/lib/avatar-color';
import { createGroup } from '@/features/groups/api/groups.api';

// Shared create-group form state + submit, so the sheet and the /groups/new page
// don't each re-implement validation, the API call, and the post-create navigation.
// On success it navigates to the new group and returns true; the caller (e.g. a
// sheet) can then close itself.
export function useCreateGroup() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>(DEFAULT_AVATAR_COLOR);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !isSubmitting;

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setAvatarColor(DEFAULT_AVATAR_COLOR);
    setError('');
    setIsSubmitting(false);
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    const token = getAccessToken();

    if (!token) {
      setError('Entre na sua conta para criar um grupo.');
      return false;
    }

    if (!trimmedName) {
      setError('Informe o nome do grupo.');
      return false;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const group = await createGroup(token, {
        name: trimmedName,
        description: description.trim() || undefined,
        avatarColor,
      });

      router.push(`/groups/${group.id}`);
      router.refresh();
      return true;
    } catch {
      setError('Não foi possível criar o grupo. Tente novamente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [avatarColor, description, router, trimmedName]);

  return {
    name,
    setName,
    description,
    setDescription,
    avatarColor,
    setAvatarColor,
    error,
    isSubmitting,
    canSubmit,
    submit,
    reset,
  };
}
