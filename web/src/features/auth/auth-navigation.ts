// Single source for reaching the auth screen. Login and signup are real
// full-screen pages (`/login`, `/register`) that render the same screen and can
// be toggled in place once open. Every "sign in to continue" entry point builds
// its URL here so the redirect-back contract stays consistent.

export type AuthMode = 'login' | 'signup';

// Why the auth screen was reached, when it's worth telling the user (e.g. their
// session expired). Copy is single-sourced here and shown on the login form.
export type AuthNotice = 'expired';

export const NOTICE_COPY: Record<AuthNotice, string> = {
  expired: 'Sua sessão expirou. Entre novamente para continuar.',
};

// Build the path to the auth screen, carrying where to return after success
// (`redirect`) and an optional `notice`. Signup opens `/register`, login
// `/login`. The redirect is sanitized on the way back out by
// `getSafeAuthRedirectPath`, so callers just pass the current location.
export function buildAuthPath(options?: {
  mode?: AuthMode;
  redirect?: string;
  notice?: AuthNotice;
  // Invite context: when auth is reached from an invite, `context` is the banner title
  // ("Bruno · Masculino Life" or just the group), and `nickname` pre-fills the signup
  // apelido with the guest's name. Both are display-only; the eyebrow and initial derive
  // from them on the auth screen.
  context?: string;
  nickname?: string;
}): string {
  const base = options?.mode === 'signup' ? '/register' : '/login';
  const params = new URLSearchParams();
  if (options?.redirect) params.set('redirect', options.redirect);
  if (options?.notice) params.set('notice', options.notice);
  if (options?.context) params.set('ctx', options.context);
  if (options?.nickname) params.set('nick', options.nickname);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

// The invite banner shown on the auth screen, parsed back from the `ctx`/`nick` query
// params that `buildAuthPath` writes.
export type AuthInviteContext = { context: string; nickname?: string };

export function readInviteContext(
  params: Record<string, string | string[] | undefined>,
): AuthInviteContext | null {
  const context = typeof params.ctx === 'string' ? params.ctx : undefined;
  if (!context) return null;
  const nickname = typeof params.nick === 'string' ? params.nick : undefined;
  return { context, nickname };
}
