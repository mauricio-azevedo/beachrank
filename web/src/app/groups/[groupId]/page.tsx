import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getGroup } from '@/features/groups/api/groups.api';
import { GroupDetail } from '@/features/groups/group-detail';
import { GroupOptionsMenu } from '@/features/groups/components/group-options-menu';

type Props = {
  params: Promise<{
    groupId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    compose?: string;
  }>;
};

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { tab, compose } = await searchParams;
  await getGroup(groupId).catch(() => notFound());

  return (
    <AppShell
      chrome={{ back: { fallbackHref: '/' }, trailing: <GroupOptionsMenu groupId={groupId} /> }}
    >
      {/* Keyed per group: client state (open sheets, tab) must not leak across
          /groups/A → /groups/B, where the component instance would otherwise survive. */}
      <GroupDetail
        key={groupId}
        groupId={groupId}
        tab={tab}
        autoOpenCompose={compose === 'match'}
      />
    </AppShell>
  );
}
