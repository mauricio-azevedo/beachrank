import type { GroupMemberRole } from '../../generated/prisma/enums';

export type ProfileSummaryGroup = {
  id: string;
  name: string;
  description: string | null;
  // Group.avatarColor palette key (NOT NULL) — the frontend owns key→gradient.
  avatarColor: string;
  rating: number;
  role: GroupMemberRole;
  lastPlayedAt: Date | null;
  // Your rank in this group ("#13"); null while unranked.
  currentRank: number | null;
  // Total active members in the group ("de 19").
  membersCount: number;
  // Rank change from your most recent processed match (positive = climbed); null
  // when there's no processed match to compare against.
  rankDelta: number | null;
};
