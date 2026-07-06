# Data Model

Reverse-engineered from `api/prisma/schema.prisma` (verified 2026-06-17). This
describes entities, relationships, cardinality, and ownership. For column-level
detail, enums, and indexes see
[`../engineering/database-reference.md`](../engineering/database-reference.md).

The model has two halves:

- **Source-of-truth entities** — written directly by domain workflows.
- **Derived read models** — rebuilt by the projection cascade (Section 3 of
  [`system-architecture.md`](./system-architecture.md)). Never hand-edit these;
  they are reconstructable from source-of-truth data.

---

## 1. Entity map

```txt
User ──< GroupMember >── Group
 │           │             │
 │           │             ├──< Match >──< MatchPlayer >── GroupMember
 │           │             ├──< GroupInvite
 │           │             ├──< FeedItem
 │           │             ├──< RankingMovement
 │           │             ├──< ProcessingJob
 │           │             ├──1 GroupRankingProjection        (derived)
 │           │             ├──1 GroupHomeSummary              (derived)
 │           │             ├──< MatchRankingSnapshot          (derived)
 │           │             ├──< GroupMemberStats              (derived, 1 per member)
 │           │             ├──< GroupMemberPartnerStats       (derived, 1 per member-pair)
 │           │             └──< GroupHighlight                (derived, 1 per member+type)
```

`>──<` = many-to-many through a join entity. `──<` = one-to-many. `──1` = optional
one-to-one.

---

## 2. Source-of-truth entities

### User

Global account. Identity is global; **competitive state is never on `User`** —
it lives on `GroupMember`. Fields: `firstName`, `lastName`, `email` (unique),
`passwordHash`. Display name is derived as `firstName + lastName` at read time
(persisted display names were intentionally removed — migration
`20260522120000_remove_persisted_display_names`).

### Group

A competitive community. `visibility` is an enum currently with a single value
`PUBLIC`. `avatarColor` is a palette key (same set as `User.avatarColor`) chosen at
creation; the frontend owns key→gradient. Has one creator (`createdBy`). Deleting a
group cascades to nearly all group-scoped data.

### GroupMember

The **central join entity** between `User` and `Group`, and the anchor for all
competitive state:

- `rating` (default `1000`) + future-rating fields
  (`ratingDeviation/Volatility/Mu/Sigma`), `ratingAlgorithm` (`BEACH_ELO_V1`).
- `currentRank`, `role` (`ADMIN`/`MEMBER`), `leftAt` (soft membership exit).
- `userId` is **nullable**: a member can be a **stub player** (jogador sem conta) —
  created inline so someone can be scored today without owning an account. Stubs
  carry their name in `displayName`; real members leave it null and resolve their
  name from the linked `User`. See `docs/product/guests-and-invites.md`.
- Unique on `(groupId, userId)` — a user has at most one membership per group;
  Postgres treats NULLs as distinct, so a group can hold many stubs.
- Also unique on `(id, groupId)` so other tables can FK by the composite key
  (this scopes every child row to a group at the database level).

Rejoining reuses the same row (sets `leftAt = null`); see
`group-invites.service.ts`.

### Match

A doubles match inside a group. Exactly 4 players, 2 teams, no draws. Fields:
`gamesA/gamesB`, `winnerTeam`, team-level rating snapshots
(`teamA/BExpected/Actual`, `teamA/BRatingBefore/After`), `ratingAlgorithm`,
`playedAt`. Lifecycle/processing fields: `processingStatus`
(`PENDING/PROCESSING/PROCESSED/FAILED`), `processedAt`, `processingError`,
`deletedAt` (**soft delete** — reads filter `deletedAt IS NULL`).

### MatchPlayer

One row per participant (4 per match). Stores **historical snapshots** so old
matches stay explainable after later ratings change:

- rating: `ratingBefore/After/Delta` (+ future-algorithm before/after fields).
- ranking: `rankBefore/After/Delta`, `movementDirection`, `movementPositions`.
- `team`, `position`, `playedAt`.
- Unique on `(matchId, groupMemberId)` and `(matchId, team, position)`.

### GroupInvite

Tokenized invite link. `token` (unique), optional `expiresAt`/`revokedAt`,
`uses`/`maxUses`, and an optional `targetGroupMemberId`: **null = open** (the group's roster
link — the opener self-identifies against the unclaimed guests) and **set = closed**
(addressed to one guest, deep-links to its recognition). Public read via `/invites/:token`;
join via `/invites/:token/accept`; take over a guest via `/invites/:token/claim/:guestId`.
The older email-anchored claim on `GroupMember.claimEmail*` still coexists (see below).

### FeedItem

Persisted product moment (not a raw activity log). Key fields: `type`
(`GROUP_CREATED`, `MEMBER_JOINED`, `MATCH_CLOSE`, `MATCH_BLOWOUT`, `UPSET_WIN`,
`RANKING_MOVEMENT`), `scope` (`GROUP`/`USER`), `visibility`
(`GROUP_MEMBERS`/`SOCIAL_CIRCLE`/`PUBLIC`/`PRIVATE`), `actorUser` /
`actorGroupMember` / `subjectUser`, optional `group`/`match`, `importanceScore`,
type-specific `metadata` (JSON), `occurredAt`. Unique on `(type, matchId)` keeps
match-derived items idempotent. See
[`../product/feed-events.md`](../product/feed-events.md).

### ProcessingJob

