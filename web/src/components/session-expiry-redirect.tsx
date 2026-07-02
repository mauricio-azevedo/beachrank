'use client';

import { useEffect } from 'react';
import { setSessionExpiredHandler } from '@/lib/auth';
import { buildAuthPath } from '@/features/auth/auth-navigation';

// Bridges a dead session — detected deep in the API client, cleared by
// `triggerSessionExpired` — to the login screen. Mounted once at the root. Sends
// the user to /login with an "expired" notice, remembering where they were so
// re-auth returns them to the same spot.
export function SessionExpiryRedirect() {
  useEffect(() => {
    setSessionExpiredHandler(() => {
      const here = window.location.pathname + window.location.search;
      window.location.assign(buildAuthPath({ redirect: here, notice: 'expired' }));
    });

    return () => setSessionExpiredHandler(null);
  }, []);

  return null;
}
