export type RouteAccess =
  | {
      kind: 'public';
      requiresCheck: false;
    }
  | {
      kind: 'optional-auth';
      requiresCheck: false;
    }
  | {
      kind: 'auth';
      requiresCheck: true;
      groupId?: string;
      requiredRole?: 'MEMBER' | 'ADMIN';
    };

export type RouteChromePolicy = {
  topBar: boolean;
  bottomNav: boolean;
  trackNavigation: boolean;
};

export type RoutePolicy = {
  access: RouteAccess;
  chrome: RouteChromePolicy;
};

const primaryAppChrome: RouteChromePolicy = {
  topBar: true,
  bottomNav: true,
  trackNavigation: true,
};

export function getRoutePolicy(pathname: string): RoutePolicy {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/profile') {
    return {
      access: {
        kind: 'optional-auth',
        requiresCheck: false,
      },
      chrome: primaryAppChrome,
    };
  }

  if (normalizedPathname === '/groups/new') {
    return {
      access: {
        kind: 'auth',
        requiresCheck: true,
      },
      chrome: primaryAppChrome,
    };
  }

  if (normalizedPathname === '/notifications') {
    return {
      access: {
        kind: 'auth',
        requiresCheck: true,
      },
      chrome: primaryAppChrome,
    };
  }

  // Email-anchored claim confirm screen: auth-gated, no app chrome.
  if (/^\/claim\/[^/]+$/.test(normalizedPathname)) {
    return {
      access: {
        kind: 'auth',
        requiresCheck: true,
      },
      chrome: { topBar: false, bottomNav: false, trackNavigation: false },
    };
  }

  const newMatchMatch = normalizedPathname.match(/^\/groups\/([^/]+)\/matches\/new$/);

  if (newMatchMatch?.[1]) {
    return {
      access: {
        kind: 'auth',
        requiresCheck: true,
        groupId: newMatchMatch[1],
        requiredRole: 'MEMBER',
      },
      chrome: primaryAppChrome,
    };
  }

  const editMatchMatch = normalizedPathname.match(/^\/groups\/([^/]+)\/matches\/([^/]+)\/edit$/);

  if (editMatchMatch?.[1]) {
    return {
      access: {
        kind: 'auth',
        requiresCheck: true,
        groupId: editMatchMatch[1],
        requiredRole: 'MEMBER',
      },
      chrome: primaryAppChrome,
    };
  }

  return {
    access: {
      kind: 'public',
      requiresCheck: false,
    },
    chrome: primaryAppChrome,
  };
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
