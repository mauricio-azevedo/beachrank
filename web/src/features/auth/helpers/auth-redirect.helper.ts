import { getInternalPathname, getSafeInternalHref } from '@/lib/internal-href';

const DEFAULT_AUTH_REDIRECT = '/';

export function getSafeAuthRedirectPath(redirect: unknown, fallback = DEFAULT_AUTH_REDIRECT) {
  const safeFallback = getSafeAuthRedirectFallback(fallback);
  const safeRedirect = getSafeInternalHref(redirect, safeFallback);
  const pathname = getInternalPathname(safeRedirect);

  if (!pathname || isAuthPathname(pathname)) {
    return safeFallback;
  }

  return safeRedirect;
}

function getSafeAuthRedirectFallback(fallback: unknown) {
  const safeFallback = getSafeInternalHref(fallback, DEFAULT_AUTH_REDIRECT);
  const fallbackPathname = getInternalPathname(safeFallback);

  if (!fallbackPathname || isAuthPathname(fallbackPathname)) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return safeFallback;
}

// /login and /register are the auth screens themselves, so a post-auth redirect
// must never resolve to one (it would just bounce the user back to sign in).
function isAuthPathname(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}
