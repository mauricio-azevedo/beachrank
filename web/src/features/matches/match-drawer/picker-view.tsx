import { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Dot, Label, Meta, Overline } from '@/components/ui/text';
import { DrawerBackHeader } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/components/ui/member-avatar';

export type PickerEntry = {
  id: string;
  firstName: string;
  fullName: string;
  initial: string;
  avatarColor: string | null;
  // null → jogador sem conta (convidado), rendered as a dashed avatar.
  userId: string | null;
  rank?: number;
  rating: number;
  isYou: boolean;
};

type PickerViewProps = {
  sublabel: string;
  pool: PickerEntry[];
  currentId: string | null;
  takenIds: string[];
  onSelect: (memberId: string) => void;
  onCreate: (name: string) => void;
  onBack: () => void;
};

const MAX_NAME_LENGTH = 60;

export function PickerView({
  sublabel,
  pool,
  currentId,
  takenIds,
  onSelect,
  onCreate,
  onBack,
}: PickerViewProps) {
  const [search, setSearch] = useState('');

  const trimmedName = search.trim().slice(0, MAX_NAME_LENGTH);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return pool;
    }

    return pool.filter((entry) => entry.fullName.toLowerCase().includes(query));
  }, [pool, search]);

  const canCreate = trimmedName.length > 0;

  function handleCreate() {
    if (!canCreate) {
      return;
    }

    onCreate(trimmedName);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBackHeader onBack={onBack} title="Escolher jogador" subtitle={sublabel} />

      <div className="shrink-0 px-[18px] pb-3 pt-1">
        <div className="flex h-[46px] items-center gap-2.5 rounded-pill bg-surface px-4 shadow-hairline">
          <Search
            className="size-[18px] shrink-0 text-faint-foreground"
            strokeWidth={2.2}
            aria-hidden
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar jogador do grupo"
            className="min-w-0 flex-1 bg-transparent text-field font-semibold text-foreground outline-none placeholder:text-faint-foreground"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[30px] [scrollbar-width:none]">
        {filtered.length > 0 ? (
          <div className="overflow-hidden rounded-3xl bg-surface shadow-hairline">
            {filtered.map((entry) => {
              const checked = entry.id === currentId;
              const taken = !checked && takenIds.includes(entry.id);

              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={taken}
                  onClick={() => onSelect(entry.id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-t border-divider px-4 py-3 text-left first:border-t-0',
                    taken && 'opacity-40',
                    checked && 'bg-brand/15',
                  )}
                >
                  <MemberAvatar
                    userId={entry.userId}
                    name={entry.fullName}
                    avatarColor={entry.avatarColor}
                    size="md"
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 items-end gap-2">
                      <Label className="truncate text-foreground">{entry.fullName}</Label>
                      {entry.isYou && (
                        <span className="shrink-0 rounded-md bg-brand/20 px-1.5 py-px text-brand">
                          <Overline size="xs" className="text-brand">
                            Você
                          </Overline>
                        </span>
                      )}
                    </div>
                    <Meta className="text-muted-foreground">
                      {entry.rank !== undefined ? (
                        <>
                          #{entry.rank}
                          <Dot />
                        </>
                      ) : null}
                      {Math.round(entry.rating)} pts
                    </Meta>
                  </div>

                  {checked && (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  {taken && <Meta className="shrink-0 text-faint-foreground">Na partida</Meta>}
                </button>
              );
            })}
          </div>
        ) : (
          !trimmedName && (
            <Meta className="mt-7 block text-center text-faint-foreground">
              Nenhum jogador encontrado.
            </Meta>
          )
        )}

        {trimmedName && (
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            className={cn(
              'mt-3 flex w-full items-center gap-3 rounded-3xl bg-surface px-4 py-3 text-left shadow-hairline transition-opacity active:opacity-60',
              !canCreate && 'opacity-60',
            )}
          >
            <span
              className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand"
              aria-hidden
            >
              <Plus className="size-[20px]" strokeWidth={2.4} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Label className="truncate text-foreground">{`Criar “${trimmedName}”`}</Label>
              <Meta className="text-muted-foreground">Novo jogador neste grupo</Meta>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
