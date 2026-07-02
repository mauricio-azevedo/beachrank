export type User = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string | null;
  avatarColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    matches: number;
  };
};

export type GroupMemberRole = 'ADMIN' | 'MEMBER';

export type RankingMovement = {
  direction: 'UP' | 'DOWN';
  positions: number;
  previousRank: number;
  currentRank: number;
  previousRating: number;
  currentRating: number;
  sourceMatchId: string;
  occurredAt: string;
};

export type GroupMemberStats = {
  matchesCount: number;
  winsCount: number;
};

export type GroupMember = {
  id: string;
  groupId: string;
  // Null for stub players (jogadores sem conta); displayName carries their name.
  userId: string | null;
  displayName: string | null;
  rating: number;
  ratingDeviation: number | null;
  ratingVolatility: number | null;
  ratingMu: number | null;
  ratingSigma: number | null;
  ratingAlgorithm: string;
  role: GroupMemberRole;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  group?: Group;
  stats?: GroupMemberStats;
  rankingMovement?: RankingMovement | null;
};

export type MyGroup = {
  id: string;
  role: GroupMemberRole;
  rating: number;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  group: Group;
};

// A lightweight roster row on the open invite: just enough to self-recognize.
export type InviteGuest = {
  groupMemberId: string;
  displayName: string;
  matchesCount: number;
};

export type GroupInvite = {
  id: string;
  token: string;
  groupId: string;
  createdById: string;
  expiresAt: string | null;
  revokedAt: string | null;
  uses: number;
  maxUses: number | null;
  createdAt: string;
  updatedAt: string;
  path: string;
  group?: Group;
  createdBy?: User;
  // Present on GET /invites/:token. OPEN → the `guests` roster; CLOSED → the `target`
  // recognition. A closed invite whose target was already taken over (or left) degrades to
  // OPEN + `targetUnavailable`, so the opener still has a way in.
  kind?: 'OPEN' | 'CLOSED';
  guests?: InviteGuest[];
  target?: ClaimStubSummary;
  targetUnavailable?: boolean;
};

// One of the stub's recent matches, from the stub's own perspective.
export type ClaimRecentMatch = {
  id: string;
  result: 'WIN' | 'LOSS';
  partners: string[];
  opponents: string[];
  scoreFor: number;
  scoreAgainst: number;
  playedAt: string;
};

export type ClaimStubSummary = {
  groupMemberId: string;
  displayName: string;
  rank: number | null;
  rating: number;
  matchesCount: number;
  recentMatches: ClaimRecentMatch[];
};

// Result of accepting a CLAIM invite. The shared-match case is a real outcome the
// claim page renders (the two proved to be different people), not an error.
export type SharedMatchPlayer = {
  name: string;
  isStub: boolean;
  isYou: boolean;
};

export type SharedMatchTeam = {
  team: 'TEAM_A' | 'TEAM_B';
  score: number;
  won: boolean;
  players: SharedMatchPlayer[];
};

export type SharedMatch = {
  id: string;
  playedAt: string;
  teams: SharedMatchTeam[];
};

export type ClaimAdmin = {
  groupMemberId: string;
  name: string;
};

export type ClaimMembership = {
  id: string;
  groupId: string;
  userId: string | null;
  displayName: string | null;
  rating: number;
  role: 'ADMIN' | 'MEMBER';
  group: Group;
  user: User;
};

export type AcceptClaimResult =
  | { outcome: 'CLAIMED'; membership: ClaimMembership }
  | {
      outcome: 'BLOCKED';
      stubName: string;
      sharedMatches: SharedMatch[];
      admins: ClaimAdmin[];
    };

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export type MatchTeam = 'TEAM_A' | 'TEAM_B';

export type MatchPlayer = {
  id: string;
  matchId: string;
  groupId: string;
  groupMemberId: string;
  team: MatchTeam;
  position: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;

  rankBefore: number | null;
  rankAfter: number | null;
  rankDelta: number | null;
  movementDirection: 'UP' | 'DOWN' | null;
  movementPositions: number | null;

  ratingDeviationBefore: number | null;
  ratingDeviationAfter: number | null;
  ratingVolatilityBefore: number | null;
  ratingVolatilityAfter: number | null;
  ratingMuBefore: number | null;
  ratingMuAfter: number | null;
  ratingSigmaBefore: number | null;
  ratingSigmaAfter: number | null;

  playedAt: string;
  createdAt: string;
  updatedAt: string;
  groupMember?: GroupMember;
};

export type Match = {
  id: string;
  groupId: string;
  gamesA: number;
  gamesB: number;
  winnerTeam: MatchTeam;
  teamAExpected: number | null;
  teamBExpected: number | null;
  teamAActual: number | null;
  teamBActual: number | null;
  teamARatingBefore: number | null;
  teamBRatingBefore: number | null;
  teamARatingAfter: number | null;
  teamBRatingAfter: number | null;
  ratingAlgorithm: string;
  playedAt: string;
  createdAt: string;
  updatedAt: string;
  players: MatchPlayer[];
};

// A match player is either an existing group member or a brand-new guest named
// inline. The stub for a guest is created on the backend within the match
// transaction, so it only exists once the match is actually registered.
export type MatchPlayerInput = { memberId: string } | { name: string };

export type CreateMatchInput = {
  teamAPlayer1: MatchPlayerInput;
  teamAPlayer2: MatchPlayerInput;
  teamBPlayer1: MatchPlayerInput;
  teamBPlayer2: MatchPlayerInput;
  gamesA: number;
  gamesB: number;
  playedAt?: string;
};

export type NotificationType =
  | 'CLAIM_OFFER'
  | 'CLAIM_OFFER_DECLINED'
  // Deprecated — pre-email-anchored claim flow (no longer generated).
  | 'CLAIM_REQUEST'
  | 'CLAIM_APPROVED'
  | 'CLAIM_DECLINED'
  | 'CLAIM_INVITE';

export type NotificationAction = { label: string; href: string };

// In-app notification. `data` is a denormalized render payload frozen at write time.
export type AppNotification = {
  id: string;
  type: NotificationType;
  groupId: string | null;
  actorUserId: string | null;
  data: {
    title?: string;
    body?: string;
    meta?: string;
    actions?: NotificationAction[];
  };
  read: boolean;
  acted: boolean;
  createdAt: string;
};

// Email-anchored claim. State the admin sees on a stub, and the offer the recipient confirms.
export type ClaimEmailStatus = 'PENDING' | 'DECLINED';

export type ClaimEmailState = {
  email: string | null;
  status: ClaimEmailStatus | null;
  notified: boolean;
  accountExists: boolean;
};

export type ClaimOfferDetail = {
  stubGroupMemberId: string;
  groupId: string;
  groupName: string;
  stub: ClaimStubSummary;
};
