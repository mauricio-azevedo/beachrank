'use client';

import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Plus, Search, UserPlus, X } from 'lucide-react';
import {
  Drawer,
  DrawerActionHeader,
  DrawerContent,
  DrawerFooter,
  DrawerNested,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label, Meta, Overline } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/auth';
import { resolveMemberName } from '@/lib/member-name';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MemberAvatarStack } from '@/components/ui/member-avatar-stack';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';
import { createGuestMember } from '@/features/groups/api/groups.api';
import { MemberProfileContent } from '@/features/members/member-profile-drawer';
import type { GroupMember, GroupMemberRole } from '@/types/api';

type GroupMembersDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  viewerRole: GroupMemberRole | null;
  members: GroupMember[];
  // Live ranking — for the position line in a member's profile.
  ranking: GroupMember[];
  // Reloads the roster after a guest is added (bumps the group-detail refresh key).
  onMembersChanged: () => void;
};

// "Jogadores" is the umbrella; inside, people split by role: admins, members with
// an account, and guests (stubs, userId null). Each bucket is sorted A–Z.
function categorize(members: GroupMember[]) {
  const admins: GroupMember[] = [];
  const membros: GroupMember[] = [];
  const convidados: GroupMember[] = [];

  for (const member of members) {
    if (member.userId === null) {
      convidados.push(member);
    } else if (member.role === 'ADMIN') {
      admins.push(member);
    } else {
      membros.push(member);
    }
  }

  const byName = (a: GroupMember, b: GroupMember) =>
    resolveMemberName(a).fullName.localeCompare(resolveMemberName(b).fullName, 'pt-BR');

  admins.sort(byName);
  membros.sort(byName);
  convidados.sort(byName);

  return { admins, membros, convidados };
}

