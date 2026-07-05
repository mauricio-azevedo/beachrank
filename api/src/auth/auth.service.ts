import { API_ERROR_CODES, codedConflict } from '../common/api-errors';
import { MEMBER_USER_SELECT } from '../common/member-display-name';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { pickDefaultAvatarColor } from '../common/avatar-color';
import { structuredLog } from '../observability/structured-log';
import { claimOfferNotificationData } from '../claim-offers/claim-offer-notification';

const SALT_ROUNDS = 10;

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    nickname?: string;
  }) {
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    // Optional: an empty/whitespace nickname stays null so it never shadows the
    // "First Last" display name downstream.
    const nickname = body.nickname?.trim() || null;

    if (!firstName || !lastName || !email || !password) {
      throw new BadRequestException('All fields are required');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must have at least 6 characters');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw codedConflict(API_ERROR_CODES.EMAIL_IN_USE, 'Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        nickname,
        email,
        passwordHash,
        avatarColor: pickDefaultAvatarColor(email),
      },
      select: this.userSelect(),
    });

    // A stub may have been waiting for this email — offer it now (never auto-claims). A
    // best-effort side effect: its failure must never fail the registration the user just
    // completed (the account is already committed; failing here would lock them out).
    try {
      await this.notifyPendingClaimOffers(user.id, email);
    } catch (error) {
      structuredLog('auth.claim_offer_notify_failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      user,
      accessToken: this.signToken(user.id, user.email),
    };
  }

  // Stubs an admin anchored to this email but couldn't notify yet (no account existed).
  // Now that the account exists, send the same claim offer it would have gotten then.
  private async notifyPendingClaimOffers(userId: string, email: string) {
    const stubs = await this.prisma.groupMember.findMany({
      where: {
        claimEmail: email,
        userId: null,
        claimEmailStatus: 'PENDING',
        claimEmailNotifiedAt: null,
      },
      select: {
        id: true,
        group: { select: { id: true, name: true } },
      },
    });

    if (stubs.length === 0) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.notification.createMany({
        data: stubs.map((stub) => ({
          type: 'CLAIM_OFFER' as const,
          recipientUserId: userId,
          groupId: stub.group.id,
          targetGroupMemberId: stub.id,
          data: claimOfferNotificationData(stub.id, stub.group.name),
        })),
      }),
      this.prisma.groupMember.updateMany({
        where: { id: { in: stubs.map((stub) => stub.id) } },
        data: { claimEmailNotifiedAt: new Date() },
      }),
    ]);
  }

  async login(body: { email: string; password: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: this.signToken(user.id, user.email),
    };
  }

  async me(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: this.userSelect(),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  private signToken(userId: string, email: string) {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }

  private verifyAuthorizationHeader(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authorization.replace('Bearer ', '');

    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private userSelect() {
    return {
      id: true,
      ...MEMBER_USER_SELECT,
      email: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
