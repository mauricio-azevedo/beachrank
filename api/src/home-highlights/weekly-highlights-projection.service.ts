import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { HighlightType, MatchTeam } from '../generated/prisma/enums';
import { structuredLog } from '../observability/structured-log';

// Weekly Highlights — group-scoped derived read model (spec: docs/product/weekly-highlights.md).
// Full delete-and-rebuild per group, idempotent, run inside the GROUP cascade *after* the rating,
// ranking-movement and stats projections. The 7-day window is applied at read time via `anchorAt`;
// here we store, per (member, type), the single best recent candidate.

const INITIAL_RATING = 1000;
const WINDOW_DAYS = 7;
const STREAK_FLOOR = 3; // your-people floor; the Arena (stranger) bar is applied at read time
const CLIMB_FLOOR = 2; // a single-position climb isn't a story
const MILESTONE_THRESHOLDS = [10, 25, 50, 100];
const ALGORITHM_VERSION = 'WEEKLY_HIGHLIGHTS_V1';

// Ordering weights — tunable knobs (spec: "exact weights are an implementation detail").
// Leadership leads; a large enough streak/climb/milestone can still jump tiers.
const MILESTONE_TIER_SCORE: Record<number, number> = {
  10: 200,
  25: 320,
  50: 480,
  100: 700,
};

function scoreHighlight(type: HighlightType, value: number): number {
  switch (type) {
    case HighlightType.LEADERSHIP:
      return 900;
    case HighlightType.WIN_STREAK_RECORD:
      return 520 + value * 60;
    case HighlightType.WIN_STREAK_CURRENT:
      return 500 + value * 60;
    case HighlightType.CLIMB:
      return 300 + value * 50;
    case HighlightType.MILESTONE_WINS:
      return (MILESTONE_TIER_SCORE[value] ?? 0) + 40;
    case HighlightType.MILESTONE_MATCHES:
      return MILESTONE_TIER_SCORE[value] ?? 0;
    default:
      return 0;
  }
}

type MemberRow = { id: string; userId: string };

type MatchRow = {
  id: string;
  playedAt: Date;
  winnerTeam: MatchTeam | null;
  players: Array<{
    groupMemberId: string;
    team: MatchTeam;
    ratingAfter: number;
  }>;
};

type MatchResult = { at: Date; won: boolean };

type HighlightCandidate = {
  groupMemberId: string;
  userId: string;
  type: HighlightType;
  value: number;
  anchorAt: Date;
};

// Mirrors RatingProjectionService.buildRankingState: sort by rating desc, ties share a rank.
function buildRanking(
  ratingByMember: Map<string, number>,
): Map<string, number> {
  const sorted = [...ratingByMember.entries()]
    .map(([id, rating]) => ({ id, rating }))
    .sort((a, b) =>
      b.rating !== a.rating ? b.rating - a.rating : a.id.localeCompare(b.id),
    );

  const rankByMember = new Map<string, number>();
  let rank = 0;
  let previousRating: number | null = null;

  for (const member of sorted) {
    if (previousRating === null || member.rating !== previousRating) {
      rank += 1;
      previousRating = member.rating;
    }
    rankByMember.set(member.id, rank);
  }

  return rankByMember;
}

@Injectable()
export class WeeklyHighlightsProjectionService {
  private readonly logger = new Logger(WeeklyHighlightsProjectionService.name);

