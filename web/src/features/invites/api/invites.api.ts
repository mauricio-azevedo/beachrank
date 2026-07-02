import { apiRequest } from '@/lib/api-client';
import type { AcceptClaimResult, Group, GroupInvite, User } from '@/types/api';

export function createGroupInvite(token: string, groupId: string): Promise<GroupInvite> {
  return apiRequest<GroupInvite>(`/groups/${groupId}/invites`, {
    method: 'POST',
    token,
    body: {},
  });
}

export function getInvite(token: string): Promise<GroupInvite> {
  return apiRequest<GroupInvite>(`/invites/${token}`, {
    cache: 'no-store',
  });
}

export function acceptInvite(
  authToken: string,
  inviteToken: string,
): Promise<{
  id: string;
  groupId: string;
  userId: string | null;
  // Null when a stub is claimed (the name then comes from the linked account).
  displayName: string | null;
  rating: number;
  role: 'ADMIN' | 'MEMBER';
  group: Group;
  user: User;
}> {
  return apiRequest(`/invites/${inviteToken}/accept`, {
    method: 'POST',
    token: authToken,
  });
}

// Take over a guest via the invite (open-list pick or closed target). CLAIMED → the new
// membership; BLOCKED → a shared-match conflict. Requires an account (called post-auth).
export function claimInviteGuest(
  authToken: string,
  inviteToken: string,
  guestId: string,
): Promise<AcceptClaimResult> {
  return apiRequest<AcceptClaimResult>(`/invites/${inviteToken}/claim/${guestId}`, {
    method: 'POST',
    token: authToken,
  });
}
