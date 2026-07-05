'use client';

import { Button } from '@/components/ui/button';
import { Label, Meta, Title } from '@/components/ui/text';
import { GroupAvatar } from '@/components/ui/group-avatar';

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
          <GroupAvatar name={groupName} size="md" tone="brand" />
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