The job-queue table that drives the async pipeline. `type`
(`MATCH_CREATED/UPDATED/DELETED`, `GROUP_RANKING_REBUILD`;
`PLATFORM_TRENDING_PLAYERS_REBUILD` deprecated), `scope` (`GROUP`; `PLATFORM` deprecated), `status`
(`PENDING/PROCESSING/DONE/FAILED`), optional `group`/`match`, `dedupeKey`,
`payload` (JSON), retry fields (`attemptCount`, `maxAttempts`, `availableAt`,
`lockedAt`, `lockedBy`, `lastError`, `processedAt`). See
[`processing-jobs.md`](./processing-jobs.md).

### Notification

Per-user in-app notification — the opposite of `FeedItem` (which is group-public
with no recipient). `type` (`CLAIM_OFFER` to the offer recipient, `CLAIM_OFFER_DECLINED`
to admins, `GUEST_TAKEN_OVER` to admins when a guest is taken over via an invite; the old
`CLAIM_REQUEST/APPROVED/DECLINED/INVITE` are deprecated and no longer written),
`recipientUser` (cascade), optional `group`/`actorUserId`/`targetGroupMemberId`, a
denormalized `data` (JSON: title/body/meta/actions, frozen at write so old messages never
re-render), and read state (`readAt`, `actedAt`). Not derived — written directly when the
triggering event happens. Powers the claim / take-over flows
([`../product/guests-and-invites.md`](../product/guests-and-invites.md)).

### Email-anchored claim (on GroupMember, no own table)

Claiming a stub has no dedicated table — its state lives in three `GroupMember` columns on
stubs (`userId = null`): `claimEmail` (the email an admin anchored), `claimEmailStatus`
(`PENDING`/`DECLINED`), and `claimEmailNotifiedAt` (notify-once dedupe). `@@unique([groupId,
claimEmail])` keeps one anchored email per stub; `@@index([claimEmail])` powers the
registration hook that offers waiting stubs to a new account. The email value is the offer's
nonce — editing it invalidates outstanding confirms (the confirm authorizes by
`user.email == stub.claimEmail`). The claim/merge core is `ClaimService.performClaim`. See
[`../product/guests-and-invites.md`](../product/guests-and-invites.md).

---

## 3. Derived read models (rebuilt by projections)

| Model                     | Grain                    | Rebuilt by                   | Holds                                                                                                                               |
| ------------------------- | ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `MatchRankingSnapshot`    | 1 per match              | rating projection            | `previousLeaders`, `currentLeaders`, `dethronedLeaders`, `movements` (JSON), `algorithmVersion`                                     |
| `RankingMovement`         | 1 per (match, member)    | ranking-movement service     | `direction`, `positions`, prev/current rank+rating, `passedGroupMemberIds`, `isVisible`, `occurredAt`, `invalidatedAt`              |
| `GroupMemberStats`        | 1 per member             | stats projection             | `matchesCount`, `winsCount`                                                                                                         |
| `GroupMemberPartnerStats` | 1 per (member, teammate) | partner-stats projection     | `matchesTogether`, `winsTogether` (directional; powers the profile "melhor dupla" / "suas duplas")                                  |
| `GroupRankingProjection`  | 1 per group              | projection status tracker    | `status`, `version`, `lastProcessedMatchId/At`, `lastError`                                                                         |
| `GroupHomeSummary`        | 1 per group              | home-summary service         | `membersCount`, `leaders` (JSON), `lastRelevantFeedItem`, `projectionStatus`                                                        |
| `GroupHighlight`          | 1 per (member, type)     | weekly-highlights projection | `type` (six achievements), `value`, `score`, `anchorAt` (7-day window key), `algorithmVersion` — powers the home "Essa semana" rail |

These are caches for fast reads and stored historical truth. If they look wrong,
the fix is usually to re-run the relevant projection (enqueue a
`GROUP_RANKING_REBUILD` job), not to patch
rows.

---

## 4. Cardinality & integrity rules

- A `User` has **0..N** memberships; a `Group` has **1..N** members; the pair is
  unique (`@@unique([groupId, userId])`).
- A `Match` has **exactly 4** `MatchPlayer` rows across 2 teams; a player cannot
  appear twice (enforced in `MatchesService.validateMatchBody` + DB uniques).
- A match **cannot end in a draw**; `winnerTeam` is derived from the score.
- Group-scoped child rows FK on the composite `(id, groupId)` of their parent, so
  cross-group references are impossible at the DB level.
- `onDelete`: group deletion cascades to members, matches, invites, feed items,
  jobs, and all derived models. `MatchPlayer.groupMember` uses `Restrict` (a
  member who has played cannot be hard-deleted); feed actor/subject relations use
  `SetNull`/`Cascade` per field.

---

## 5. Conventions baked into the schema

- **IDs**: `String @id @default(uuid())` everywhere (read models use the parent
  id as PK, e.g. `GroupHomeSummary.groupId`).
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt` on
  mutable tables.
- **Money/score-free**: ratings are `Float`, counts are `Int`.
- **Soft delete** only on `Match` (`deletedAt`); membership exit via `leftAt`.
- **JSON columns** (`metadata`, `leaders`, `movements`, …) are type-specific and
  validated in code, not the DB.
- **Algorithm versioning**: rating-bearing rows carry `ratingAlgorithm` /
  `algorithmVersion` (`BEACH_ELO_V1`) so future migrations can identify the
  producer.
  </content>
