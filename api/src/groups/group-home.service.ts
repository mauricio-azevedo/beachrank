import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type {
  FeedItemType,
  GroupRankingProjectionStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

type GroupHomeSummaryRow = {
  groupId: string;
  membersCount: number;
  leaders: unknown;
  lastRelevantAt: Date | null;
  projectionStatus: GroupRankingProjectionStatus | null;
  lastProcessedAt: Date | null;
  lastError: string | null;
};

type GroupHomeLeader = {
  groupMemberId: string;
  userId: string | null;
  displayName: string;
  rating: number;
  rank: number;
};

type LastRelevantActivity = {
  id: string;
  type: FeedItemType;
  occurredAt: Date;
  importanceScore: number;
  metadata: unknown;
};

@Injectable()
export class GroupHomeService {
  constructor(private readonly prisma: PrismaService) {}

  async findHomeGroups(userId?: string) {
    if (!userId) {
      return this.findPublicSuggestions(null);
    }

    const memberships = await this.prisma.groupMember.findMany({
      where: {
        userId,
        leftAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        groupId: true,
        role: true,
        rating: true,
        currentRank: true,
        createdAt: true,
        updatedAt: true,
        rankingMovements: {
          where: {
            isVisible: true,
            invalidatedAt: null,
          },
          orderBy: [{ occurredAt: 'desc' }],
          take: 1,
          select: {
            direction: true,
            positions: true,
            previousRank: true,
            currentRank: true,
            previousRating: true,
            currentRating: true,
            matchId: true,
            occurredAt: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (memberships.length === 0) {
      return this.findPublicSuggestions(userId);
    }

    const groupIds = memberships.map((membership) => membership.groupId);
    const [summaries, activities, matchStats] = await Promise.all([
      this.findSummaries(groupIds),
      this.findLastRelevantActivities(groupIds, 'member'),
      this.findMatchStats(groupIds),
    ]);

    return memberships
      .map((membership) => {
        const summary = summaries.get(membership.groupId) ?? null;
        const activity = activities.get(membership.groupId) ?? null;
        const stats = matchStats.get(membership.groupId) ?? null;

        return {
          relationship: 'MEMBER' as const,
          sortReason: this.getMemberSortReason(summary),
          group: {
            ...membership.group,
            membersCount: summary?.membersCount ?? 0,
            matchesCount: stats?.matchesCount ?? 0,
            lastMatchAt: stats?.lastMatchAt ?? null,
          },
          currentUser: {
            membershipId: membership.id,
            role: membership.role,
            standing: this.buildStanding(membership),
          },
          leaders: this.parseLeaders(summary?.leaders),
          activity: {
            lastRelevant: activity,
            lastRelevantAt:
              summary?.lastRelevantAt ?? activity?.occurredAt ?? null,
          },
          projection: summary
            ? {
                status: summary.projectionStatus,
                lastProcessedAt: summary.lastProcessedAt,
                lastError: summary.lastError,
              }
            : null,
        };
      })
      .sort((a, b) => this.compareHomeCards(a, b));
  }

  async findAllGroups(userId?: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        visibility: 'PUBLIC',
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const groupIds = groups.map((group) => group.id);

    const memberships = userId
      ? await this.prisma.groupMember.findMany({
          where: {
            userId,
            leftAt: null,
            groupId: { in: groupIds },
          },
          select: {
            id: true,
            groupId: true,
            role: true,
            rating: true,
            currentRank: true,
            rankingMovements: {
              where: {
                isVisible: true,
                invalidatedAt: null,
              },
              orderBy: [{ occurredAt: 'desc' }],
              take: 1,
              select: {
                direction: true,
                positions: true,
                previousRank: true,
                currentRank: true,
                previousRating: true,
                currentRating: true,
                matchId: true,
                occurredAt: true,
              },
            },
          },
        })
      : [];
    const membershipByGroup = new Map(
      memberships.map((membership) => [membership.groupId, membership]),
    );

    const [summaries, activities, matchStats] = await Promise.all([
      this.findSummaries(groupIds),
      this.findLastRelevantActivities(groupIds, 'public'),
      this.findMatchStats(groupIds),
    ]);

    return groups
      .map((group) => {
        const summary = summaries.get(group.id) ?? null;
        const activity = activities.get(group.id) ?? null;
        const stats = matchStats.get(group.id) ?? null;
        const membership = membershipByGroup.get(group.id) ?? null;

        return {
          relationship: membership
            ? ('MEMBER' as const)
            : ('PUBLIC_SUGGESTION' as const),
          sortReason: 'PUBLIC_SUGGESTION' as const,
          group: {
            ...group,
            membersCount: summary?.membersCount ?? 0,
            matchesCount: stats?.matchesCount ?? 0,
            lastMatchAt: stats?.lastMatchAt ?? null,
          },
          currentUser: membership
            ? {
                membershipId: membership.id,
                role: membership.role,
                standing: this.buildStanding(membership),
              }
            : null,
          leaders: this.parseLeaders(summary?.leaders),
          activity: {
            lastRelevant: activity,
            lastRelevantAt: activity?.occurredAt ?? null,
          },
          projection: null,
        };
      })
      .sort((a, b) => this.comparePublicCards(a, b));
  }

  private async findPublicSuggestions(userId: string | null) {
    const excludedGroupIds = userId
      ? (
          await this.prisma.groupMember.findMany({
            where: {
              userId,
              leftAt: null,
            },
            select: {
              groupId: true,
            },
          })
        ).map((membership) => membership.groupId)
      : [];

    const groups = await this.prisma.group.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(excludedGroupIds.length > 0
          ? {
              id: {
                notIn: excludedGroupIds,
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const groupIds = groups.map((group) => group.id);
    const [summaries, activities, matchStats] = await Promise.all([
      this.findSummaries(groupIds),
      this.findLastRelevantActivities(groupIds, 'public'),
      this.findMatchStats(groupIds),
    ]);

    return groups
      .map((group) => {
        const summary = summaries.get(group.id) ?? null;
        const activity = activities.get(group.id) ?? null;
        const stats = matchStats.get(group.id) ?? null;

        return {
          relationship: 'PUBLIC_SUGGESTION' as const,
          sortReason: 'PUBLIC_SUGGESTION' as const,
          group: {
            ...group,
            membersCount: summary?.membersCount ?? 0,
            matchesCount: stats?.matchesCount ?? 0,
            lastMatchAt: stats?.lastMatchAt ?? null,
          },
          currentUser: null,
          leaders: this.parseLeaders(summary?.leaders),
          activity: {
            lastRelevant: activity,
            lastRelevantAt: activity?.occurredAt ?? null,
          },
          projection: null,
        };
      })
      .sort((a, b) => this.comparePublicCards(a, b));
  }

  private async findSummaries(groupIds: string[]) {
    if (groupIds.length === 0) {
      return new Map<string, GroupHomeSummaryRow>();
    }

    const rows = await this.prisma.$queryRaw<GroupHomeSummaryRow[]>`
      SELECT
        "groupId",
        "membersCount",
        "leaders",
        "lastRelevantAt",
        "projectionStatus",
        "lastProcessedAt",
        "lastError"
      FROM "GroupHomeSummary"
      WHERE "groupId" IN (${Prisma.join(groupIds)})
    `;

    return new Map(rows.map((row) => [row.groupId, row]));
  }

  private async findMatchStats(groupIds: string[]) {
    if (groupIds.length === 0) {
      return new Map<
        string,
        { matchesCount: number; lastMatchAt: Date | null }
      >();
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ groupId: string; matchesCount: number; lastMatchAt: Date | null }>
    >`
      SELECT
        "groupId",
        COUNT(*)::int AS "matchesCount",
        MAX("playedAt") AS "lastMatchAt"
      FROM "Match"
      WHERE "groupId" IN (${Prisma.join(groupIds)})
        AND "deletedAt" IS NULL
      GROUP BY "groupId"
    `;

    return new Map(
      rows.map((row) => [
        row.groupId,
        { matchesCount: row.matchesCount, lastMatchAt: row.lastMatchAt },
      ]),
    );
  }

  private async findLastRelevantActivities(
    groupIds: string[],
    audience: 'member' | 'public',
  ) {
    if (groupIds.length === 0) {
      return new Map<string, LastRelevantActivity>();
    }

    const visibilityFilter =
      audience === 'member'
        ? Prisma.sql`AND "visibility" IN ('GROUP_MEMBERS', 'SOCIAL_CIRCLE', 'PUBLIC')`
        : Prisma.sql`AND "visibility" = 'PUBLIC'`;

    const rows = await this.prisma.$queryRaw<
      Array<LastRelevantActivity & { groupId: string }>
    >`
      SELECT DISTINCT ON ("groupId")
        "groupId",
        "id",
        "type",
        "occurredAt",
        "importanceScore",
        "metadata"
      FROM "FeedItem"
      WHERE "groupId" IN (${Prisma.join(groupIds)})
        AND "type" NOT IN ('MEMBER_JOINED', 'GROUP_CREATED')
        ${visibilityFilter}
      ORDER BY "groupId", "occurredAt" DESC, "createdAt" DESC
    `;

    return new Map(rows.map((row) => [row.groupId, this.toActivity(row)]));
  }

  private toActivity(row: LastRelevantActivity) {
    return {
      id: row.id,
      type: row.type,
      occurredAt: row.occurredAt,
      importanceScore: row.importanceScore,
      metadata: row.metadata,
    };
  }

  private buildStanding(membership: {
    currentRank: number | null;
    rating: number;
    rankingMovements: Array<{
      direction: 'UP' | 'DOWN';
      positions: number;
      previousRank: number;
      currentRank: number;
      previousRating: number;
      currentRating: number;
      matchId: string;
      occurredAt: Date;
    }>;
  }) {
    if (!membership.currentRank) {
      return {
        kind: 'UNRANKED' as const,
        rating: membership.rating,
      };
    }

    const movement = membership.rankingMovements[0] ?? null;

    return {
      kind: 'RANKED' as const,
      rank: membership.currentRank,
      rating: membership.rating,
      rankingMovement: movement
        ? {
            direction: movement.direction,
            positions: movement.positions,
            previousRank: movement.previousRank,
            currentRank: movement.currentRank,
            previousRating: movement.previousRating,
            currentRating: movement.currentRating,
            sourceMatchId: movement.matchId,
            occurredAt: movement.occurredAt,
          }
        : null,
    };
  }

  private parseLeaders(value: unknown): GroupHomeLeader[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((leader): leader is GroupHomeLeader => {
      if (!leader || typeof leader !== 'object') {
        return false;
      }

      const candidate = leader as Partial<GroupHomeLeader>;
      return (
        typeof candidate.groupMemberId === 'string' &&
        // userId is null for stub players (jogadores sem conta).
        (typeof candidate.userId === 'string' || candidate.userId === null) &&
        typeof candidate.displayName === 'string' &&
        typeof candidate.rating === 'number' &&
        typeof candidate.rank === 'number'
      );
    });
  }

  private getMemberSortReason(summary: GroupHomeSummaryRow | null) {
    if (
      summary?.projectionStatus === 'PROCESSING' ||
      summary?.projectionStatus === 'FAILED'
    ) {
      return summary.projectionStatus;
    }

    if (summary?.lastRelevantAt) {
      return 'RECENT_RELEVANT_ACTIVITY' as const;
    }

    return 'DEFAULT' as const;
  }

  private compareHomeCards(
    a: {
      sortReason: string;
      activity: { lastRelevantAt: Date | null };
      group: { updatedAt: Date };
    },
    b: {
      sortReason: string;
      activity: { lastRelevantAt: Date | null };
      group: { updatedAt: Date };
    },
  ) {
    const priority = new Map([
      ['FAILED', 5],
      ['PROCESSING', 4],
      ['RECENT_RELEVANT_ACTIVITY', 3],
      ['DEFAULT', 1],
    ]);
    const priorityComparison =
      (priority.get(b.sortReason) ?? 0) - (priority.get(a.sortReason) ?? 0);

    if (priorityComparison !== 0) {
      return priorityComparison;
    }

    return (
      this.getTime(b.activity.lastRelevantAt ?? b.group.updatedAt) -
      this.getTime(a.activity.lastRelevantAt ?? a.group.updatedAt)
    );
  }

  private comparePublicCards(
    a: {
      group: { membersCount: number; createdAt: Date };
      activity: { lastRelevantAt: Date | null };
    },
    b: {
      group: { membersCount: number; createdAt: Date };
      activity: { lastRelevantAt: Date | null };
    },
  ) {
    const activityComparison =
      this.getTime(b.activity.lastRelevantAt) -
      this.getTime(a.activity.lastRelevantAt);

    if (activityComparison !== 0) {
      return activityComparison;
    }

    const memberComparison = b.group.membersCount - a.group.membersCount;

    if (memberComparison !== 0) {
      return memberComparison;
    }

    return this.getTime(b.group.createdAt) - this.getTime(a.group.createdAt);
  }

  private getTime(value: Date | null) {
    return value ? value.getTime() : 0;
  }
}
