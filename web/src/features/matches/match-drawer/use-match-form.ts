import { useMemo, useState } from 'react';
import type { Match } from '@/types/api';

export type SlotKey = 'a1' | 'a2' | 'b1' | 'b2';
export type Slots = Record<SlotKey, string | null>;

// Top row (a1/a2) is always the winning team; bottom row (b1/b2) the loser.
// A swap flips the two rows. On submit, top → teamA, bottom → teamB, so
// `gamesA (win) > gamesB (lose)` always and the backend derives TEAM_A as winner.
export const SLOT_KEYS: SlotKey[] = ['a1', 'a2', 'b1', 'b2'];

const TOP_KEYS: [SlotKey, SlotKey] = ['a1', 'a2'];
const BOTTOM_KEYS: [SlotKey, SlotKey] = ['b1', 'b2'];

// Beach-tennis single set, no draws: the winner closes at 6 (loser ≤4), 7–5, or
// 7–6 (6–6 tie-break). The winner therefore only ever picks 7 or 6.
export type WinValue = 6 | 7;
export type LoseValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WIN_VALUES: WinValue[] = [7, 6];
export const LOSE_VALUES: LoseValue[] = [0, 1, 2, 3, 4, 5, 6];

// Which loser scores are legal for a given winning score.
export function loseOptionsFor(win: WinValue | null): LoseValue[] {
  if (win === 7) return [5, 6];
  if (win === 6) return [0, 1, 2, 3, 4];
  return LOSE_VALUES;
}

function emptySlots(): Slots {
  return { a1: null, a2: null, b1: null, b2: null };
}

// Seed slots + score from an existing match (edit): the previously-winning team
// goes on top and both selectors start collapsed to their chosen figure.
function initFromMatch(match: Match) {
  const memberAt = (team: 'TEAM_A' | 'TEAM_B', position: number) =>
    match.players.find((player) => player.team === team && player.position === position)
      ?.groupMemberId ?? null;

  const winningTeam = match.gamesA >= match.gamesB ? 'TEAM_A' : 'TEAM_B';
  const losingTeam = winningTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

  const slots: Slots = {
    a1: memberAt(winningTeam, 1),
    a2: memberAt(winningTeam, 2),
    b1: memberAt(losingTeam, 1),
    b2: memberAt(losingTeam, 2),
  };

  const win = Math.max(match.gamesA, match.gamesB) as WinValue;
  const lose = Math.min(match.gamesA, match.gamesB) as LoseValue;

  return { slots, win, lose };
}

export function useMatchForm(match?: Match) {
  const seed = useMemo(() => (match ? initFromMatch(match) : null), [match]);

  const [slots, setSlots] = useState<Slots>(() => seed?.slots ?? emptySlots());
  const [win, setWin] = useState<WinValue | null>(() => seed?.win ?? null);
  const [lose, setLose] = useState<LoseValue | null>(() => seed?.lose ?? null);
  // A selector is "open" (expanded to all options) until a value is chosen; it
  // collapses to the picked figure and re-opens when that figure is tapped again.
  const [winOpen, setWinOpen] = useState(() => seed == null);
  const [loseOpen, setLoseOpen] = useState(() => seed == null);

  const assign = (slot: SlotKey, memberId: string) =>
    setSlots((current) => ({ ...current, [slot]: memberId }));

  const clear = (slot: SlotKey) => setSlots((current) => ({ ...current, [slot]: null }));

  const firstEmpty = (source: Slots = slots): SlotKey | null =>
    SLOT_KEYS.find((key) => source[key] == null) ?? null;

  const swapSides = () =>
    setSlots((current) => ({
      a1: current.b1,
      a2: current.b2,
      b1: current.a1,
      b2: current.a2,
    }));

  const chooseWin = (value: WinValue) => {
    let nextLose = lose;
    let reopenLose = false;

    // Keep the loser only if it stays legal under the new winning score.
    if (!loseOptionsFor(value).includes(lose as LoseValue)) {
      nextLose = null;
      reopenLose = true;
    }

    setWin(value);
    setLose(nextLose);
    setWinOpen(false);
    if (reopenLose) setLoseOpen(true);
  };

  const chooseLose = (value: LoseValue) => {
    // Picking a loser score implies the winner: 5–6 → 7, 0–4 → 6.
    setLose(value);
    setWin(value >= 5 ? 7 : 6);
    setWinOpen(false);
    setLoseOpen(false);
  };

  const tapWin = (value: WinValue) => {
    // Tapping the already-collapsed winner re-opens both selectors from scratch.
    if (win === value && !winOpen) {
      setWin(null);
      setLose(null);
      setWinOpen(true);
      setLoseOpen(true);
      return;
    }
    chooseWin(value);
  };

  const tapLose = (value: LoseValue) => {
    if (lose === value && !loseOpen) {
      setLose(null);
      setLoseOpen(true);
      return;
    }
    chooseLose(value);
  };

  const selectedIds = useMemo(
    () => SLOT_KEYS.map((key) => slots[key]).filter((id): id is string => Boolean(id)),
    [slots],
  );

  const allChosen = selectedIds.length === 4 && new Set(selectedIds).size === 4;

  const canSave = allChosen && win !== null && lose !== null;

  return {
    slots,
    assign,
    clear,
    firstEmpty,
    swapSides,
    topKeys: TOP_KEYS,
    bottomKeys: BOTTOM_KEYS,
    selectedIds,
    allChosen,
    win,
    lose,
    winOpen,
    loseOpen,
    tapWin,
    tapLose,
    canSave,
  };
}

export type MatchFormState = ReturnType<typeof useMatchForm>;
