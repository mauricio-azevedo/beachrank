import { memberInitials } from '@/lib/avatar';
import { avatarColorGradient, DEFAULT_AVATAR_COLOR } from '@/lib/avatar-color';
import { AvatarShell } from '@/components/ui/avatar-shell';
import { cn } from '@/lib/utils';

export type MemberAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// The single player/member avatar used everywhere. Only `size` varies the look;
// everything else (colour gradient, initials, dashed-stub treatment) is fixed.
// Exported so the avatar stack's overflow chip ("+N") can size itself identically.
export const MEMBER_AVATAR_SIZE_CLASS: Record<MemberAvatarSize, string> = {
  xs: 'size-[34px] text-[0.8125rem]',
  sm: 'size-10 text-[0.9375rem]',
  md: 'size-11 text-base',
  lg: 'size-[3.25rem] text-[1.25rem]',
  xl: 'size-16 text-[1.5rem]',
  '2xl': 'size-24 text-[2.375rem]',
};

type MemberAvatarProps = {
  // null → jogador sem conta (convidado): a dashed, faceless ring instead of a
  // coloured avatar, so a stub reads the same everywhere.
  userId: string | null;
  // Full name; the initials are derived here.
  name: string;
  // Palette key → gradient fill (real members always have one).
  avatarColor: string | null;
  size: MemberAvatarSize;
  // How many initials to show. Default 2 (degrades to 1 for single-word names).
  initials?: 1 | 2;
  // Layout only (overlap margins, stacking ring) — never sizing.
  className?: string;
};

export function MemberAvatar({
  userId,
  name,
  avatarColor,
  size,
  initials = 2,
  className,
}: MemberAvatarProps) {
  const isStub = userId === null;
  // Real members always get a gradient (never an invisible avatar); stubs stay dashed.
  const gradient = isStub
    ? null
    : (avatarColorGradient(avatarColor) ?? avatarColorGradient(DEFAULT_AVATAR_COLOR));

  return (
    <AvatarShell
      gradient={gradient}
      className={cn(
        'font-display font-extrabold',
        MEMBER_AVATAR_SIZE_CLASS[size],
        isStub
          ? 'border border-dashed border-border-accent text-muted-foreground'
          : 'text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
        className,
      )}
    >
      {memberInitials(name, initials)}
    </AvatarShell>
  );
}
