'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Match, MatchPlayer } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Body, Heading, Label, Meta, Stat } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { resolveMemberName } from '@/lib/member-name';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteGroupMatch } from '@/features/matches/api/matches.api';
import { useMatchDrawer } from '@/features/matches/match-drawer/match-drawer-context';
import { getMatchNarrativeTitle } from '@/features/matches/lib/match-narrative-title';
import { MemberName } from '@/features/members/components/member-name';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { getAccessToken } from '@/lib/auth';

type MatchesListProps = {
  matches: Match[];
  groupId?: string;
  canManage?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function MatchesList({
  matches,
  groupId,
  canManage = false,
  emptyTitle = 'Nenhuma partida registrada',
  emptyDescription = 'Quando houver partidas, elas aparecem aqui.',
}: MatchesListProps) {
  const matchGroups = groupMatchesByDate(matches);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <Label className="block text-foreground">{emptyTitle}</Label>
          <Body className="text-muted-foreground">{emptyDescription}</Body>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      {matchGroups.map((group) => (
        <div key={group.dateKey} className="space-y-3">
          {isPrimaryDateLabel(group.label) ? (
            <Heading>{group.label}</Heading>
          ) : (
            <Meta className="block text-faint-foreground first-letter:uppercase">
              {group.label}
            </Meta>
          )}

          <div className="space-y-3">
            {group.matches.map((match) => (
              <MatchCard key={match.id} match={match} groupId={groupId} canManage={canManage} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function MatchCard({
  match,
  groupId,
  canManage,
}: {
  match: Match;
  groupId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { openEdit } = useMatchDrawer();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const teamA = getTeamPlayers(match, 'TEAM_A');
  const teamB = getTeamPlayers(match, 'TEAM_B');

  const teamAWon = match.gamesA > match.gamesB;
  const narrativeTitle = getMatchNarrativeTitle(match);

  const winnerPlayers = teamAWon ? teamA : teamB;
  const loserPlayers = teamAWon ? teamB : teamA;
  const winnerScore = teamAWon ? match.gamesA : match.gamesB;
  const loserScore = teamAWon ? match.gamesB : match.gamesA;

  const winnerExpected = teamAWon ? match.teamAExpected : match.teamBExpected;
  const isUpset = winnerExpected !== null && winnerExpected < 0.5;
  const swing = getRatingSwing(match);
  const expectedScore = getExpectedScore(winnerExpected);

  const showActions = Boolean(groupId && canManage);

  async function handleDelete() {
    if (!groupId) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setError('Entre na sua conta para apagar a partida.');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await deleteGroupMatch(token, groupId, match.id);
      setIsConfirmOpen(false);
      router.refresh();
    } catch {
      setError('Não foi possível apagar a partida.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-4">
          <div className="relative flex h-7 min-w-0 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'size-[7px] shrink-0 rounded-full',
                isUpset ? 'bg-tag-warn' : 'bg-tag-info',
              )}
            />
            <Meta className="truncate text-foreground">{narrativeTitle ?? 'Partida'}</Meta>
            {swing !== null && <Meta className="shrink-0 text-muted-foreground">±{swing}</Meta>}

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    touchTarget
                    className="absolute top-1/2 -right-2 -translate-y-1/2 text-faint-foreground"
                  >
                    <MoreVertical className="size-5" />
                    <span className="sr-only">Abrir opções</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      if (!groupId) return;

                      openEdit(match);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Corrigir
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      setIsConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Apagar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="my-3.5 h-px bg-divider" />

          <DuplaRow players={winnerPlayers} score={winnerScore} isWinner />
          <div className="mt-3">
            <DuplaRow players={loserPlayers} score={loserScore} isWinner={false} />
          </div>

          {expectedScore && (
            <Meta className="mt-3.5 block text-faint-foreground">
              Placar esperado{' '}
              <span className="text-muted-foreground">
                {expectedScore.winner}–{expectedScore.loser}
              </span>
            </Meta>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta partida será removida e o ranking do grupo será recalculado com o histórico
              restante.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && <Body className="text-destructive">{error}</Body>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              loading={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DuplaRow({
  players,
  score,
  isWinner,
}: {
  players: MatchPlayer[];
  score: number;
  isWinner: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <AvatarPair players={players} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {players.map((player) => (
          <PlayerName key={player.id} player={player} isWinner={isWinner} />
        ))}
      </div>

      <Stat size="lg" className={cn('ml-1', isWinner ? 'text-brand' : 'text-faint-foreground')}>
        {score}
      </Stat>
    </div>
  );
}

function PlayerName({ player, isWinner }: { player: MatchPlayer; isWinner: boolean }) {
  const moved =
    player.rankBefore !== null &&
    player.rankAfter !== null &&
    player.rankBefore !== player.rankAfter;

  return (
    <span className="flex items-baseline gap-1.5">
      <Label className={isWinner ? 'text-foreground' : 'text-muted-foreground'}>
        <MemberName memberId={player.groupMemberId}>{getPlayerFirstName(player)}</MemberName>
      </Label>
      {player.rankAfter !== null && (
        <Meta className="text-faint-foreground">#{player.rankAfter}</Meta>
      )}
      {moved && (
        <InlineMovement
          isUp={(player.rankAfter as number) < (player.rankBefore as number)}
          positions={Math.abs((player.rankBefore as number) - (player.rankAfter as number))}
        />
      )}
    </span>
  );
}

function InlineMovement({ isUp, positions }: { isUp: boolean; positions: number }) {
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <Meta className={cn('inline-flex items-center gap-0.5', isUp ? 'text-success' : 'text-danger')}>
      <Icon className="size-2.5" strokeWidth={3.2} aria-hidden />
      {positions}
    </Meta>
  );
}

function AvatarPair({ players }: { players: MatchPlayer[] }) {
  return (
    <div className="flex shrink-0">
      {players.slice(0, 2).map((player, index) => (
        <MemberAvatar
          key={player.id}
          userId={player.groupMember?.userId ?? null}
          name={getPlayerFullName(player)}
          avatarColor={player.groupMember?.user?.avatarColor ?? null}
          size="xs"
          className={index > 0 ? '-ml-3' : undefined}
        />
      ))}
    </div>
  );
}

// "Hoje"/"Ontem" anchor the feed and read as section headers; explicit dates
// are quieter sublabels.
function isPrimaryDateLabel(label: string) {
  return label === 'Hoje' || label === 'Ontem';
}

// How much the match moved ratings — the average points exchanged, shown as ±N.
function getRatingSwing(match: Match): number | null {
  if (match.players.length === 0) {
    return null;
  }

  const total = match.players.reduce((sum, player) => sum + Math.abs(player.ratingDelta), 0);
  const average = Math.round(total / match.players.length);

  return average > 0 ? average : null;
}

// The expected scoreline, oriented so the actual winner is listed first (their
// games may be the smaller number when they were the underdog).
function getExpectedScore(winnerExpected: number | null) {
  if (winnerExpected === null) {
    return null;
  }

  const winnerWasFavorite = winnerExpected >= 0.5;
  const favoriteProbability = Math.max(winnerExpected, 1 - winnerExpected);
  const { winnerGames, loserGames } = getExpectedScoreline(favoriteProbability);

  return {
    winner: winnerWasFavorite ? winnerGames : loserGames,
    loser: winnerWasFavorite ? loserGames : winnerGames,
  };
}

// Placares de vitória válidos. Jogo até 6 games (7 no tiebreak):
// 6-0, 6-1, 6-2, 6-3, 6-4, 6-5 e 7-6.
const VALID_SCORELINES = [
  { winnerGames: 7, loserGames: 6 }, // fração 0,538
  { winnerGames: 6, loserGames: 5 }, // fração 0,545
  { winnerGames: 6, loserGames: 4 }, // fração 0,600
  { winnerGames: 6, loserGames: 3 }, // fração 0,667
  { winnerGames: 6, loserGames: 2 }, // fração 0,750
  { winnerGames: 6, loserGames: 1 }, // fração 0,857
  { winnerGames: 6, loserGames: 0 }, // fração 1,000
];

// A fração de games é a forma "realizada" da probabilidade no modelo de rating
// (delta = K * (fração − probabilidade), o mesmo eixo da narrativa). Então o placar
// esperado é o resultado válido cuja fração de games mais se aproxima da chance de vitória.
function getExpectedScoreline(favoriteProbability: number) {
  return VALID_SCORELINES.reduce((closest, scoreline) => {
    const share = scoreline.winnerGames / (scoreline.winnerGames + scoreline.loserGames);
    const closestShare = closest.winnerGames / (closest.winnerGames + closest.loserGames);

    return Math.abs(share - favoriteProbability) < Math.abs(closestShare - favoriteProbability)
      ? scoreline
      : closest;
  });
}

function getTeamPlayers(match: Match, team: 'TEAM_A' | 'TEAM_B') {
  return match.players
    .filter((player) => player.team === team)
    .sort((a, b) => a.position - b.position);
}

function groupMatchesByDate(matches: Match[]) {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const dateKey = getDateKey(match.playedAt);
    const group = groups.get(dateKey);

    if (group) {
      group.push(match);
    } else {
      groups.set(dateKey, [match]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, groupMatches]) => ({
    dateKey,
    label: formatDateGroup(dateKey),
    matches: groupMatches,
  }));
}

function getDateKey(date: string) {
  const parsedDate = new Date(date);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateGroup(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  const todayKey = getDateKey(today.toISOString());
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  if (dateKey === todayKey) {
    return 'Hoje';
  }

  if (dateKey === getDateKey(yesterday.toISOString())) {
    return 'Ontem';
  }

  const isCurrentYear = date.getFullYear() === today.getFullYear();

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}

function getPlayerFirstName(player: MatchPlayer) {
  return resolveMemberName(player.groupMember).firstName;
}

function getPlayerFullName(player: MatchPlayer) {
  return resolveMemberName(player.groupMember).fullName;
}
