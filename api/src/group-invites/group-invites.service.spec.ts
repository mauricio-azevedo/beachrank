import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroupInvitesService } from './group-invites.service';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { FeedOrchestratorService } from '../feed/feed-orchestrator.service';
import type { GroupHomeSummaryService } from '../groups/group-home-summary.service';
import type { ClaimService } from '../claims/claim.service';
import type { NotificationWriterService } from '../notifications/notification-writer.service';

type PrismaMock = {
  group: { findUnique: jest.Mock };
  groupMember: { findUnique: jest.Mock };
  groupInvite: { findFirst: jest.Mock; create: jest.Mock };
};

// The partial unique index throws this on a lost plain-mint race.
function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function buildService() {
  // Plain creates read optimistically then INSERT — no transaction, no advisory lock.
  const prisma: PrismaMock = {
    group: { findUnique: jest.fn() },
    groupMember: { findUnique: jest.fn() },
    groupInvite: { findFirst: jest.fn(), create: jest.fn() },
  };
  const service = new GroupInvitesService(
    prisma as unknown as PrismaService,
    {} as FeedOrchestratorService,
    {} as GroupHomeSummaryService,
    {} as ClaimService,
    {} as NotificationWriterService,
  );
  return { service, prisma };
}

const GROUP_ID = 'group-1';
const ADMIN_ID = 'user-1';

function mockAdminRequester(prisma: PrismaMock) {
  prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });
  prisma.groupMember.findUnique.mockResolvedValueOnce({
    id: 'member-1',
    role: 'ADMIN',
    leftAt: null,
  });
}

describe('GroupInvitesService.create', () => {
  it('reuses the active open invite when no options are passed', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    prisma.groupInvite.findFirst.mockResolvedValue({
      id: 'inv-1',
      token: 'tok-1',
    });

    const result = await service.create(GROUP_ID, { createdById: ADMIN_ID });

    expect(prisma.groupInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          groupId: GROUP_ID,
          targetGroupMemberId: null,
          revokedAt: null,
          expiresAt: null,
          maxUses: null,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    // Hot path: reuse serves from a single read, no mint.
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
    expect(result.path).toBe('/invites/tok-1');
  });

  it('mints a new invite when there is none to reuse', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    prisma.groupInvite.findFirst.mockResolvedValue(null);
    prisma.groupInvite.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'inv-2', ...data }),
    );

    const result = await service.create(GROUP_ID, { createdById: ADMIN_ID });

    expect(prisma.groupInvite.create).toHaveBeenCalledTimes(1);
    expect(result.path).toBe(`/invites/${result.token}`);
  });

  it('always mints (outside the reuse path) when explicit options are passed', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    prisma.groupInvite.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'inv-3', ...data }),
    );

    await service.create(GROUP_ID, { createdById: ADMIN_ID, maxUses: 5 });

    // Explicit options never touch the reuse read.
    expect(prisma.groupInvite.findFirst).not.toHaveBeenCalled();
    expect(prisma.groupInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ maxUses: 5 }),
      }),
    );
  });

  it('reuses per target: a closed invite only matches the same guest', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    // target guest lookup: unclaimed, still in the group
    prisma.groupMember.findUnique.mockResolvedValueOnce({
      userId: null,
      leftAt: null,
    });
    prisma.groupInvite.findFirst.mockResolvedValue({
      id: 'inv-4',
      token: 'tok-4',
    });

    const result = await service.create(GROUP_ID, {
      createdById: ADMIN_ID,
      targetGroupMemberId: 'guest-1',
    });

    expect(prisma.groupInvite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetGroupMemberId: 'guest-1' }),
      }),
    );
    expect(result.path).toBe('/invites/tok-4');
  });

  it('resolves a lost mint race by re-reading the winner', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    // Miss on the optimistic read, then the concurrent winner surfaces on the re-read.
    prisma.groupInvite.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'inv-win', token: 'tok-win' });
    prisma.groupInvite.create.mockRejectedValue(uniqueViolation());

    const result = await service.create(GROUP_ID, { createdById: ADMIN_ID });

    expect(prisma.groupInvite.findFirst).toHaveBeenCalledTimes(2);
    expect(result.path).toBe('/invites/tok-win');
  });

  it('rethrows a unique violation the re-read cannot resolve', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    // Both reads miss (e.g. an unrelated collision) — surface the error, not a broken payload.
    prisma.groupInvite.findFirst.mockResolvedValue(null);
    const error = uniqueViolation();
    prisma.groupInvite.create.mockRejectedValue(error);

    await expect(
      service.create(GROUP_ID, { createdById: ADMIN_ID }),
    ).rejects.toBe(error);
  });

  it('forbids non-admin members from creating invites', async () => {
    const { service, prisma } = buildService();
    prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });
    prisma.groupMember.findUnique.mockResolvedValueOnce({
      id: 'member-2',
      role: 'MEMBER',
      leftAt: null,
    });

    await expect(
      service.create(GROUP_ID, { createdById: ADMIN_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
  });

  it('rejects a closed invite whose target already has an account, with a stable code', async () => {
    const { service, prisma } = buildService();
    mockAdminRequester(prisma);
    prisma.groupMember.findUnique.mockResolvedValueOnce({
      userId: 'user-9',
      leftAt: null,
    });

    const rejection = await service
      .create(GROUP_ID, {
        createdById: ADMIN_ID,
        targetGroupMemberId: 'guest-1',
      })
      .then(() => null)
      .catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(BadRequestException);
    // The frontend branches on this code (terminal state, no retry) — copy may change,
    // the code may not.
    expect((rejection as BadRequestException).getResponse()).toMatchObject({
      code: 'GUEST_ALREADY_CLAIMED',
    });
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
  });
});
