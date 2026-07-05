import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  API_ERROR_CODES,
  codedBadRequest,
  codedUnauthorized,
} from '../common/api-errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdatePasswordInput } from './types/update-password-input.type';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_BYTES = 72;
const SALT_ROUNDS = 10;
const PASSWORD_UPDATE_FIELDS = ['currentPassword', 'newPassword'] as const;

type NormalizedUpdatePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

@Injectable()
export class MePasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePassword(userId: string, body: UpdatePasswordInput) {
    const input = this.normalizeUpdatePasswordInput(body);

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!currentUser) {
      throw new UnauthorizedException('Invalid token');
    }

    const currentPasswordMatches = await bcrypt.compare(
      input.currentPassword,
      currentUser.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw codedUnauthorized(
        API_ERROR_CODES.INVALID_CURRENT_PASSWORD,
        'Invalid current password',
      );
    }

    const isSamePassword = await bcrypt.compare(
      input.newPassword,
      currentUser.passwordHash,
    );

    if (isSamePassword) {
      throw codedBadRequest(
        API_ERROR_CODES.PASSWORD_SAME_AS_CURRENT,
        'New password must be different from current password',
      );
    }

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    try {
      await this.prisma.user.update({
        where: { id: currentUser.id },
        data: { passwordHash },
        select: { id: true },
      });
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw new UnauthorizedException('Invalid token');
      }

      throw error;
    }

    return { success: true };
  }

  private normalizeUpdatePasswordInput(
    body: UpdatePasswordInput,
  ): NormalizedUpdatePasswordInput {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid password update payload');
    }

    const unknownFields = Object.keys(body).filter(
      (field) =>
        !PASSWORD_UPDATE_FIELDS.includes(
          field as (typeof PASSWORD_UPDATE_FIELDS)[number],
        ),
    );

    if (unknownFields.length > 0) {
      throw new BadRequestException('Unsupported password update fields');
    }

    return {
      currentPassword: this.normalizeCurrentPassword(body.currentPassword),
      newPassword: this.normalizeNewPassword(body.newPassword),
    };
  }

  private normalizeCurrentPassword(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('Current password must be a string');
    }

    if (!value) {
      throw new BadRequestException('Current password is required');
    }

    return value;
  }

  private normalizeNewPassword(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('New password must be a string');
    }

    if (!value) {
      throw new BadRequestException('New password is required');
    }

    if (value.length < MIN_PASSWORD_LENGTH) {
      throw codedBadRequest(
        API_ERROR_CODES.PASSWORD_TOO_SHORT,
        `New password must have at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
      throw codedBadRequest(
        API_ERROR_CODES.PASSWORD_TOO_LONG,
        `New password must have at most ${MAX_PASSWORD_BYTES} bytes`,
      );
    }

    return value;
  }

  private isRecordNotFoundError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }
}
