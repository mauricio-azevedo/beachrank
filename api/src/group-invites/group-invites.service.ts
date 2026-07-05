import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Prisma } from '../generated/prisma/client';
import { GroupMemberRole, NotificationType } from '../generated/prisma/enums';
import { API_ERROR_CODES, codedBadRequest } from '../common/api-errors';
import {
  MEMBER_USER_SELECT,
  resolveMemberDisplayName,
} from '../common/member-display-name';
import { PrismaService } from '../prisma/prisma.service';
import { FeedOrchestratorService } from '../feed/feed-orchestrator.service';
import { GroupHomeSummaryService } from '../groups/group-home-summary.service';
import { ClaimService } from '../claims/claim.service';
import { NotificationWriterService } from '../notifications/notification-writer.service';
import { guestTakenOverNotificationData } from './guest-taken-over-notification';

@Injectable()
export class GroupInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedOrchestrator: FeedOrchestratorService,
    private readonly groupHomeSummary: GroupHomeSummaryService,
    private readonly claims: ClaimService,
    private readonly notifications: NotificationWriterService,
  ) {}

  // The group's invite. No target = an "open" invite (the group link: the opener
  // self-identifies against the roster). A target = a "closed" invite addressed to one
  // guest (deep-links straight to that guest's recognition). Both are admin-only.
  async create(
    groupId: string,
    body: {
      createdById: string;
      maxUses?: number;
      expiresAt?: string;
      targetGroupMemberId?: string;
    },
  ) {
    if (!body.createdById) {
      throw new BadRequestException('Creator is required');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const creatorMembership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: body.createdById,
        },
      },
    });

    if (!creatorMembership || creatorMembership.leftAt) {
      throw new ForbiddenException('User is not a member of this group');
    }

    if (creatorMembership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group admins can create invites');
    }

    // A closed invite must target an unclaimed guest still in this group.
    if (body.targetGroupMemberId) {
      const target = await this.prisma.groupMember.findUnique({
        where: { id_groupId: { id: body.targetGroupMemberId, groupId } },
        select: { userId: true, leftAt: true },
      });

      if (!target || target.leftAt) {
        throw new NotFoundException('Convidado não encontrado');
      }

      if (target.userId !== null) {
        throw codedBadRequest(
          API_ERROR_CODES.GUEST_ALREADY_CLAIMED,
          'Esse jogador já tem uma conta',
        );
      }
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt');
    }

    if (body.maxUses !== undefined && body.maxUses <= 0) {
      throw new BadRequestException('maxUses must be greater than zero');
    }

    const token = randomBytes(24).toString('hex');
    const targetGroupMemberId = body.targetGroupMemberId ?? null;

    // A plain request (no expiry, no usage cap) reuses the active invite for the same
    // target instead of minting a new one: the link stays stable across sheet opens and
    // across admins, and rows don't pile up. Explicit options always mint a fresh invite.
    // An advisory lock serializes concurrent plain creates per (group, target), so
    // simultaneous requests converge on one row instead of racing past the lookup.
    if (body.maxUses === undefined && !body.expiresAt) {
      const lockKey = `invite:${groupId}:${targetGroupMemberId ?? ''}`;

      const invite = await this.prisma.$transaction(async (tx) => {
        // $executeRaw: the lock function returns `void`, which $queryRaw can't deserialize.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const existing = await tx.groupInvite.findFirst({
          where: {
            groupId,
            targetGroupMemberId,
            revokedAt: null,
            expiresAt: null,
            maxUses: null,
          },
          // id breaks createdAt ties (legacy data may hold several plain invites),
          // so "the newest" is deterministic and the shared link never flaps.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        if (existing) {
          return existing;
        }

        return tx.groupInvite.create({
          data: {
            groupId,
            createdById: body.createdById,
            token,
            maxUses: null,
            expiresAt: null,
            targetGroupMemberId,
          },
        });
      });

      return {
        ...invite,
        path: `/invites/${invite.token}`,
      };
    }

    // Bare row on purpose: the sheet reads only `path`, and echoing relations here
    // would ship the (possibly other) creator's account data as dead payload.
    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        createdById: body.createdById,
        token,
        maxUses: body.maxUses ?? null,
        expiresAt,
        targetGroupMemberId,
      },
    });

    return {
      ...invite,
      path: `/invites/${invite.token}`,
    };
  }

  private async loadValidInvite(token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                matches: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            ...MEMBER_USER_SELECT,
            email: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.revokedAt) {
      throw new BadRequestException('Invite was revoked');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new BadRequestException('Invite has reached the usage limit');
    }

    return invite;
  }

  // Open invite → the group's unclaimed guests (name + avatar seed only, no history).
  // Closed invite → the target guest's recognition summary. A closed invite whose target
  // was already taken over (or left) degrades to open with `targetUnavailable`, so the
  // opener still has a way in.
  async findByToken(token: string) {
    const invite = await this.loadValidInvite(token);

    if (!invite.targetGroupMemberId) {
      return {
        ...invite,
        kind: 'OPEN' as const,
        guests: await this.listUnclaimedGuests(invite.groupId),
      };
    }

    const target = await this.loadClaimableGuest(
      invite.groupId,
      invite.targetGroupMemberId,
    );

    if (!target) {
      return {
        ...invite,
        kind: 'OPEN' as const,
        targetUnavailable: true,
        guests: await this.listUnclaimedGuests(invite.groupId),
      };
    }

    return {
      ...invite,
      kind: 'CLOSED' as const,
      target: await this.claims.getStubClaimSummary(target),
    };
  }

  private async listUnclaimedGuests(groupId: string) {
    const guests = await this.prisma.groupMember.findMany({
      where: { groupId, userId: null, leftAt: null },
      orderBy: [{ displayName: 'asc' }],
      select: { id: true, displayName: true },
    });

    if (guests.length === 0) {
      return [];
    }

    // One grouped count of each guest's non-deleted matches, so a roster row can show
    // "N jogos" without a per-guest call. Guests with no matches are absent → 0.
    const counts = await this.prisma.matchPlayer.groupBy({
      by: ['groupMemberId'],
      where: {
        groupId,
        groupMemberId: { in: guests.map((guest) => guest.id) },
        match: { deletedAt: null },
      },
      _count: { _all: true },
    });
    const matchCountById = new Map(
      counts.map((row) => [row.groupMemberId, row._count._all]),
    );

    return guests.map((guest) => ({
      groupMemberId: guest.id,
      displayName: guest.displayName ?? '',
      matchesCount: matchCountById.get(guest.id) ?? 0,
    }));
  }

  // A guest that can still be taken over in this group: no account, still active. Returns
  // the shape getStubClaimSummary needs, or null when it isn't claimable anymore.
  private async loadClaimableGuest(groupId: string, guestId: string) {
    const guest = await this.prisma.groupMember.findUnique({
      where: { id_groupId: { id: guestId, groupId } },
      select: {
        id: true,
        displayName: true,
        rating: true,
        currentRank: true,
        userId: true,
        leftAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return guest && guest.userId === null && !guest.leftAt ? guest : null;
  }

  async accept(groupId: string, token: string, body: { userId: string }) {
    if (!body.userId) {
      throw new BadRequestException('User is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: true,
      },
    });

    if (!invite || invite.groupId !== groupId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.revokedAt) {
      throw new BadRequestException('Invite was revoked');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new BadRequestException('Invite has reached the usage limit');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingMembership = await tx.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: body.userId,
          },
        },
      });

      const membership =
        existingMembership && !existingMembership.leftAt
          ? existingMembership
          : existingMembership
            ? await tx.groupMember.update({
                where: { id: existingMembership.id },
                data: {
                  leftAt: null,
                },
              })
            : await tx.groupMember.create({
                data: {
                  groupId,
                  userId: body.userId,
                },
              });

      const didJoinGroup =
        !existingMembership || existingMembership.leftAt !== null;

      if (didJoinGroup) {
        await tx.groupInvite.update({
          where: { id: invite.id },
          data: {
            uses: { increment: 1 },
          },
        });

        await this.feedOrchestrator.createMemberJoinedItem(
          {
            groupId,
            displayName: resolveMemberDisplayName({ user }),
            actorUserId: user.id,
            actorGroupMemberId: membership.id,
            occurredAt: new Date(),
          },
          tx,
        );
      }

      await this.groupHomeSummary.syncGroupSummary(groupId, tx);

      return this.claims.findMembershipResponse(tx, membership.id);
    });
  }

  async acceptByToken(token: string, body: { userId: string }) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      select: {
        groupId: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return this.accept(invite.groupId, token, body);
  }

  // The recognition payload for a guest picked from the open list (the closed invite
  // already carries its target's summary in findByToken). Public: the token is the auth.
  async getGuestSummary(token: string, guestId: string) {
    const invite = await this.loadValidInvite(token);
    this.assertGuestAllowed(invite, guestId);

    const guest = await this.loadClaimableGuest(invite.groupId, guestId);

    if (!guest) {
      throw new NotFoundException('Esse perfil já foi assumido.');
    }

    return this.claims.getStubClaimSummary(guest);
  }

  // Take over a guest via an invite — the open-list pick or the closed link's target. The
  // shared core (performClaim) handles the simple claim and the already-a-member merge,
  // and refuses when the two ever shared a match.
  async claimGuest(token: string, guestId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invite = await this.loadValidInvite(token);
    this.assertGuestAllowed(invite, guestId);

    return this.prisma.$transaction(async (tx) => {
      const guest = await tx.groupMember.findUnique({
        where: { id_groupId: { id: guestId, groupId: invite.groupId } },
        select: {
          id: true,
          displayName: true,
          userId: true,
          leftAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });

      if (!guest || guest.leftAt) {
        throw new NotFoundException('Convidado não encontrado');
      }

      if (guest.userId !== null) {
        throw new BadRequestException('Este perfil já foi assumido.');
      }

      const result = await this.claims.performClaim(
        tx,
        invite.groupId,
        guest,
        user,
      );

      if (result.outcome === 'CLAIMED') {
        await this.notifyGuestTakenOver(
          tx,
          invite.groupId,
          user,
          result.membership?.id ?? null,
        );
      }

      return result;
    });
  }

  // Informs the group's admins that a guest was taken over via an invite — best-effort
  // awareness (and the V2 revert hook). Never the taker themselves; skipped when there
  // are no other admins.
  private async notifyGuestTakenOver(
    tx: Prisma.TransactionClient,
    groupId: string,
    user: { id: string; firstName: string; lastName: string },
    membershipId: string | null,
  ) {
    const [group, admins] = await Promise.all([
      tx.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      tx.groupMember.findMany({
        where: {
          groupId,
          role: GroupMemberRole.ADMIN,
          leftAt: null,
          userId: { not: null },
        },
        select: { userId: true },
      }),
    ]);

    const recipients = admins
      .map((admin) => admin.userId)
      .filter((id): id is string => id !== null && id !== user.id);

    if (recipients.length === 0) {
      return;
    }

    const data = guestTakenOverNotificationData(
      resolveMemberDisplayName({ user }),
      group?.name ?? '',
    );

    await this.notifications.createMany(
      recipients.map((recipientUserId) => ({
        type: NotificationType.GUEST_TAKEN_OVER,
        recipientUserId,
        groupId,
        actorUserId: user.id,
        targetGroupMemberId: membershipId,
        data,
      })),
      tx,
    );
  }

  // A closed invite (with a target) can only take over its own guest; an open invite has
  // no target and accepts any unclaimed guest in the group.
  private assertGuestAllowed(
    invite: { targetGroupMemberId: string | null },
    guestId: string,
  ) {
    if (invite.targetGroupMemberId && invite.targetGroupMemberId !== guestId) {
      throw new ForbiddenException('Este convite é de outro jogador.');
    }
  }
}
