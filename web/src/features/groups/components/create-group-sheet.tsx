'use client';

import { GroupAvatar } from '@/components/ui/group-avatar';
import { ColorSwatchPicker } from '@/components/ui/color-swatch-picker';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerActionHeader, DrawerContent, DrawerFooter } from '@/components/ui/drawer';
import { SheetField } from '@/components/ui/sheet-field';
import { Meta, Overline } from '@/components/ui/text';
import { useCreateGroup } from './use-create-group';

// The create-group bottom sheet: a live avatar preview, name + description, and the
// shared colour picker. Opened from the groups list and the empty state; the submit
// logic and post-create navigation live in useCreateGroup.
export function CreateGroupSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
    reset,
  } = useCreateGroup();

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  }

  async function handleCreate() {
    const created = await submit();
    if (created) {
      onOpenChange(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} dismissible={!isSubmitting}>
      <DrawerContent size="fit" aria-describedby={undefined}>
        <DrawerActionHeader
          left={{ kind: 'cancel', onClick: () => handleOpenChange(false), disabled: isSubmitting }}
          title="Criar grupo"
          titleSize="sm"
        />

        <div className="px-4 pt-1 pb-6">
          <div className="mb-loose flex justify-center">
            <GroupAvatar
              name={name}
              avatarColor={avatarColor}
              size="hero"
              className="shadow-float"
            />
          </div>

          <div className="overflow-hidden rounded-card bg-surface shadow-hairline">
            <SheetField
              id="create-group-name"
              label="Nome do grupo"
              value={name}
              onChange={setName}
              placeholder="Ex: Masculino Life"
            />
            <div className="h-px bg-border" />
            <div className="flex min-w-0 flex-col px-4 py-3">
              <Overline asChild>
                <label htmlFor="create-group-description">Descrição</label>
              </Overline>
              <textarea
                id="create-group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Sobre o grupo, regras, local de jogo…"
                className="mt-1 min-w-0 resize-none border-none bg-transparent p-0 text-field font-bold leading-snug text-foreground outline-none placeholder:font-medium placeholder:text-faint-foreground"
              />
            </div>
          </div>

          <Overline className="mt-loose mb-base block px-1.5">Cor do grupo</Overline>
          <ColorSwatchPicker value={avatarColor} onChange={setAvatarColor} />
        </div>

        <DrawerFooter className="gap-2.5 pb-8">
          {error && <Meta className="text-center text-danger">{error}</Meta>}
          <Button
            size="lg"
            className="w-full"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={handleCreate}
          >
            Criar grupo
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
