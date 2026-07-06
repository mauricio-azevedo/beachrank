'use client';

import { type CSSProperties, useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { GroupMember, Match, MatchPlayerInput } from '@/types/api';
import { Drawer, DrawerActionHeader, DrawerContent } from '@/components/ui/drawer';
import { Meta } from '@/components/ui/text';
import { createGroupMatch, updateGroupMatch } from '@/features/matches/api/matches.api';
import { getAccessToken } from '@/lib/auth';
import { TeamRow } from './team-row';
import { ScoreColumn } from './score-column';
import { type PickerEntry, PlayerPicker } from './player-picker';
import {
  buildPlayerLookup,
  isDraftGuest,
  makeDraftGuest,
  resolveFromMember,
} from './match-player.helpers';
import { SLOT_KEYS, type SlotKey, useMatchForm } from './use-match-form';

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

export type MatchDrawerTarget =
  | { mode: 'create'; key: number }
  | { mode: 'edit'; key: number; match: Match };

type MatchDrawerProps = {
  open: boolean;
  target: MatchDrawerTarget | null;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  ranking: GroupMember[];
  currentMembershipId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function MatchDrawer({
  open,
  target,
  groupId,
  groupName,
  members,
  ranking,
  currentMembershipId,
  onClose,
  onSaved,
}: MatchDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DrawerContent aria-describedby={undefined}>
        {target && (
          <MatchComposer
            key={target.key}
            mode={target.mode}
            match={target.mode === 'edit' ? target.match : undefined}
            groupId={groupId}
            groupName={groupName}
            members={members}
            ranking={ranking}
            currentMembershipId={currentMembershipId}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

type MatchComposerProps = {
  mode: 'create' | 'edit';
  match?: Match;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  ranking: GroupMember[];
  currentMembershipId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

function MatchComposer({
  mode,
  match,
  groupId,
  groupName,
  members,
  ranking,
  currentMembershipId,
  onClose,
  onSaved,
}: MatchComposerProps) {
  const form = useMatchForm(match);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [search, setSearch] = useState('');
  const [convOpen, setConvOpen] = useState(false);
  const [convName, setConvName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guests named inline this session: local-only drafts, merged into the roster so
  // they're immediately pickable. Persisted only when the match is saved.
  const [draftGuests, setDraftGuests] = useState<GroupMember[]>([]);

  const roster = useMemo(() => [...members, ...draftGuests], [members, draftGuests]);
  const lookup = useMemo(() => buildPlayerLookup(roster, match), [roster, match]);

  const rankById = useMemo(() => {
    const map = new Map<string, number>();
    ranking.forEach((member, index) => map.set(member.id, index + 1));
    return map;
  }, [ranking]);

  const pool = useMemo<PickerEntry[]>(
    () =>
      roster
        .filter((member) => member.leftAt === null)
        .map((member) => {
          const resolved = resolveFromMember(member);
          return {
            id: member.id,
            firstName: resolved.firstName,
            fullName: resolved.fullName,
            userId: resolved.userId,
            avatarColor: resolved.avatarColor,
            rank: rankById.get(member.id),
            isYou: member.id === currentMembershipId,
          };
        }),
    [roster, rankById, currentMembershipId],
  );

  function openPicker(slot: SlotKey) {
    setActiveSlot(slot);
    setPickerOpen(true);
    setSearch('');
    setConvOpen(false);
    setConvName('');
  }

  function closePicker() {
    setPickerOpen(false);
    setConvOpen(false);
    setConvName('');
  }

  // Fill `slot` with `id`, then focus the next empty slot; auto-close once the
  // fourth player completes the lineup.
  function fillAndAdvance(slot: SlotKey, id: string) {
    const wasComplete = form.allChosen;
    form.assign(slot, id);
    const nextSlots = { ...form.slots, [slot]: id };
    const next = form.firstEmpty(nextSlots);
    setActiveSlot(next ?? slot);
    setSearch('');
    if (!wasComplete && !next) {
      setPickerOpen(false);
    }
  }

  function handleSelect(id: string) {
    // Tapping a player already in the lineup removes them (toggle off).
    const inSlot = SLOT_KEYS.find((key) => form.slots[key] === id);
    if (inSlot) {
      form.clear(inSlot);
      setActiveSlot(inSlot);
      setSearch('');
      return;
    }

    const slot = activeSlot ?? form.firstEmpty();
    if (!slot) {
      return;
    }
    fillAndAdvance(slot, id);
  }

  function handleToggleConv() {
    if (convOpen) {
      setConvOpen(false);
      setConvName('');
      return;
    }

    const query = search.trim();
    const exact = pool.some((entry) => entry.fullName.toLowerCase() === query.toLowerCase());
    setConvOpen(true);
    setConvName(query && !exact ? query : '');
  }

  function handleConfirmConv() {
    const name = convName.trim();
    if (!name) {
      return;
    }

    const draft = makeDraftGuest(groupId, name);
    setDraftGuests((prev) => [...prev, draft]);
    setConvOpen(false);
    setConvName('');

    const slot = activeSlot ?? form.firstEmpty();
    if (slot) {
      fillAndAdvance(slot, draft.id);
    }
  }

  function slotNumberById(id: string) {
    const index = SLOT_KEYS.findIndex((key) => form.slots[key] === id);
    return index === -1 ? null : index + 1;
  }

  async function handleSave() {
    if (!form.canSave || isSubmitting) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError('Entre na sua conta para registrar uma partida.');
      return;
    }

    const draftNameById = new Map(draftGuests.map((guest) => [guest.id, guest.displayName ?? '']));

    // A draft slot sends the guest's name (backend creates the stub atomically with
    // the match); an existing slot sends its member id.
    const toPlayer = (slot: SlotKey): MatchPlayerInput => {
      const id = form.slots[slot] as string;
      return isDraftGuest(id) ? { name: draftNameById.get(id) ?? '' } : { memberId: id };
    };

    // Top row is the winner: it maps to teamA with the higher score.
    const input = {
      teamAPlayer1: toPlayer('a1'),
      teamAPlayer2: toPlayer('a2'),
      teamBPlayer1: toPlayer('b1'),
      teamBPlayer2: toPlayer('b2'),
      gamesA: form.win as number,
      gamesB: form.lose as number,
    };

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'edit' && match) {
        await updateGroupMatch(token, groupId, match.id, input);
      } else {
        await createGroupMatch(token, groupId, input);
      }

      onSaved();
      onClose();
    } catch {
      setError('Não foi possível salvar. Verifique se você faz parte deste grupo.');
      setIsSubmitting(false);
    }
  }

  const teamsGrow: CSSProperties = {
    display: 'flex',
    flexGrow: pickerOpen ? 40 : 60,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    transition: `flex-grow 0.46s ${EASE}`,
  };
  const scoreGrow: CSSProperties = {
    flexGrow: pickerOpen ? 60 : 40,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    transition: `flex-grow 0.46s ${EASE}`,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerActionHeader
        left={{ kind: 'cancel', onClick: onClose, disabled: isSubmitting }}
        title={mode === 'edit' ? 'Corrigir partida' : 'Nova partida'}
        subtitle={`${groupName} · Duplas`}
        right={{
          kind: 'save',
          label: mode === 'edit' ? 'Salvar' : 'Registrar',
          busyLabel: 'Salvando…',
          onClick: handleSave,
          disabled: !form.canSave,
          busy: isSubmitting,
        }}
      />

      {error && (
        <Meta className="shrink-0 px-4 pb-1 text-center text-danger" role="alert">
          {error}
        </Meta>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col px-3.5 pt-1.5 pb-[18px]">
        {/* Winning team + its score */}
        <div className="flex min-h-0 flex-1 gap-[11px]">
          <div style={teamsGrow}>
            <TeamRow
              slotKeys={form.topKeys}
              slots={form.slots}
              resolve={(id) => lookup.get(id)}
              activeSlot={activeSlot}
              pickerOpen={pickerOpen}
              onTapSlot={openPicker}
            />
          </div>
          <div style={scoreGrow}>
            <ScoreColumn
              variant="win"
              win={form.win}
              lose={form.lose}
              winOpen={form.winOpen}
              loseOpen={form.loseOpen}
              onTapWin={form.tapWin}
              onTapLose={form.tapLose}
            />
          </div>
        </div>

        {/* Divider with the winner-swap control on the team side */}
        <div className="my-[9px] flex shrink-0 items-center">
          <div style={teamsGrow} className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border-accent" />
            <button
              type="button"
              onClick={form.swapSides}
              aria-label="Trocar vencedor"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-transform active:scale-[0.94]"
            >
              <ArrowUpDown className="size-[13px]" strokeWidth={2.4} aria-hidden />
            </button>
            <div className="h-px flex-1 bg-border-accent" />
          </div>
          <div style={scoreGrow} className="flex items-center">
            <div className="h-px flex-1 bg-border-accent" />
          </div>
        </div>

        {/* Losing team + its score */}
        <div className="flex min-h-0 flex-1 gap-[11px]">
          <div style={teamsGrow}>
            <TeamRow
              slotKeys={form.bottomKeys}
              slots={form.slots}
              resolve={(id) => lookup.get(id)}
              activeSlot={activeSlot}
              pickerOpen={pickerOpen}
              onTapSlot={openPicker}
            />
          </div>
          <div style={scoreGrow}>
            <ScoreColumn
              variant="lose"
              win={form.win}
              lose={form.lose}
              winOpen={form.winOpen}
              loseOpen={form.loseOpen}
              onTapWin={form.tapWin}
              onTapLose={form.tapLose}
            />
          </div>
        </div>

        {pickerOpen && (
          <button
            type="button"
            aria-label="Fechar seletor"
            onClick={closePicker}
            className="absolute inset-0 z-[19] cursor-default"
          />
        )}

        <PlayerPicker
          open={pickerOpen}
          pool={pool}
          slotNumberById={slotNumberById}
          search={search}
          onSearchChange={setSearch}
          convOpen={convOpen}
          convName={convName}
          onToggleConv={handleToggleConv}
          onConvNameChange={setConvName}
          onConfirmConv={handleConfirmConv}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
