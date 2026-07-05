import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { API_ERROR_CODES, codedConflict } from '../common/api-errors';
import { isAvatarColorKey } from '../common/avatar-color';
import type { UpdateProfileInput } from './types/update-profile-input.type';

const MAX_NAME_LENGTH = 80;
const MAX_NICKNAME_LENGTH = 24;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_UPDATE_FIELDS = [
  'firstName',
  'lastName',
  'nickname',
  'email',
  'avatarColor',
] as const;

type NormalizedUpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  // null clears the field back to the default.
  nickname?: string | null;
  email?: string;
  avatarColor?: string;
};

type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  findMyGroups(userId: string) {
    return this.prisma.groupMember.findMany({
      where: {
        userId,
        leftAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        role: true,
        rating: true,
        groupId: true,
        createdAt: true,
        updatedAt: true,
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
      },
    });
  }

  async updateProfile(userId: string, body: UpdateProfileInput) {
    const input = this.normalizeUpdateProfileInput(body);

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect(),
    });

    if (!currentUser) {
      throw new UnauthorizedException('Invalid token');
    }

    const updateData: NormalizedUpdateProfileInput = {};

    if (
      input.firstName !== undefined &&
      input.firstName !== currentUser.firstName
    ) {
      updateData.firstName = input.firstName;
    }

    if (
      input.lastName !== undefined &&
      input.lastName !== currentUser.lastName
    ) {
      updateData.lastName = input.lastName;
    }

    if (
      input.nickname !== undefined &&
      input.nickname !== currentUser.nickname
    ) {
      updateData.nickname = input.nickname;
    }

    if (
      input.avatarColor !== undefined &&
      input.avatarColor !== currentUser.avatarColor
    ) {
      updateData.avatarColor = input.avatarColor;
    }

    if (input.email !== undefined && input.email !== currentUser.email) {
      await this.ensureEmailIsAvailable(input.email, currentUser.id);
      updateData.email = input.email;
    }

    if (Object.keys(updateData).length === 0) {
      return this.buildProfileResponse(currentUser);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: currentUser.id },
        data: updateData,
        select: this.userSelect(),
      });

      return this.buildProfileResponse(updatedUser);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw codedConflict(
          API_ERROR_CODES.EMAIL_IN_USE,
          'Email already in use',
        );
      }

      if (this.isRecordNotFoundError(error)) {
        throw new UnauthorizedException('Invalid token');
      }

      throw error;
    }
  }

  private normalizeUpdateProfileInput(body: UpdateProfileInput) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid profile update payload');
    }

    const unknownFields = Object.keys(body).filter(
      (field) =>
        !PROFILE_UPDATE_FIELDS.includes(
          field as (typeof PROFILE_UPDATE_FIELDS)[number],
        ),
    );

    if (unknownFields.length > 0) {
      throw new BadRequestException('Unsupported profile update fields');
    }

    const input: NormalizedUpdateProfileInput = {};
    const has = (field: string) =>
      Object.prototype.hasOwnProperty.call(body, field);

    if (!PROFILE_UPDATE_FIELDS.some((field) => has(field))) {
      throw new BadRequestException('At least one profile field is required');
    }

    if (has('firstName')) {
      input.firstName = this.normalizeNameField(body.firstName, 'First name');
    }

    if (has('lastName')) {
      input.lastName = this.normalizeNameField(body.lastName, 'Last name');
    }

    if (has('nickname')) {
      input.nickname = this.normalizeNicknameField(body.nickname);
    }

    if (has('email')) {
      input.email = this.normalizeEmailField(body.email);
    }

    if (has('avatarColor')) {
      input.avatarColor = this.normalizeAvatarColorField(body.avatarColor);
    }

    return input;
  }

  // Empty → null (clears the nickname back to first+last name).
  private normalizeNicknameField(value: unknown): string | null {
    if (typeof value !== 'string') {
      throw new BadRequestException('Nickname must be a string');
    }

    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      return null;
    }

    if (normalized.length > MAX_NICKNAME_LENGTH) {
      throw new BadRequestException(
        `Nickname must have at most ${MAX_NICKNAME_LENGTH} characters`,
      );
    }

    return normalized;
  }

  // Must be a known palette key — there is no "no colour" state to clear to.
  private normalizeAvatarColorField(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Avatar color must be a string');
    }

    const normalized = value.trim();

    if (!isAvatarColorKey(normalized)) {
      throw new BadRequestException('Invalid avatar color');
    }

    return normalized;
  }

  private normalizeNameField(value: unknown, label: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} must be a string`);
    }

    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }

    if (normalized.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `${label} must have at most ${MAX_NAME_LENGTH} characters`,
      );
    }

    return normalized;
  }

  private normalizeEmailField(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('Email must be a string');
    }

    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('Email is required');
    }

    if (normalized.length > MAX_EMAIL_LENGTH) {
      throw new BadRequestException(
        `Email must have at most ${MAX_EMAIL_LENGTH} characters`,
      );
    }

    if (!EMAIL_REGEX.test(normalized)) {
      throw new BadRequestException('Invalid email');
    }

    return normalized;
  }

  private async ensureEmailIsAvailable(email: string, currentUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== currentUserId) {
      throw codedConflict(API_ERROR_CODES.EMAIL_IN_USE, 'Email already in use');
    }
  }

  private buildProfileResponse(user: ProfileUser) {
    return {
      user,
      accessToken: this.signToken(user.id, user.email),
    };
  }

  private signToken(userId: string, email: string) {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isRecordNotFoundError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private userSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      nickname: true,
      email: true,
      avatarColor: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
