import { cn } from '@/lib/utils';
import {
  MemberAvatar,
  MEMBER_AVATAR_SIZE_CLASS,
  type MemberAvatarSize,
} from '@/components/ui/member-avatar';

export type StackMember = {
  // null → guest/stub (dashed ring); otherwise a real member (gradient fill).
  userId: string | null;
  name: string;
  avatarColor?: string | null;
};

type MemberAvatarStackProps = {
  members: StackMember[];
  // Beyond this many, the remainder collapse into a trailing "+N" chip. Default 4.
  max?: number;
  size?: MemberAvatarSize;
  // Ring that separates the overlapping avatars — it must match the surface the
  // stack sits on, so set it per context (page background by default; e.g.
  // `ring-dialog` inside an alert, `ring-card` on a card). A mismatched ring reads
  // as an unwanted shadow/outline.
  ringClassName?: string;
  className?: string;
};

// Overlapping row of MemberAvatars with a "+N" overflow chip — one place so every
// stack (rosters, confirmations, match cards) reads the same.
export function MemberAvatarStack({
  members,
  max = 4,
  size = 'md',
  ringClassName = 'ring-background',
  className,
}: MemberAvatarStackProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const ring = cn('ring-2', ringClassName);

  return (
    <div className={cn('flex -space-x-3', className)}>
      {shown.map((member, index) => (
        <MemberAvatar
          key={`${member.name}-${index}`}
          userId={member.userId}
          name={member.name}
          avatarColor={member.avatarColor ?? null}
          size={size}
          className={ring}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-surface font-display font-extrabold tabular-nums text-muted-foreground',
            MEMBER_AVATAR_SIZE_CLASS[size],
            ring,
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
