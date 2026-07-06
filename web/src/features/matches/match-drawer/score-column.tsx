import type { CSSProperties } from 'react';
import { LOSE_VALUES, WIN_VALUES, type LoseValue, type WinValue } from './use-match-form';

// The tap-to-pick score selector for one team row. The winner variant offers
// {7,6}; the loser variant offers {0..6} constrained by the winning score. In
// both, the unpicked options sit stacked and, once a value is chosen, the whole
// column animates so the selection collapses to a single oversized figure —
// re-expanding when that figure is tapped again. All geometry is absolute so the
// cells can glide between layouts; only colour comes from tokens.

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

const WIN_TRANSITION = [
  `top .52s ${EASE}`,
  'opacity .36s ease',
  `transform .52s ${EASE}`,
  `font-size .52s ${EASE}`,
  `letter-spacing .52s ${EASE}`,
  'color .15s',
].join(', ');

const LOSE_TRANSITION = [
  `top .52s ${EASE}`,
  `left .52s ${EASE}`,
  `width .52s ${EASE}`,
  `height .52s ${EASE}`,
  'opacity .34s ease',
  `transform .52s ${EASE}`,
  `font-size .52s ${EASE}`,
  `letter-spacing .52s ${EASE}`,
  'color .15s',
].join(', ');

const CELL_BASE: CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  background: 'transparent',
  border: 'none',
  padding: 0,
};

function winCellStyle(value: WinValue, index: number, win: WinValue | null, winOpen: boolean) {
  const collapsed = win !== null && !winOpen;
  const selected = win === value;
  const isBig = collapsed && selected;
  const hidden = collapsed && !selected;

  return {
    ...CELL_BASE,
    left: 0,
    right: 0,
    height: '50%',
    top: `${collapsed ? 25 : index * 50}%`,
    cursor: hidden ? 'default' : 'pointer',
    fontSize: isBig ? '96px' : '58px',
    letterSpacing: isBig ? '-2px' : '-1px',
    color: selected ? 'var(--foreground)' : 'var(--faint-foreground)',
    opacity: hidden ? 0 : 1,
    transform: hidden ? 'scale(0.78)' : 'scale(1)',
    pointerEvents: hidden ? 'none' : 'auto',
    zIndex: isBig ? 2 : 1,
    transition: WIN_TRANSITION,
  } satisfies CSSProperties;
}

function loseCellStyle(
  value: LoseValue,
  win: WinValue | null,
  lose: LoseValue | null,
  loseOpen: boolean,
) {
  const locked = lose !== null && !loseOpen;
  const selected = lose === value;

  const base: CSSProperties = {
    ...CELL_BASE,
    height: '20%',
    letterSpacing: '-1px',
    transition: LOSE_TRANSITION,
  };
  const hide: CSSProperties = {
    ...base,
    left: '0%',
    width: '100%',
    top: '40%',
    fontSize: '27px',
    color: 'var(--faint-foreground)',
    opacity: 0,
    transform: 'scale(0.78)',
    pointerEvents: 'none',
    cursor: 'default',
  };

  if (locked) {
    if (!selected) return hide;
    return {
      ...base,
      left: '0%',
      width: '100%',
      top: '40%',
      fontSize: '96px',
      letterSpacing: '-2px',
      color: 'var(--foreground)',
      opacity: 1,
      transform: 'scale(1)',
      zIndex: 2,
      cursor: 'pointer',
    } satisfies CSSProperties;
  }

  const available = win === 7 ? value >= 5 : win === 6 ? value <= 4 : true;
  if (!available) return hide;

  const color = selected ? 'var(--foreground)' : 'var(--faint-foreground)';

  // Not decided yet: 0–4 stack in a left column, 5–6 in a shorter right column.
  if (win === null) {
    if (value <= 4) {
      return {
        ...base,
        left: '14%',
        width: '40%',
        top: `${value * 20}%`,
        fontSize: '27px',
        color,
        cursor: 'pointer',
      } satisfies CSSProperties;
    }
    return {
      ...base,
      left: '48%',
      width: '34%',
      top: `${30 + (value - 5) * 20}%`,
      fontSize: '27px',
      color,
      cursor: 'pointer',
    } satisfies CSSProperties;
  }

  // Winner chosen: the legal options reflow into one centered column.
  const options: LoseValue[] = win === 7 ? [5, 6] : [0, 1, 2, 3, 4];
  const rowPct = 100 / options.length;
  const rowIndex = options.indexOf(value);
  return {
    ...base,
    left: '0%',
    width: '100%',
    top: `${rowIndex * rowPct}%`,
    height: `${rowPct}%`,
    fontSize: options.length <= 2 ? '46px' : '27px',
    color,
    cursor: 'pointer',
  } satisfies CSSProperties;
}

type ScoreColumnProps = {
  variant: 'win' | 'lose';
  win: WinValue | null;
  lose: LoseValue | null;
  winOpen: boolean;
  loseOpen: boolean;
  onTapWin: (value: WinValue) => void;
  onTapLose: (value: LoseValue) => void;
};

export function ScoreColumn({
  variant,
  win,
  lose,
  winOpen,
  loseOpen,
  onTapWin,
  onTapLose,
}: ScoreColumnProps) {
  if (variant === 'win') {
    return (
      <div className="relative h-full min-w-0">
        {WIN_VALUES.map((value, index) => (
          <button
            key={value}
            type="button"
            onClick={() => onTapWin(value)}
            style={winCellStyle(value, index, win, winOpen)}
          >
            {value}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-full min-w-0">
      {LOSE_VALUES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onTapLose(value)}
          style={loseCellStyle(value, win, lose, loseOpen)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
