import type { GroupMemberRole, RankingMovement } from '@/types/api';
import type { FeedItemType } from '@/features/feed/enums/feed-item-type.enum';

type GroupHomeStanding =
  | {
      kind: 'RANKED';
      rank: number;
      rating: number;
      rankingMovement: RankingMovement | null;
    }
  | {
      kind: 'UNRANKED';
      rating: number;
    };

export type GroupHomeLeader = {
  groupMemberId: string;
  userId: string;
  displayName: string;
  rating: number;
  rank: number;
};

export type GroupHomeActivity = {
  id: string;
  type: FeedItemType;
  occurredAt: string;
  importanceScore: number;
  metadata: unknown;
};

export type GroupHomeCard = {
  relationship: 'MEMBER' | 'PUBLIC_SUGGESTION';
  sortReason:
    | 'FAILED'
    | 'PROCESSING'
    | 'RECENT_RELEVANT_ACTIVITY'
    | 'DEFAULT'
    | 'PUBLIC_SUGGESTION';
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: 'PUBLIC';
    avatarColor: string;
    membersCount: number;
    matchesCount: number;
    lastMatchAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  currentUser: {
    membershipId: string;
    role: GroupMemberRole;
    standing: GroupHomeStanding;
  } | null;
  leaders: GroupHomeLeader[];
  activity: {
    lastRelevant: GroupHomeActivity | null;
    lastRelevantAt: string | null;
  };
  projection: {
    status: 'CURRENT' | 'PROCESSING' | 'FAILED' | null;
    lastProcessedAt: string | null;
    lastError: string | null;
  } | null;
};
