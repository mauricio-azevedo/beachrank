import { ApiError } from '@/lib/api-error';
import { isAccessTokenExpired, triggerSessionExpired } from '@/lib/auth';
import type { ApiErrorCode } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  token?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { token, body, headers, ...options }: ApiRequestOptions = {},
): Promise<T> {
  // The token is already dead — don't fire a doomed request, just hand off to the
  // re-login flow.
  if (token && isAccessTokenExpired(token)) {
    triggerSessionExpired();
    throw new ApiError('Session expired', { status: 401, code: null });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // A 401 only means "log back in" when the token itself is expired — covers the
    // narrow race where it lapses between sending and the server checking. A 401 with
    // a still-valid token is a business error (e.g. wrong current password) and must
    // not log the user out.
    if (response.status === 401 && token && isAccessTokenExpired(token)) {
      triggerSessionExpired();
    }

    throw await buildApiError(response);
  }

  return response.json();
}

async function buildApiError(response: Response) {
  let message = `Request failed with status ${response.status}`;
  let code: ApiErrorCode | null = null;

  try {
    const data = await response.json();

    if (typeof data?.message === 'string') {
      message = data.message;
    } else if (Array.isArray(data?.message)) {
      message = data.message.join(', ');
    }

    if (typeof data?.code === 'string') {
      code = data.code as ApiErrorCode;
    }
  } catch {
    // Ignore JSON parse error and fall back to the default message (code stays null).
  }

  return new ApiError(message, { status: response.status, code });
}
