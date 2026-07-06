import { MEMBER_USER_SELECT } from '../common/member-display-name';
import {
  isAvatarColorKey,
  pickDefaultAvatarColor,
} from '../common/avatar-color';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupMemberRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { FeedOrchestratorService } from '../feed/feed-orchestrator.service';
import { GroupHomeSummaryService } from './group-home-summary.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedOrchestrator: FeedOrchestratorService,
    private readonly groupHomeSummary: GroupHomeSummaryService,
  ) {}

  async create(body: {
    name: string;
    description?: string;
    avatarColor?: string;
    createdById: string;
  }) {
    const name = body.name?.trim();

    if (!name) {
      throw new BadRequestException('Group name is required');
    }

    if (!body.createdById) {
      throw new BadRequestException('Group creator is required');
    }

    // A chosen colour must be a known palette key; an omitted one falls back to a
    // deterministic varied default (seeded by the name) so groups aren't all blue.
    const avatarColor = this.resolveAvatarColor(body.avatarColor, name);

    const creator = await this.prisma.user.findUnique({
      where: { id: body.createdById },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          description: body.description?.trim() || null,
          avatarColor,
          createdById: body.createdById,
        },
      });

      const membership = await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: body.createdById,
          role: GroupMemberRole.ADMIN,
        },
      });

      await this.feedOrchestrator.createGroupCreatedItem(
        {
          groupId: group.id,
          groupName: group.name,
          actorUserId: creator.id,
          actorGroupMemberId: membership.id,
          occurredAt: group.createdAt,
        },
        tx,
      );

      await this.groupHomeSummary.syncGroupSummary(group.id, tx);

      return tx.group.findUnique({
        where: { id: group.id },
        include: {
          createdBy: {
            select: {
              id: true,
              ...MEMBER_USER_SELECT,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              matches: true,
            },
          },
        },
      });
    });
  }

  private resolveAvatarColor(value: string | undefined, seed: string): string {
    if (value === undefined) {
      return pickDefaultAvatarColor(seed);
    }

    const normalized = value.trim();
    if (!isAvatarColorKey(normalized)) {
      throw new BadRequestException('Invalid avatar color');
    }

    return normalized;
  }

  findAll() {
    return this.prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            matches: true,
          },
        },
      },
    });
  }

  async findOne(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: {
            id: true,
            ...MEMBER_USER_SELECT,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            matches: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }
}
