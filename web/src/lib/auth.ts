export const ACCESS_TOKEN_STORAGE_KEY = 'arena_access_token';

type JwtPayload = {
  sub?: string;
  exp?: number;
};

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  // A fresh token means a live session again — re-arm the expiry handler.
  sessionExpiredHandled = false;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function removeAccessToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getCurrentUserIdFromAccessToken() {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  return getUserIdFromAccessToken(token);
}

export function getUserIdFromAccessToken(token: string) {
  return decodeAccessToken(token)?.sub ?? null;
}

// Decodes the JWT payload without verifying the signature — enough to read claims
// the client trusts loosely (user id, expiry). SSR-safe: returns null without window.
function decodeAccessToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');

    if (!payload || typeof window === 'undefined') {
      return null;
    }

    return JSON.parse(window.atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

// True when the token is past its `exp` (or has no readable expiry / is malformed),
// so the session is effectively dead. Without a window (SSR) there's no session to
// expire, so it returns false.
export function isAccessTokenExpired(token: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const exp = decodeAccessToken(token)?.exp;

  if (typeof exp !== 'number') {
    return true;
  }

  return exp * 1000 <= Date.now();
}

// A dead session is handled in exactly one place (SessionExpiryRedirect, which
// navigates to /login), but detected deep in the API client. This registry bridges
// the two without coupling lib code to React/UI.
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
let sessionExpiredHandled = false;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

// Fires the handler once per dead session: concurrent failed requests all call this,
// but only the first redirects to login. Re-armed when a new token is stored.
export function triggerSessionExpired() {
  if (sessionExpiredHandled) {
    return;
  }

  sessionExpiredHandled = true;
  removeAccessToken();
  sessionExpiredHandler?.();
}
