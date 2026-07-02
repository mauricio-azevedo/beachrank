'use client';

import { Button } from '@/components/ui/button';
import { Label, Meta, Title } from '@/components/ui/text';
import { getGroupInitials } from '@/features/groups/helpers/group-initials.helper';

// Step 1, common to both invite kinds: the group + who invited you, then "Continuar" to
// the kind-specific screen (roster or recognition).
export function InviteWelcome({
  groupName,
  inviterName,
  onContinue,
}: {
  groupName: string;
  inviterName: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="flex min-h-[78dvh] flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <Title>
          Junte-se
          <br />
          ao grupo
        </Title>

        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-hairline">
          <div className="flex size-[2.875rem] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent-dark text-label font-extrabold text-brand-foreground shadow-[inset_0_0_0_1px_var(--border-accent)]">
            {getGroupInitials(groupName)}
          </div>
          <div className="flex min-w-0 flex-col">
            <Label className="truncate text-foreground">{groupName}</Label>
            {inviterName && (
              <Meta className="truncate text-muted-foreground">{inviterName} convidou você</Meta>
            )}
          </div>
        </div>
      </div>

      <Button size="lg" className="mt-8 w-full" onClick={onContinue}>
        Continuar
      </Button>
    </div>
  );
}