export function GroupMembersDrawer({
  open,
  onOpenChange,
  groupId,
  groupName,
  viewerRole,
  members,
  ranking,
  onMembersChanged,
}: GroupMembersDrawerProps) {
  const { showToast } = useToast();

  // Only active members can add guests (the backend allows any active member).
  const canAddGuests = viewerRole !== null;

  const buckets = useMemo(() => categorize(members), [members]);

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (list: GroupMember[]) =>
    q ? list.filter((m) => resolveMemberName(m).fullName.toLowerCase().includes(q)) : list;
  const vAdmins = match(buckets.admins);
  const vMembros = match(buckets.membros);
  const vConvidados = match(buckets.convidados);
  const noResults = q !== '' && vAdmins.length + vMembros.length + vConvidados.length === 0;

  // The profile opens as a nested sheet over this list, so closing it returns here.
  const seq = useRef(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<{ memberId: string; key: number } | null>(
    null,
  );

  function openProfile(memberId: string) {
    seq.current += 1;
    setProfileTarget({ memberId, key: seq.current });
    setProfileOpen(true);
  }

  function rankOf(memberId: string): number | undefined {
    const index = ranking.findIndex((member) => member.id === memberId);
    return index >= 0 ? index + 1 : undefined;
  }

  // --- Add-guest sheet (queue several names, commit them together) ---
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  function openAddSheet() {
    setName('');
    setQueue([]);
    setError('');
    setBusy(false);
    setDiscardOpen(false);
    setAddOpen(true);
  }

  function enqueue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setQueue((current) => [...current, trimmed]);
    setName('');
  }

  function dequeue(index: number) {
    setQueue((current) => current.filter((_, i) => i !== index));
  }

  function requestCancel() {
    if (queue.length > 0) {
      setDiscardOpen(true);
    } else {
      setAddOpen(false);
    }
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    setAddOpen(false);
  }

  async function commit() {
    if (queue.length === 0 || busy) return;

    const token = getAccessToken();
    if (!token) {
      setError('Sua sessão expirou. Entre novamente para adicionar convidados.');
      return;
    }

    setBusy(true);
    setError('');

    const names = queue;
    const results = await Promise.allSettled(
      names.map((guestName) => createGuestMember(token, groupId, guestName)),
    );
    const failedNames = names.filter((_, i) => results[i].status === 'rejected');
    const added = names.length - failedNames.length;

    setBusy(false);

    if (added > 0) {
      onMembersChanged();
    }

    if (failedNames.length === 0) {
      showToast(added === 1 ? '1 convidado adicionado' : `${added} convidados adicionados`);
      setAddOpen(false);
      return;
    }

    // Keep the ones that failed so they can be retried; surface a clear message.
    setQueue(failedNames);
    setError(
      added > 0
        ? `${added} adicionado${added === 1 ? '' : 's'}, mas ${failedNames.length} não. Tente de novo.`
        : 'Não foi possível adicionar. Tente novamente.',
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined} size="full">
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-1">
          <span className="w-10 shrink-0" aria-hidden />
          <div className="flex min-w-0 items-center gap-2">
            <DrawerTitle>Jogadores</DrawerTitle>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-muted-foreground shadow-hairline">
              {members.length}
            </span>
          </div>
          {canAddGuests ? (
            <Button
              size="icon-lg"
              touchTarget
              aria-label="Adicionar convidado"
              onClick={openAddSheet}
            >
              <Plus className="size-5" aria-hidden />
            </Button>
          ) : (
            <span className="w-10 shrink-0" aria-hidden />
          )}
        </div>

        <div className="shrink-0 px-4 pb-2">
          <InputGroup className="h-11">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogador"
              aria-label="Buscar jogador"
              className="[&::-webkit-search-cancel-button]:hidden"
            />
          </InputGroup>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 [scrollbar-width:none]">
          {noResults ? (
            <Meta className="block px-6 py-10 text-center text-faint-foreground">
              Nenhum jogador encontrado
            </Meta>
          ) : (
            <>
              <RosterSection label="Admins" members={vAdmins} onSelect={openProfile} />
              <RosterSection label="Membros" members={vMembros} onSelect={openProfile} />
              <RosterSection label="Convidados" members={vConvidados} onSelect={openProfile} />
            </>
          )}
        </div>

        {/* Profile opens over the list — closing returns here, not to the page. */}
        <DrawerNested open={profileOpen} onOpenChange={setProfileOpen}>
          <DrawerContent aria-describedby={undefined} size="fit">
            {profileTarget && (
              <MemberProfileContent
                key={profileTarget.key}
                groupId={groupId}
                groupName={groupName}
                totalMembers={ranking.length}
                viewerRole={viewerRole}
                memberId={profileTarget.memberId}
                rank={rankOf(profileTarget.memberId)}
              />
            )}
          </DrawerContent>
        </DrawerNested>

        {/* Add guests: a pending queue is discardable-with-confirmation, so the sheet
            can't be swiped away while names are waiting to be committed. */}
        <DrawerNested
          open={addOpen}
          onOpenChange={(next) => (next ? setAddOpen(true) : requestCancel())}
          dismissible={queue.length === 0}
        >
          {/* Minimum height so the sheet doesn't shrink when the empty state gives way
              to the first queued guest (the queue is shorter than the empty illustration). */}
          <DrawerContent aria-describedby={undefined} size="fit" className="min-h-[80dvh]">
            <DrawerActionHeader
              left={{ kind: 'cancel', onClick: requestCancel }}
              title="Adicionar convidados"
              titleSize="sm"
            />

            <div className="shrink-0 px-4 pb-3 pt-1">
              <InputGroup>
                <InputGroupInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      enqueue();
                    }
                  }}
                  maxLength={60}
                  autoFocus
                  placeholder="Nome do convidado"
                  aria-label="Nome do convidado"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="default"
                    size="icon-sm"
                    touchTarget
                    aria-label="Adicionar à lista"
                    disabled={!name.trim()}
                    onClick={enqueue}
                  >
                    <Plus />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
              {queue.length > 0 ? (
                <>
                  <SectionLabel>Adicionados · {queue.length}</SectionLabel>
                  <div className="overflow-hidden rounded-3xl bg-surface shadow-hairline">
                    {queue.map((guestName, index) => (
                      <div
                        key={`${guestName}-${index}`}
                        className="flex items-center gap-base border-t border-divider px-4 py-3 first:border-t-0"
                      >
                        <MemberAvatar userId={null} name={guestName} avatarColor={null} size="md" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <Label className="truncate text-foreground">{guestName}</Label>
                          <Meta className="text-faint-foreground">Convidado</Meta>
                        </div>
                        <button
                          type="button"
                          onClick={() => dequeue(index)}
                          aria-label={`Remover ${guestName}`}
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-faint-foreground transition-transform active:scale-90',
                            TOUCH_TARGET_48,
                          )}
                        >
                          <X className="size-4" strokeWidth={2.4} aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center px-6 pt-10 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-border-accent text-faint-foreground">
                    <UserPlus className="size-6" strokeWidth={2} aria-hidden />
                  </span>
                  <Label className="mt-comfortable text-muted-foreground">
                    Digite um nome e toque <span className="font-extrabold text-brand">+</span>
                  </Label>
                  <Meta className="mt-snug max-w-60 text-faint-foreground">
                    Pode adicionar vários de uma vez — eles entram no grupo quando você confirmar.
                  </Meta>
                </div>
              )}

              {error && <Meta className="mt-base block text-center text-destructive">{error}</Meta>}
            </div>

            <DrawerFooter className="pt-2 pb-8">
              <Button
                size="lg"
                className="w-full"
                loading={busy}
                disabled={queue.length === 0}
                onClick={commit}
              >
                {queue.length > 0 ? `Adicionar ${queue.length} ao grupo` : 'Adicionar ao grupo'}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </DrawerNested>
      </DrawerContent>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <MemberAvatarStack
            className="justify-center"
            ringClassName="ring-dialog"
            members={queue.map((guestName) => ({ userId: null, name: guestName }))}
          />

          <AlertDialogHeader>
            <AlertDialogTitle>{discardTitle(queue)}</AlertDialogTitle>
            <AlertDialogDescription>{discardMessage(queue)}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Continuar adicionando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
              Descartar {queue.length} convidado{queue.length === 1 ? '' : 's'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}

// Discard-confirmation copy names who'd be lost, so leaving isn't an accident.
function discardTitle(names: string[]): string {
  const n = names.length;
  if (n === 1) return `Descartar ${names[0]}?`;
  if (n === 2) return `Descartar ${names[0]} e ${names[1]}?`;
  return `Descartar ${n} convidados?`;
}

function discardMessage(names: string[]): string {
  const n = names.length;
  if (n === 1) return 'Ele ainda não entrou no grupo. Se você sair agora, o que digitou se perde.';
  if (n === 2)
    return 'Eles ainda não entraram no grupo. Se você sair agora, o que digitou se perde.';
  return `${names[0]}, ${names[1]} e mais ${n - 2} ainda não entraram no grupo. Se sair agora, todos serão perdidos.`;
}

function RosterSection({
  label,
  members,
  onSelect,
}: {
  label: string;
  members: GroupMember[];
  onSelect: (memberId: string) => void;
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 last:mb-0">
      <SectionLabel>
        {label} · {members.length}
      </SectionLabel>
      <div className="overflow-hidden rounded-3xl bg-surface shadow-hairline">
        {members.map((member) => (
          <RosterRow key={member.id} member={member} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function RosterRow({
  member,
  onSelect,
}: {
  member: GroupMember;
  onSelect: (memberId: string) => void;
}) {
  const { fullName } = resolveMemberName(member);

  return (
    <div className="relative flex items-center gap-base border-t border-divider px-4 py-3 first:border-t-0">
      {/* Stretched hit area: the whole row opens this player's profile. */}
      <button
        type="button"
        aria-label={`Ver perfil de ${fullName}`}
        onClick={() => onSelect(member.id)}
        className="absolute inset-0"
      />
      <MemberAvatar
        userId={member.userId}
        name={fullName}
        avatarColor={member.user?.avatarColor ?? null}
        size="md"
      />
      <Label className="min-w-0 flex-1 truncate text-foreground">{fullName}</Label>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Overline size="xs" className="px-1 pb-2 pt-1 text-faint-foreground">
      {children}
    </Overline>
  );
}
