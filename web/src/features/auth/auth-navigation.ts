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
}): string {
  const base = options?.mode === 'signup' ? '/register' : '/login';
  const params = new URLSearchParams();
  if (options?.redirect) params.set('redirect', options.redirect);
  if (options?.notice) params.set('notice', options.notice);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
