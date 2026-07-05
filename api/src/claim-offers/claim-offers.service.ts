import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { API_ERROR_CODES, codedBadRequest } from '../common/api-errors';
import { Prisma } from '../generated/prisma/client';
import {
  ClaimEmailStatus,
  GroupMemberRole,
  NotificationType,
} from '../generated/prisma/enums';
import {
  MEMBER_USER_SELECT,
  resolveMemberDisplayName,
} from '../common/member-display-name';
import { requireGroupAdmin } from '../common/require-group-admin';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimService } from '../claims/claim.service';
import { NotificationWriterService } from '../notifications/notification-writer.service';
import type {
  ClaimEmailState,
  ClaimOfferDetail,
} from './types/claim-offer.types';
import { claimOfferNotificationData } from './claim-offer-notification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email-anchored claim: an admin attaches an email to a stub; the account that owns (or
// later registers) that email is offered the stub's history to confirm. The email value
// itself is the auth nonce — editing it invalidates any outstanding confirm.
@Injectable()
export class ClaimOffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claims: ClaimService,
    private readonly notifications: NotificationWriterService,
  ) {}

  // --- Admin side -----------------------------------------------------------------

  async setClaimEmail(
    groupId: string,
    stubId: string,
    adminUserId: string,
    rawEmail: string | undefined,
  ): Promise<ClaimEmailState> {
    await requireGroupAdmin(this.prisma, groupId, adminUserId);

    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException('Email inválido');
    }

    const stub = await this.prisma.groupMember.findFirst({
      where: { id: stubId, groupId },
      select: {
        id: true,
        userId: true,
        leftAt: true,
        claimEmail: true,
        claimEmailStatus: true,
        claimEmailNotifiedAt: true,
      },
    });
    if (!stub || stub.leftAt) {
      throw new NotFoundException('Perfil não encontrado');
    }
    if (stub.userId !== null) {
      throw codedBadRequest(
        API_ERROR_CODES.GUEST_ALREADY_CLAIMED,
        'Esse perfil já tem uma conta.',
      );
    }

    // The account this email points at (if any) and the "one email per stub" clash are
    // independent reads — run them together.
    const [user, clash] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.groupMember.findFirst({
        where: { groupId, claimEmail: email, id: { not: stub.id } },
        select: { id: true },
      }),
    ]);

    // If the email belongs to a member who shared a match with the stub, the claim could
    // never succeed — block now (set-time conflict), ahead of the clash check.
    if (user) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
        select: { id: true },
      });
      if (membership) {
        const shared = await this.claims.findSharedMatches(
          this.prisma,
          groupId,
          stub.id,
          membership.id,
        );
        if (shared.length > 0) {
          throw new BadRequestException(
            'Esse email é de alguém que já jogou com/contra esse perfil — não dá pra vincular.',
          );
        }
      }
    }

    if (clash) {
      throw new BadRequestException(
        'Esse email já está vinculado a outro perfil neste grupo.',
      );
    }

    // Re-setting the same still-pending email keeps notifiedAt (idempotent, no re-notify);
    // any other transition issues a fresh offer.
    const samePending =
      stub.claimEmail === email &&
      stub.claimEmailStatus === ClaimEmailStatus.PENDING;
    const keptNotifiedAt = samePending ? stub.claimEmailNotifiedAt : null;
    const willNotify = user !== null && keptNotifiedAt === null;
    const notifiedAt = willNotify ? new Date() : keptNotifiedAt;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Changing the anchored email supersedes any prior offer — retire its notification
        // before issuing the new one (a no-op when the email is unchanged).
        if (!samePending) {
          await this.notifications.markActedByTarget(
            NotificationType.CLAIM_OFFER,
            stub.id,
            tx,
          );
        }

        await tx.groupMember.update({
          where: { id: stub.id },
          data: {
            claimEmail: email,
            claimEmailStatus: ClaimEmailStatus.PENDING,
            claimEmailNotifiedAt: notifiedAt,
          },
        });

        if (user && willNotify) {
          await this.notifyOffer(tx, user.id, stub.id);
        }

        return {
          email,
          status: ClaimEmailStatus.PENDING,
          notified: notifiedAt !== null,
          accountExists: user !== null,
        };
      });
    } catch (error) {
      // A concurrent set of the same email to another stub races past the clash pre-check
      // and trips @@unique([groupId, claimEmail]) — surface the clean message, not a 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Esse email já está vinculado a outro perfil neste grupo.',
        );
      }
      throw error;
    }
  }

  async clearClaimEmail(
    groupId: string,
    stubId: string,
    adminUserId: string,
  ): Promise<ClaimEmailState> {
    await requireGroupAdmin(this.prisma, groupId, adminUserId);

    const stub = await this.prisma.groupMember.findFirst({
      where: { id: stubId, groupId },
      select: { id: true },
    });
    if (!stub) {
      throw new NotFoundException('Perfil não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.notifications.markActedByTarget(
        NotificationType.CLAIM_OFFER,
        stub.id,
        tx,
      );
      await tx.groupMember.update({
        where: { id: stub.id },
        data: {
          claimEmail: null,
          claimEmailStatus: null,
          claimEmailNotifiedAt: null,
        },
      });
    });

    return { email: null, status: null, notified: false, accountExists: false };
  }

  async getClaimEmailState(
    groupId: string,
    stubId: string,
    adminUserId: string,
  ): Promise<ClaimEmailState> {
    await requireGroupAdmin(this.prisma, groupId, adminUserId);

    const stub = await this.prisma.groupMember.findFirst({
      where: { id: stubId, groupId },
      select: {
        claimEmail: true,
        claimEmailStatus: true,
        claimEmailNotifiedAt: true,
      },
    });
    if (!stub) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const accountExists = stub.claimEmail
      ? (await this.prisma.user.findUnique({
          where: { email: stub.claimEmail },
          select: { id: true },
        })) !== null
      : false;

    return {
      email: stub.claimEmail,
      status: stub.claimEmailStatus,
      notified: stub.claimEmailNotifiedAt !== null,
      accountExists,
    };
  }

  // --- Offer recipient side -------------------------------------------------------

  // Throws the shared "not available" 404 unless the stub exists and the viewer owns it
  // (email match) — the same response for gone vs not-yours, never revealing which.
  private assertOwnedStub<T extends { claimEmail: string | null }>(
    stub: T | null,
    viewerEmail: string,
  ): asserts stub is T {
    if (!stub || stub.claimEmail !== viewerEmail) {
      throw new NotFoundException('Esse perfil não está mais disponível.');
    }
  }

  async getOffer(
    stubId: string,
    viewerUserId: string,
  ): Promise<ClaimOfferDetail> {
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { email: true },
    });
    if (!viewer) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const stub = await this.prisma.groupMember.findFirst({
      where: {
        id: stubId,
        userId: null,
        claimEmailStatus: ClaimEmailStatus.PENDING,
      },
      select: {
        id: true,
        groupId: true,
        displayName: true,
        rating: true,
        currentRank: true,
        claimEmail: true,
        user: { select: MEMBER_USER_SELECT },
        group: { select: { name: true } },
      },
    });
    this.assertOwnedStub(stub, viewer.email);

    return {
      stubGroupMemberId: stub.id,
      groupId: stub.groupId,
      groupName: stub.group.name,
      stub: await this.claims.getStubClaimSummary(stub),
    };
  }

  async confirm(stubId: string, viewerUserId: string) {
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!viewer) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      const stub = await tx.groupMember.findFirst({
        where: {
          id: stubId,
          userId: null,
          claimEmailStatus: ClaimEmailStatus.PENDING,
        },
        select: {
          id: true,
          groupId: true,
          displayName: true,
          claimEmail: true,
          user: { select: MEMBER_USER_SELECT },
        },
      });
      this.assertOwnedStub(stub, viewer.email);

      const result = await this.claims.performClaim(
        tx,
        stub.groupId,
        stub,
        viewer,
      );

      // Either outcome resolves this person's offer — retire its inbox notification and
      // free the anchor on the (case-A) row; for a merge the row is already gone (0 rows).
      await this.notifications.markActedByTarget(
        NotificationType.CLAIM_OFFER,
        stub.id,
        tx,
      );
      await tx.groupMember.updateMany({
        where: { id: stub.id },
        data: {
          claimEmail: null,
          claimEmailStatus: null,
          claimEmailNotifiedAt: null,
        },
      });

      if (result.outcome === 'BLOCKED') {
        // Race: a shared match was logged after the email was set. The person sees the
        // conflict from the returned payload; tell the admins it couldn't be linked.
        await this.notifyAdmins(tx, stub.groupId, {
          title: `Não deu pra vincular ${resolveMemberDisplayName(stub)}`,
          body: 'A pessoa convidada e esse perfil jogaram a mesma partida, então não pode ser a mesma conta.',
          meta: 'conflito',
        });
      }

      return result;
    });
  }

  async decline(stubId: string, viewerUserId: string) {
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { email: true },
    });
    if (!viewer) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      const stub = await tx.groupMember.findFirst({
        where: {
          id: stubId,
          userId: null,
          claimEmailStatus: ClaimEmailStatus.PENDING,
        },
        select: {
          id: true,
          groupId: true,
          displayName: true,
          claimEmail: true,
          user: { select: MEMBER_USER_SELECT },
        },
      });
      this.assertOwnedStub(stub, viewer.email);

      // Keep the email (audit + don't re-notify); the admin is told and decides next.
      await tx.groupMember.update({
        where: { id: stub.id },
        data: { claimEmailStatus: ClaimEmailStatus.DECLINED },
      });
      await this.notifications.markActedByTarget(
        NotificationType.CLAIM_OFFER,
        stub.id,
        tx,
      );
      await this.notifyAdmins(tx, stub.groupId, {
        title: `${resolveMemberDisplayName(stub)} não foi reconhecido`,
        body: 'A pessoa que você convidou disse que não é esse perfil.',
        meta: 'recusado',
      });

      return { outcome: 'DECLINED' as const };
    });
  }

  // --- Notifications --------------------------------------------------------------

  private async notifyOffer(
    tx: Prisma.TransactionClient,
    recipientUserId: string,
    stubId: string,
  ) {
    const stub = await tx.groupMember.findUnique({
      where: { id: stubId },
      select: {
        group: { select: { id: true, name: true } },
      },
    });
    if (!stub) return;

    await this.notifications.create(
      {
        type: NotificationType.CLAIM_OFFER,
        recipientUserId,
        groupId: stub.group.id,
        targetGroupMemberId: stubId,
        data: claimOfferNotificationData(stubId, stub.group.name),
      },
      tx,
    );
  }

  private async notifyAdmins(
    tx: Prisma.TransactionClient,
    groupId: string,
    data: { title: string; body: string; meta: string },
  ) {
    const admins = await tx.groupMember.findMany({
      where: {
        groupId,
        role: GroupMemberRole.ADMIN,
        leftAt: null,
        userId: { not: null },
      },
      select: { userId: true },
    });

    await this.notifications.createMany(
      admins.map((admin) => ({
        type: NotificationType.CLAIM_OFFER_DECLINED,
        recipientUserId: admin.userId as string,
        groupId,
        data,
      })),
      tx,
    );
  }
}
