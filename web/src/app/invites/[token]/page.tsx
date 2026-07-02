import { notFound } from 'next/navigation';
import type { GroupInvite } from '@/types/api';
import { AppShell } from '@/components/app-shell';
import { InviteClient } from '@/features/invites/components/invite-client';
import { getInvite } from '@/features/invites/api/invites.api';

type Props = {
  params: Promise<{
    token: string;
  }>;
};

// A focused, chrome-less landing (like /claim): the invite drives its own 3-step flow.
export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  let invite: GroupInvite;
  try {
    invite = await getInvite(token);
  } catch {
    notFound();
  }

  return (
    <AppShell chrome={{ topBar: false, bottomNav: false }}>
      <InviteClient invite={invite} />
    </AppShell>
  );
}
