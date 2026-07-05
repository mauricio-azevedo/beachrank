import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

// Machine-readable codes for the business errors the frontend must distinguish.
// Append-only: the web app mirrors these in `web/src/types/api.ts` and branches on
// them instead of parsing message copy. Add a code only when a screen needs to react
// to that specific failure — plain string exceptions stay the default everywhere else.
export const API_ERROR_CODES = {
  GUEST_ALREADY_CLAIMED: 'GUEST_ALREADY_CLAIMED',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',
  PASSWORD_SAME_AS_CURRENT: 'PASSWORD_SAME_AS_CURRENT',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// Nest passes object bodies through verbatim (no statusCode/error merge), so each
// factory stamps the full shape the string form would have produced, plus `code`.
export function codedBadRequest(code: ApiErrorCode, message: string) {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    code,
    message,
  });
}

export function codedConflict(code: ApiErrorCode, message: string) {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
  });
}

export function codedUnauthorized(code: ApiErrorCode, message: string) {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    code,
    message,
  });
}
