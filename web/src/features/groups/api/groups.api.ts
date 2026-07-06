import { apiRequest } from '@/lib/api-client';
import type { Group, GroupMember, MyGroup } from '@/types/api';
import type { GroupHomeCard } from '@/features/groups/types/group-home.type';

export function getGroups(): Promise<Group[]> {
  return apiRequest<Group[]>('/groups', {
    cache: 'no-store',
  });
}

export function getGroup(groupId: string): Promise<Group> {
  return apiRequest<Group>(`/groups/${groupId}`, {
    cache: 'no-store',
  });
}

export function getGroupHome(token?: string): Promise<GroupHomeCard[]> {
  return apiRequest<GroupHomeCard[]>('/groups/home', {
    token,
    cache: 'no-store',
  });
}

export function getAllGroups(token?: string): Promise<GroupHomeCard[]> {
  return apiRequest<GroupHomeCard[]>('/groups/home/all', {
    token,
    cache: 'no-store',
  });
}

export function getMyGroups(token: string): Promise<MyGroup[]> {
  return apiRequest<MyGroup[]>('/me/groups', {
    token,
    cache: 'no-store',
  });
}

export function createGroup(
  token: string,
  input: {
    name: string;
    description?: string;
    avatarColor?: string;
  },
): Promise<Group> {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    token,
    body: input,
  });
}

export function getGroupRanking(groupId: string): Promise<GroupMember[]> {
  return apiRequest<GroupMember[]>(`/groups/${groupId}/ranking`, {
    cache: 'no-store',
  });
}

export function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return apiRequest<GroupMember[]>(`/groups/${groupId}/members`, {
    cache: 'no-store',
  });
}

// Adds a guest (jogador sem conta) to the group — a GroupMember with userId null.
// Any active member may do it; the created member comes back for an optimistic refresh.
export function createGuestMember(
  token: string,
  groupId: string,
  name: string,
): Promise<GroupMember> {
  return apiRequest<GroupMember>(`/groups/${groupId}/members/guest`, {
    method: 'POST',
    token,
    body: { name },
  });
}
