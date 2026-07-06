export type ProfileSummaryGroup = {
  id: string;
  name: string;
  description: string | null;
  // Group.avatarColor palette key; the frontend owns key→gradient.
  avatarColor: string;
  rating: number;
  role: 'ADMIN' | 'MEMBER';
  lastPlayedAt: string | null;
  // Your rank in this group ("#13"); null while unranked.
  currentRank: number | null;
  // Total active members ("de 19").
  membersCount: number;
  // Rank change from your latest processed match (positive = climbed); null when
  // there's nothing to compare against yet.
  rankDelta: number | null;
};
