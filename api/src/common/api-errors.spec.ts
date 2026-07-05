import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  API_ERROR_CODES,
  codedBadRequest,
  codedConflict,
  codedUnauthorized,
} from './api-errors';

// Nest returns object bodies verbatim (no statusCode/error merge), so the factories
// must stamp the full standard shape themselves — that contract is what these lock in.
describe('coded API errors', () => {
  it('codedBadRequest keeps the standard body shape plus code', () => {
    const exception = codedBadRequest(
      API_ERROR_CODES.GUEST_ALREADY_CLAIMED,
      'mensagem',
    );

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      code: 'GUEST_ALREADY_CLAIMED',
      message: 'mensagem',
    });
  });

  it('codedConflict stamps 409', () => {
    const exception = codedConflict(API_ERROR_CODES.EMAIL_IN_USE, 'mensagem');

    expect(exception).toBeInstanceOf(ConflictException);
    expect(exception.getStatus()).toBe(409);
    expect(exception.getResponse()).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'EMAIL_IN_USE',
    });
  });

  it('codedUnauthorized stamps 401', () => {
    const exception = codedUnauthorized(
      API_ERROR_CODES.INVALID_CURRENT_PASSWORD,
      'mensagem',
    );

    expect(exception).toBeInstanceOf(UnauthorizedException);
    expect(exception.getStatus()).toBe(401);
    expect(exception.getResponse()).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'INVALID_CURRENT_PASSWORD',
    });
  });
});
