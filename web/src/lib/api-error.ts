import type { ApiErrorCode } from '@/types/api';

// The API layer's typed error: `status` is the HTTP status, `code` the
// machine-readable business code (mirrored from api/src/common/api-errors.ts in
// types/api.ts). UI branches on these — never on the human-readable message copy.
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | null;

  constructor(message: string, { status, code }: { status: number; code: ApiErrorCode | null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getApiErrorCode(error: unknown): ApiErrorCode | null {
  return error instanceof ApiError ? error.code : null;
}

export function getApiErrorStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

// One PT copy per shared business code. Screens pass `overrides` when their context
// needs different phrasing, and always provide their own fallback.
const API_ERROR_COPY: Partial<Record<ApiErrorCode, string>> = {
  EMAIL_IN_USE: 'Esse email já está em uso.',
  GUEST_ALREADY_CLAIMED: 'Esse perfil já tem uma conta.',
};

export function apiErrorMessage(
  error: unknown,
  fallback: string,
  overrides?: Partial<Record<ApiErrorCode, string>>,
): string {
  const code = getApiErrorCode(error);

  if (!code) {
    return fallback;
  }

  return overrides?.[code] ?? API_ERROR_COPY[code] ?? fallback;
}