  async syncGroupHighlights(
    tx: Prisma.TransactionClient,
    groupId: string,
    now: Date = new Date(),
  ) {
    const startedAt = Date.now();
    const cutoff = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const members = (await tx.groupMember.findMany({
      // Stub players (null userId) have no personal home feed, so they never earn
      // weekly highlights — and GroupHighlight.userId is non-null.
      where: { groupId, leftAt: null, userId: { not: null } },
      select: { id: true, userId: true },
    })) as MemberRow[];
    const activeMemberIds = new Set(members.map((member) => member.id));

    const matches = (await tx.match.findMany({
      where: { groupId, deletedAt: null, winnerTeam: { not: null } },
      orderBy: [{ playedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        playedAt: true,
        winnerTeam: true,
        players: {
          select: { groupMemberId: true, team: true, ratingAfter: true },
        },
      },
    })) as MatchRow[];

    // --- Reconstruct the passive-inclusive rank timeline (no rating re-computation;
    // reuse the ratingAfter the rating projection already persisted this cascade). ---
    const ratingByMember = new Map<string, number>();
    for (const member of members) {
      ratingByMember.set(member.id, INITIAL_RATING);
    }

    const rankSeqByMember = new Map<
      string,
      Array<{ at: Date; rank: number }>
    >();
    const resultsByMember = new Map<string, MatchResult[]>();
    // Most recent match at which each member became the *sole* group leader.
    const leadershipAtByMember = new Map<string, Date>();
    let previousSoleLeader: string | null = null;

    for (const match of matches) {
      for (const player of match.players) {
        ratingByMember.set(player.groupMemberId, player.ratingAfter);
      }

      const ranking = buildRanking(ratingByMember);

      let leaderCount = 0;
      let soleLeaderCandidate: string | null = null;
      for (const [memberId, rank] of ranking) {
        let seq = rankSeqByMember.get(memberId);
        if (!seq) {
          seq = [];
          rankSeqByMember.set(memberId, seq);
        }
        seq.push({ at: match.playedAt, rank });

        if (rank === 1) {
          leaderCount += 1;
          soleLeaderCandidate = memberId;
        }
      }

      const soleLeader = leaderCount === 1 ? soleLeaderCandidate : null;
      // A new sole leader is a transition: someone is uniquely #1 and wasn't the sole #1 before.
      if (soleLeader && soleLeader !== previousSoleLeader) {
        leadershipAtByMember.set(soleLeader, match.playedAt);
      }
      previousSoleLeader = soleLeader;

      for (const player of match.players) {
        if (!activeMemberIds.has(player.groupMemberId)) {
          continue;
        }
        let results = resultsByMember.get(player.groupMemberId);
        if (!results) {
          results = [];
          resultsByMember.set(player.groupMemberId, results);
        }
        results.push({
          at: match.playedAt,
          won: match.winnerTeam === player.team,
        });
      }
    }

    // --- Build candidates per active member who has actually played. ---
    const candidates: HighlightCandidate[] = [];
    // The group's longest recent win run (single weekly record holder).
    let recordHolder: HighlightCandidate | null = null;

    for (const member of members) {
      const memberId = member.id;
      const userId = member.userId;
      const results = resultsByMember.get(memberId);
      if (!results || results.length === 0) {
        continue;
      }

      // WIN_STREAK_CURRENT — ongoing, still-alive run from the end.
      let currentStreak = 0;
      for (let i = results.length - 1; i >= 0; i -= 1) {
        if (!results[i].won) {
          break;
        }
        currentStreak += 1;
      }
      const lastMatchAt = results[results.length - 1].at;
      if (currentStreak >= STREAK_FLOOR && lastMatchAt >= cutoff) {
        candidates.push({
          groupMemberId: memberId,
          userId,
          type: HighlightType.WIN_STREAK_CURRENT,
          value: currentStreak,
          anchorAt: lastMatchAt,
        });
      }

      // Win runs (for the group record) + milestone crossings.
      let runLength = 0;
      let runLastWinAt: Date | null = null;
      let matchCount = 0;
      let winCount = 0;
      let lastMatchMilestone: { value: number; at: Date } | null = null;
      let lastWinMilestone: { value: number; at: Date } | null = null;

      const closeRun = () => {
        if (
          runLength >= STREAK_FLOOR &&
          runLastWinAt &&
          runLastWinAt >= cutoff &&
          (!recordHolder ||
            runLength > recordHolder.value ||
            (runLength === recordHolder.value &&
              runLastWinAt > recordHolder.anchorAt))
        ) {
          recordHolder = {
            groupMemberId: memberId,
            userId,
            type: HighlightType.WIN_STREAK_RECORD,
            value: runLength,
            anchorAt: runLastWinAt,
          };
        }
      };

      for (const result of results) {
        matchCount += 1;
        if (MILESTONE_THRESHOLDS.includes(matchCount)) {
          lastMatchMilestone = { value: matchCount, at: result.at };
        }

        if (result.won) {
          winCount += 1;
          if (MILESTONE_THRESHOLDS.includes(winCount)) {
            lastWinMilestone = { value: winCount, at: result.at };
          }
          runLength += 1;
          runLastWinAt = result.at;
        } else {
          closeRun();
          runLength = 0;
          runLastWinAt = null;
        }
      }
      closeRun();

      if (lastMatchMilestone && lastMatchMilestone.at >= cutoff) {
        candidates.push({
          groupMemberId: memberId,
          userId,
          type: HighlightType.MILESTONE_MATCHES,
          value: lastMatchMilestone.value,
          anchorAt: lastMatchMilestone.at,
        });
      }
      if (lastWinMilestone && lastWinMilestone.at >= cutoff) {
        candidates.push({
          groupMemberId: memberId,
          userId,
          type: HighlightType.MILESTONE_WINS,
          value: lastWinMilestone.value,
          anchorAt: lastWinMilestone.at,
        });
      }

      // CLIMB — biggest unbroken up-run whose last upward step is within the window
      // (high-water: a later fall doesn't erase it; passive moves count).
      const seq = rankSeqByMember.get(memberId) ?? [];
      let bestMagnitude = 0;
      let bestLastUpAt: Date | null = null;
      let runMagnitude = 0;
      let runLastUpAt: Date | null = null;

      const closeClimbRun = () => {
        if (
          runMagnitude >= CLIMB_FLOOR &&
          runLastUpAt &&
          runLastUpAt >= cutoff &&
          runMagnitude > bestMagnitude
        ) {
          bestMagnitude = runMagnitude;
          bestLastUpAt = runLastUpAt;
        }
      };

      for (let i = 1; i < seq.length; i += 1) {
        const delta = seq[i - 1].rank - seq[i].rank; // > 0 => moved up
        if (delta > 0) {
          runMagnitude += delta;
          runLastUpAt = seq[i].at;
        } else if (delta < 0) {
          closeClimbRun();
          runMagnitude = 0;
          runLastUpAt = null;
        }
        // delta === 0 (flat): keep the run open, neither extend nor break it.
      }
      closeClimbRun();

      if (bestMagnitude >= CLIMB_FLOOR && bestLastUpAt) {
        candidates.push({
          groupMemberId: memberId,
          userId,
          type: HighlightType.CLIMB,
          value: bestMagnitude,
          anchorAt: bestLastUpAt,
        });
      }

      // LEADERSHIP — most recent sole-#1 takeover within the window.
      const leadershipAt = leadershipAtByMember.get(memberId);
      if (leadershipAt && leadershipAt >= cutoff) {
        candidates.push({
          groupMemberId: memberId,
          userId,
          type: HighlightType.LEADERSHIP,
          value: 1,
          anchorAt: leadershipAt,
        });
      }
    }

    if (recordHolder) {
      candidates.push(recordHolder);
    }

    // --- Write (full rebuild for the group). ---
    const deleted = await tx.groupHighlight.deleteMany({ where: { groupId } });
    if (candidates.length > 0) {
      await tx.groupHighlight.createMany({
        data: candidates.map((candidate) => ({
          groupId,
          groupMemberId: candidate.groupMemberId,
          userId: candidate.userId,
          type: candidate.type,
          value: candidate.value,
          score: scoreHighlight(candidate.type, candidate.value),
          anchorAt: candidate.anchorAt,
          algorithmVersion: ALGORITHM_VERSION,
        })),
      });
    }

    this.logger.log(
      structuredLog('weekly_highlights_projection.completed', {
        groupId,
        membersCount: members.length,
        matchesCount: matches.length,
        candidatesCount: candidates.length,
        deletedCount: deleted.count,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
}
