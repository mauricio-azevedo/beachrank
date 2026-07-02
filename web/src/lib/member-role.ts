import type { GroupMemberRole } from '@/types/api';

export type MemberRoleTag = { label: string; className: string };

// Single source of truth for a member's role badge, so "Convidado" never diverges into
// "sem conta" across screens. Pure UI copy, derived from data the client already has
// (a stub has no account → userId null), so it stays in the frontend, not the API.
export function memberRoleTag(member: {
  userId: string | null;
  role?: GroupMemberRole;
}): MemberRoleTag {
  if (member.userId === null) {
    return { label: 'Convidado', className: 'bg-tag-warn/15 text-tag-warn' };
  }
  if (member.role === 'ADMIN') {
    return { label: 'Admin', className: 'bg-brand/15 text-brand' };
  }
  return { label: 'Jogador', className: 'bg-background text-muted-foreground' };
}
