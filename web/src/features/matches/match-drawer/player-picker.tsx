import { useMemo, type CSSProperties } from 'react';
import { Check, Info, Search, UserPlus, Users, X } from 'lucide-react';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Label, Meta, Overline } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type PickerEntry = {
  id: string;
  firstName: string;
  fullName: string;
  // null → jogador sem conta (convidado), rendered as a dashed avatar.
  userId: string | null;
  avatarColor: string | null;
  rank?: number;
  isYou: boolean;
};

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

function surnameOf(entry: PickerEntry) {
  return entry.fullName.slice(entry.firstName.length).trim();
}

type PlayerPickerProps = {
  open: boolean;
  pool: PickerEntry[];
  // 1–4 when the player already fills a slot, else null.
  slotNumberById: (id: string) => number | null;
  search: string;
  onSearchChange: (value: string) => void;
  convOpen: boolean;
  convName: string;
  onToggleConv: () => void;
  onConvNameChange: (value: string) => void;
  onConfirmConv: () => void;
  onSelect: (id: string) => void;
};

export function PlayerPicker({
  open,
  pool,
  slotNumberById,
  search,
  onSearchChange,
  convOpen,
  convName,
  onToggleConv,
  onConvNameChange,
  onConfirmConv,
  onSelect,
}: PlayerPickerProps) {
  const query = search.trim();

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q ? pool.filter((entry) => entry.fullName.toLowerCase().includes(q)) : pool;
    const sorted = [...filtered].sort((a, b) => a.firstName.localeCompare(b.firstName, 'pt'));

    const out: { letter: string; items: PickerEntry[] }[] = [];
    for (const entry of sorted) {
      const letter = entry.firstName.charAt(0).toUpperCase();
      let group = out[out.length - 1];
      if (!group || group.letter !== letter) {
        group = { letter, items: [] };
        out.push(group);
      }
      group.items.push(entry);
    }
    return out;
  }, [pool, query]);

  const isEmptyGroup = pool.length === 0 && !query;
  const superEmpty = groups.length === 0 && !convOpen && isEmptyGroup;
  const emptyState = groups.length === 0 && !convOpen && !isEmptyGroup;
  const canConfirmConv = convName.trim().length > 0;

  const panelStyle: CSSProperties = {
    top: '-6px',
    bottom: '-18px',
    left: '40%',
    right: 0,
    transform: open ? 'translateX(0%)' : 'translateX(115%)',
    transition: `transform 0.46s ${EASE}`,
  };

  return (
    <div
      data-picker
      style={panelStyle}
      className="absolute z-20 flex flex-col bg-background px-3 pt-3 pb-3.5 shadow-[-5px_0_12px_-3px_rgba(0,0,0,0.1)]"
    >
      {/* Search + add-guest toggle */}
      <div className="mb-2.5 flex shrink-0 items-center gap-[7px]">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-pill bg-surface px-3.5 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search
            className="size-[15px] shrink-0 text-faint-foreground"
            strokeWidth={2.2}
            aria-hidden
          />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar"
            className="min-w-0 flex-1 bg-transparent text-meta font-semibold text-foreground outline-none placeholder:text-faint-foreground"
          />
        </div>
        <button
          type="button"
          onClick={onToggleConv}
          aria-label={convOpen ? 'Fechar' : 'Adicionar convidado'}
          className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-brand text-brand-foreground shadow-button transition-transform active:scale-[0.94]"
        >
          {convOpen ? (
            <X className="size-[18px]" strokeWidth={2.6} aria-hidden />
          ) : (
            <UserPlus className="size-[19px]" strokeWidth={2.3} aria-hidden />
          )}
        </button>
      </div>

      {/* Inline guest name field */}
      {convOpen && (
        <>
          <div className="mb-1.5 flex h-[50px] shrink-0 items-center gap-2 rounded-[25px] bg-surface pl-4 pr-1.5 shadow-[inset_0_0_0_1.5px_var(--brand)]">
            <input
              value={convName}
              onChange={(event) => onConvNameChange(event.target.value)}
              placeholder="Nome do convidado"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') onConfirmConv();
              }}
              className="min-w-0 flex-1 bg-transparent text-label font-bold text-foreground outline-none placeholder:text-faint-foreground"
            />
            <button
              type="button"
              onClick={onConfirmConv}
              disabled={!canConfirmConv}
              aria-label="Confirmar convidado"
              className={cn(
                'flex size-[38px] shrink-0 items-center justify-center rounded-pill bg-brand text-brand-foreground transition-opacity active:scale-[0.92]',
                !canConfirmConv && 'opacity-45',
              )}
            >
              <Check className="size-[18px]" strokeWidth={3} aria-hidden />
            </button>
          </div>
          <div className="mx-1 mb-2.5 flex shrink-0 items-center gap-1.5">
            <Info
              className="size-[13px] shrink-0 text-faint-foreground"
              strokeWidth={2.2}
              aria-hidden
            />
            <Meta className="font-semibold text-faint-foreground">Entra ao registrar</Meta>
          </div>
        </>
      )}

      {/* Roster, grouped by initial letter */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-6 [scrollbar-width:none]">
        {groups.map((group, index) => (
          <div key={group.letter}>
            {index > 0 && (
              <div className="mb-1.5 ml-[26px] h-px bg-[color-mix(in_oklch,var(--foreground)_4%,transparent)]" />
            )}
            <div className="flex items-start">
              <div className="flex w-5 shrink-0 pt-[9px] text-overline-xs font-extrabold tracking-[0.05em] text-faint-foreground">
                {group.letter}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {group.items.map((entry) => (
                  <PickerRow
                    key={entry.id}
                    entry={entry}
                    slotNumber={slotNumberById(entry.id)}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {superEmpty && (
          <EmptyState
            title="Ninguém no grupo ainda"
            hint="Adicione convidados pra montar a primeira partida — eles entram no grupo ao registrar."
            cta="Adicionar convidado"
            onCta={onToggleConv}
          />
        )}
        {emptyState && (
          <EmptyState
            title="Ninguém encontrado"
            hint={
              query ? `Adicione “${query}” como convidado.` : 'Adicione um convidado pra começar.'
            }
            cta={query ? `Adicionar “${query}”` : 'Adicionar convidado'}
            onCta={onToggleConv}
          />
        )}
      </div>
    </div>
  );
}

function PickerRow({
  entry,
  slotNumber,
  onSelect,
}: {
  entry: PickerEntry;
  slotNumber: number | null;
  onSelect: (id: string) => void;
}) {
  const selected = slotNumber !== null;
  const isGuest = entry.userId === null;
  const sub = isGuest ? 'Convidado' : entry.isYou ? 'Você' : surnameOf(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className={cn(
        'flex h-12 items-center gap-2.5 rounded-[24px] px-1.5 text-left transition-transform active:scale-[0.99]',
        selected && 'bg-brand/15',
      )}
    >
      <MemberAvatar
        userId={entry.userId}
        name={entry.fullName}
        avatarColor={entry.avatarColor}
        size="xs"
        initials={1}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-field font-bold',
            selected ? 'text-brand' : 'text-foreground',
          )}
        >
          {entry.firstName}
        </div>
        <Meta className="block truncate font-semibold text-faint-foreground">{sub}</Meta>
      </div>

      {selected ? (
        <span className="flex h-[22px] min-w-6 shrink-0 items-center justify-center rounded-[11px] bg-brand px-1.5">
          <Meta className="font-extrabold text-brand-foreground">{slotNumber}</Meta>
        </span>
      ) : entry.rank !== undefined ? (
        <Meta className="shrink-0 pr-1 font-extrabold text-faint-foreground">#{entry.rank}</Meta>
      ) : (
        <span className="shrink-0 rounded-[9px] bg-brand/20 px-2 py-[3px]">
          <Overline size="xs" className="text-brand">
            Novo
          </Overline>
        </span>
      )}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  cta,
  onCta,
}: {
  title: string;
  hint: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-4 px-4 py-7 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface text-faint-foreground shadow-[inset_0_0_0_1px_var(--border-accent)]">
        <Users className="size-7" strokeWidth={1.9} aria-hidden />
      </span>
      <div>
        <Label className="block font-extrabold text-foreground">{title}</Label>
        <Meta className="mx-auto mt-1.5 block max-w-[232px] font-semibold leading-[1.45] text-faint-foreground">
          {hint}
        </Meta>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="flex h-[46px] items-center gap-2 rounded-pill bg-brand px-[18px] text-brand-foreground shadow-button transition-transform active:scale-[0.96]"
      >
        <UserPlus className="size-[18px]" strokeWidth={2.3} aria-hidden />
        <Label className="font-extrabold text-brand-foreground">{cta}</Label>
      </button>
    </div>
  );
}
