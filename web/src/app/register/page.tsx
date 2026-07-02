import { AuthScreen } from '@/features/auth/components/auth-screen';

// Full-screen signup — the same screen as /login, seeded in signup mode. Deep
// links (e.g. invite emails) land here; the footer toggle switches to login in
// place.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirect = typeof params.redirect === 'string' ? params.redirect : undefined;

  return <AuthScreen initialMode="signup" redirect={redirect} />;
}
