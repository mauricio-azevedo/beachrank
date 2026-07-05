'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Send, UserPlus, Users, X } from 'lucide-react';
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
import { Heading, Label, Meta, Overline } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/auth';
import { resolveMemberName } from '@/lib/member-name';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MemberAvatarStack } from '@/components/ui/member-avatar-stack';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';
import { createGuestMember } from '@/features/groups/api/groups.api';
import { InviteSheetContent } from '@/features/invites/components/invite-sheet';
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

  // The lone-member view: a roster listing only yourself teaches nothing, so it gives
  // way to a nudge to add people. Visitors browsing a one-person group still see the
  // real list — "só você" would be a lie for them.
  const soloViewer = viewerRole !== null && members.length <= 1;

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

  // --- "Adicionar jogadores" sheet: one nested drawer, three views ---
  // chooser (admin picks manual × invite) | add (guest-name queue) | invite (link + QR).
  // A single nested sheet swapping views, because handing off between sibling nested
  // drawers mid-animation is unproven in vaul — the match drawer set this precedent.
  // Open state and view are separate on purpose: the view is kept after close so the
  // sheet still has content (and its min-height) to render during the slide-down
  // animation; openManage replaces it on the next open.
  const [manageOpen, setManageOpen] = useState(false);
  const [manageView, setManageView] = useState<ManageView | null>(null);
  const [name, setName] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  const isViewerAdmin = viewerRole === 'ADMIN';

  function openManage(view: ManageView) {
    if (view.kind === 'add') {
      setName('');
      setQueue([]);
      setError('');
      setBusy(false);
      setDiscardOpen(false);
    }
    setManageView(view);
    setManageOpen(true);
  }

  function openInviteFor(member: GroupMember) {
    openManage({
      kind: 'invite',
      guest: { id: member.id, name: resolveMemberName(member).fullName },
    });
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
    if (manageView?.kind === 'add' && queue.length > 0) {
      setDiscardOpen(true);
    } else {
      setManageOpen(false);
    }
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    setManageOpen(false);
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
      setManageOpen(false);
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
              aria-label="Adicionar jogadores"
              onClick={() => openManage(isViewerAdmin ? { kind: 'chooser' } : { kind: 'add' })}
            >
              <Plus className="size-5" aria-hidden />
            </Button>
          ) : (
            <span className="w-10 shrink-0" aria-hidden />
          )}
        </div>

        {!soloViewer && (
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
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 [scrollbar-width:none]">
          {soloViewer ? (
            <EmptyRoster />
          ) : noResults ? (
            <Meta className="block px-6 py-10 text-center text-faint-foreground">
              Nenhum jogador encontrado
            </Meta>
          ) : (
            <>
              <RosterSection label="Admins" members={vAdmins} onSelect={openProfile} />
              <RosterSection label="Membros" members={vMembros} onSelect={openProfile} />
              <RosterSection
                label="Convidados"
                members={vConvidados}
                onSelect={openProfile}
                onInvite={isViewerAdmin ? openInviteFor : undefined}
              />
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

        {/* Adicionar jogadores: chooser → manual add or invite. A pending add queue is
            discardable-with-confirmation, so the sheet can't be swiped away while names
            are waiting to be committed. */}
        <DrawerNested
          open={manageOpen}
          onOpenChange={(next) => {
            if (!next) requestCancel();
          }}
          dismissible={manageView?.kind !== 'add' || queue.length === 0}
        >
          <DrawerContent aria-describedby={undefined} size="fit">
            <AnimatedSheetHeight>
              {manageView?.kind === 'chooser' && (
                <AddPlayersChooser
                  onManual={() => openManage({ kind: 'add' })}
                  onInvite={() => openManage({ kind: 'invite', guest: null })}
                />
              )}

              {manageView?.kind === 'invite' && (
                <InviteSheetContent
                  groupId={groupId}
                  groupName={groupName}
                  guest={manageView.guest}
                />
              )}

              {manageView?.kind === 'add' && (
                <AddGuestsView
                  requestCancel={requestCancel}
                  name={name}
                  setName={setName}
                  enqueue={enqueue}
                  queue={queue}
                  dequeue={dequeue}
                  error={error}
                  busy={busy}
                  commit={commit}
                />
              )}
            </AnimatedSheetHeight>
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

type ManageView =
  | { kind: 'chooser' }
  | { kind: 'add' }
  | { kind: 'invite'; guest: { id: string; name: string } | null };

// vaul only animates transform, so swapping views inside the open manage sheet would
// snap its height in one frame — this wrapper measures the active view and eases the
// change instead (vaul's own easing). First mount starts at `auto` (transitions from
// auto don't run), so opening still animates only via vaul's slide; only view-to-view
// (px → px) changes ease.
function AnimatedSheetHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="min-h-0 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      style={{ height: height ?? 'auto' }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

// The two ways of putting someone in the group: create the profile now and invite
// later, or send the group link and let them enter (as a guest's heir or brand new).
function AddPlayersChooser({ onManual, onInvite }: { onManual: () => void; onInvite: () => void }) {
  return (
    <div className="px-4 pt-1 pb-10">
      <DrawerTitle className="px-2 pt-1 pb-4 text-left">Adicionar jogadores</DrawerTitle>
      <div className="space-y-snug">
        <ChooserOption
          icon={<UserPlus className="size-5" aria-hidden />}
          iconClassName="bg-muted text-foreground shadow-hairline"
          title="Adicionar manualmente"
          description="Agora você só adiciona o nome. Depois, convida com o link do grupo ou um link específico pro perfil."
          onClick={onManual}
        />
        <ChooserOption
          icon={<Send className="size-5 text-white" aria-hidden />}
          iconClassName="bg-[linear-gradient(150deg,var(--accent),var(--accent-dark))] shadow-button"
          title="Convidar pro grupo"
          description="Você manda o link do grupo. Quem recebe escolhe: assumir um dos perfis que você adicionou ou entrar como jogador novo."
          onClick={onInvite}
        />
      </div>
    </div>
  );
}

function ChooserOption({
  icon,
  iconClassName,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3.5 rounded-2xl bg-surface p-4 text-left shadow-hairline transition-transform active:scale-[0.99]"
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-2xl',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <Label className="block text-foreground">{title}</Label>
        <Meta className="mt-tight block text-muted-foreground">{description}</Meta>
      </span>
    </button>
  );
}

// The guest-name queue (typed names commit together into the roster).
function AddGuestsView({
  requestCancel,
  name,
  setName,
  enqueue,
  queue,
  dequeue,
  error,
  busy,
  commit,
}: {
  requestCancel: () => void;
  name: string;
  setName: (value: string) => void;
  enqueue: () => void;
  queue: string[];
  dequeue: (index: number) => void;
  error: string;
  busy: boolean;
  commit: () => void;
}) {
  return (
    // Minimum height so the sheet doesn't shrink when the empty state gives way to
    // the first queued guest (the queue is shorter than the empty illustration).
    <div className="flex min-h-[80dvh] flex-col">
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
    </div>
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

// Only the viewer in the group: their own row teaches nothing, so the list gives
// way to the next step. Solo viewers are always members, so the '+' is there.
function EmptyRoster() {
  return (
    <div className="flex flex-col items-center px-6 pb-20 pt-14 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-surface text-faint-foreground shadow-hairline">
        <Users className="size-10" strokeWidth={1.6} aria-hidden />
      </span>
      <Heading className="mt-comfortable">Só você por aqui</Heading>
      <Meta className="mt-snug max-w-60 text-muted-foreground">
        Toque no <span className="font-extrabold text-brand">+</span> para adicionar.
      </Meta>
    </div>
  );
}

function RosterSection({
  label,
  members,
  onSelect,
  onInvite,
}: {
  label: string;
  members: GroupMember[];
  onSelect: (memberId: string) => void;
  // Admin-only: renders a "Convidar" pill on each row (guests waiting for their link).
  onInvite?: (member: GroupMember) => void;
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
          <RosterRow key={member.id} member={member} onSelect={onSelect} onInvite={onInvite} />
        ))}
      </div>
    </section>
  );
}

function RosterRow({
  member,
  onSelect,
  onInvite,
}: {
  member: GroupMember;
  onSelect: (memberId: string) => void;
  onInvite?: (member: GroupMember) => void;
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
      {onInvite && (
        // Above the stretched row button, so the pill wins the tap.
        <Button
          size="sm"
          touchTarget
          className="relative z-10 shrink-0"
          aria-label={`Convidar ${fullName}`}
          onClick={() => onInvite(member)}
        >
          <Send aria-hidden />
          Convidar
        </Button>
      )}
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
