import { Users } from 'lucide-react';
import { avatarColorGradient } from '@/lib/avatar-color';
import { getGroupInitials, groupHueGradient } from '@/lib/group-identity';
import { AvatarShell } from '@/components/ui/avatar-shell';
import { cn } from '@/lib/utils';

export type GroupAvatarSize = 'sm' | 'md' | 'lg' | 'hero';
export type GroupAvatarTone = 'hue' | 'accent' | 'brand';

const SIZE_CLASS: Record<GroupAvatarSize, string> = {
  sm: 'size-9 text-meta font-extrabold',
  md: 'size-11 text-base font-extrabold',
  lg: 'size-[3.25rem] font-display text-stat-md',
  hero: 'size-[74px] font-display text-stat-lg',
};

const TONE_CLASS: Record<GroupAvatarTone, string> = {
  hue: 'text-white',
  accent: 'bg-[linear-gradient(150deg,var(--accent),var(--accent-dark))] text-white',
  brand: 'bg-gradient-to-br from-brand to-accent-dark text-brand-foreground',
};

type GroupAvatarProps = {
  // Full group name; the initials are derived here. Empty → a Users icon fallback,
  // so an unnamed group (e.g. the create sheet before typing) is never a blank circle.
  name: string;
  // Seeds the hue tone so the group wears the same color everywhere; falls back to
  // the name when a caller has no id (the color stays stable either way).
  groupId?: string;
  size: GroupAvatarSize;
  // hue (default) = the group's own tint (lists, rails, feed). accent = the current
  // group (screen hero, invite sheet). brand = invite chrome (chips, landing).
  tone?: GroupAvatarTone;
  // Stored palette key (Group.avatarColor). When set, the hue tone uses this chosen
  // colour instead of the id/name-derived hue; unknown/absent falls back to the hue.
  avatarColor?: string | null;
  // Layout/emphasis only (margins, hero glow) — never sizing or fill.
  className?: string;
};

// The single group monogram, built on the same AvatarShell as MemberAvatar: always
// round, `size` picks the scale, `tone` picks the fill. The group name is always
// adjacent text, so the monogram itself is decorative.
export function GroupAvatar({
  name,
  groupId,
  size,
  tone = 'hue',
  avatarColor,
  className,
}: GroupAvatarProps) {
  const hueFill = avatarColorGradient(avatarColor) ?? groupHueGradient(groupId ?? name);
  const initials = getGroupInitials(name);

  return (
    <AvatarShell
      gradient={tone === 'hue' ? hueFill : undefined}
      className={cn(
        'shadow-[inset_0_0_0_1px_var(--border-accent)]',
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {initials || <Users className="size-1/2" strokeWidth={1.8} />}
    </AvatarShell>
  );
}
