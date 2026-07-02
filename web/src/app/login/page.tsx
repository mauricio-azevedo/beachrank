import { AuthScreen } from '@/features/auth/components/auth-screen';

// Full-screen login. `?redirect=` (where to return after auth) and `?notice=`
// (e.g. an expired session) are read here and handed to the client screen; the
// footer toggle switches to signup in place.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirect = typeof params.redirect === 'string' ? params.redirect : undefined;
  const notice = params.notice === 'expired' ? ('expired' as const) : undefined;

  return <AuthScreen initialMode="login" redirect={redirect} notice={notice} />;
}
