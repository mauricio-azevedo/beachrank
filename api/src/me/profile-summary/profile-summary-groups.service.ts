import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProfileSummaryGroup } from '../types/profile-summary-group.type';

@Injectable()
export class ProfileSummaryGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecentGroups(userId: string): Promise<ProfileSummaryGroup[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: {
        userId,
        leftAt: null,
      },
      include: {
        group: true,
        matchPlayers: {
          where: {
            match: { deletedAt: null },
          },
          orderBy: [{ playedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: {
            playedAt: true,
            rankDelta: true,
            match: {
              select: {
                processingStatus: true,
              },
            },
          },
        },
      },
    });

    const membersCountByGroup = await this.countActiveMembers(
      memberships.map((membership) => membership.groupId),
    );

    return (
      memberships
        .map((membership) => {
          const lastMatch = membership.matchPlayers[0];

          return {
            id: membership.group.id,
            name: membership.group.name,
            description: membership.group.description,
            avatarColor: membership.group.avatarColor,
            rating: membership.rating,
            role: membership.role,
            lastPlayedAt: lastMatch?.playedAt ?? null,
            currentRank: membership.currentRank,
            membersCount: membersCountByGroup.get(membership.groupId) ?? 0,
            // Only trust the delta once the latest match has been projected.
            rankDelta:
              lastMatch?.match.processingStatus === 'PROCESSED'
                ? (lastMatch.rankDelta ?? null)
                : null,
          };
        })
        // Most recently played first; never-played groups (null) sort last.
        .sort(
          (a, b) =>
            (b.lastPlayedAt?.getTime() ?? 0) - (a.lastPlayedAt?.getTime() ?? 0),
        )
    );
  }

  private async countActiveMembers(
    groupIds: string[],
  ): Promise<Map<string, number>> {
    if (groupIds.length === 0) {
      return new Map();
    }

    const counts = await this.prisma.groupMember.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: groupIds },
        leftAt: null,
      },
      _count: { _all: true },
    });

    return new Map(counts.map((row) => [row.groupId, row._count._all]));
  }
}
