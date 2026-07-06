'use client';

import { Check } from 'lucide-react';
import { AVATAR_COLORS } from '@/lib/avatar-color';
import { cn } from '@/lib/utils';

// The avatar palette picker: a wrapping row of gradient swatches, the selected one
// ringed with a check. Shared by the profile editor and the create-group sheet so
// both pick from the same palette with identical treatment. The caller owns the
// live avatar preview above it.
export function ColorSwatchPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap justify-center gap-base', className)}>
      {AVATAR_COLORS.map((color) => {
        const selected = color.key === value;
        return (
          <button
            key={color.key}
            type="button"
            aria-label={`Cor ${color.key}`}
            aria-pressed={selected}
            onClick={() => onChange(color.key)}
            className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
            style={{
              backgroundImage: `linear-gradient(150deg, ${color.from}, ${color.to})`,
              boxShadow: selected
                ? `0 0 0 2px var(--background), 0 0 0 4px ${color.from}`
                : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            {selected && <Check className="size-[1.125rem] text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
