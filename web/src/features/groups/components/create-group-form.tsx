'use client';

import { FormEvent } from 'react';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateGroup } from './use-create-group';

export function CreateGroupForm() {
  const {
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
  } = useCreateGroup();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-comfortable">
          <div className="flex flex-col items-center gap-comfortable">
            <GroupAvatar name={name} avatarColor={avatarColor} size="hero" />
            <ColorSwatchPicker
              value={avatarColor}
              onChange={setAvatarColor}
              className="max-w-[19rem]"
            />
          </div>

          <div className="space-y-snug">
            <Label htmlFor="name">Nome do grupo</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Beach terça 19h"
              required
            />
          </div>

          <div className="space-y-snug">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Grupo da galera que joga toda terça."
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" loading={isSubmitting} disabled={!canSubmit}>
            Criar grupo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
