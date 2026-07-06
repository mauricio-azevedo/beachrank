import type { CSSProperties } from 'react';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { cn } from '@/lib/utils';
import type { ResolvedPlayer } from './match-player.helpers';
import type { SlotKey, Slots } from './use-match-form';

// One team's two player slots. Each slot is a tap target that opens the picker
// for that position. While the picker is open the surname collapses away (so the
// narrowed column stays legible) and the active slot's given name turns accent.

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

const LAST_NAME_TRANSITION = `opacity 0.3s ease, max-width 0.44s ${EASE}, margin-left 0.44s ${EASE}`;

const SLOT_LABELS: Record<SlotKey, string> = {
  a1: 'Jogador 1',
  a2: 'Jogador 2',
  b1: 'Jogador 3',
  b2: 'Jogador 4',
};

function surnameOf(player: ResolvedPlayer) {
  const rest = player.fullName.slice(player.firstName.length).trim();
  return rest;
}

type TeamRowProps = {
  slotKeys: [SlotKey, SlotKey];
  slots: Slots;
  resolve: (id: string) => ResolvedPlayer | undefined;
  activeSlot: SlotKey | null;
  pickerOpen: boolean;
  onTapSlot: (slot: SlotKey) => void;
};

export function TeamRow({
  slotKeys,
  slots,
  resolve,
  activeSlot,
  pickerOpen,
  onTapSlot,
}: TeamRowProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
      {slotKeys.map((slotKey) => {
        const memberId = slots[slotKey];
        const player = memberId ? resolve(memberId) : undefined;
        const active = pickerOpen && activeSlot === slotKey;

        const lastNameStyle: CSSProperties = {
          flex: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          opacity: pickerOpen ? 0 : 1,
          maxWidth: pickerOpen ? 0 : '140px',
          marginLeft: pickerOpen ? 0 : '5px',
          transition: LAST_NAME_TRANSITION,
        };

        return (
          <button
            key={slotKey}
            type="button"
            onClick={() => onTapSlot(slotKey)}
            className="flex h-11 min-w-0 items-center gap-2.5 text-left transition-transform active:scale-[0.98]"
          >
            {player ? (
              <MemberAvatar
                userId={player.userId}
                name={player.fullName}
                avatarColor={player.avatarColor}
                size="xs"
                initials={1}
              />
            ) : (
              <span
                aria-hidden
                className="size-[34px] shrink-0 rounded-full border-[1.5px] border-dashed border-border-accent"
              />
            )}

            <span className="flex min-w-0 flex-1 items-baseline overflow-hidden">
              <span
                className={cn(
                  'min-w-0 shrink truncate text-field font-bold',
                  player
                    ? active
                      ? 'text-brand'
                      : 'text-foreground'
                    : active
                      ? 'text-brand'
                      : 'text-faint-foreground',
                )}
              >
                {player ? player.firstName : SLOT_LABELS[slotKey]}
              </span>
              {player && (
                <span
                  className="text-field font-semibold text-muted-foreground"
                  style={lastNameStyle}
                >
                  {surnameOf(player)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
