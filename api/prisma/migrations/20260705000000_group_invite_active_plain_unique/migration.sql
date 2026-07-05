-- Dedupe legacy duplicates first: revoke all but the newest active plain invite per slot.
-- Newest = (createdAt DESC, id DESC), matching create()'s reuse orderBy so the surviving
-- row is exactly the one the reuse query would have returned.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "groupId", COALESCE("targetGroupMemberId", '')
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS rn
  FROM "GroupInvite"
  WHERE "revokedAt" IS NULL AND "expiresAt" IS NULL AND "maxUses" IS NULL
)
UPDATE "GroupInvite" gi
SET "revokedAt" = now()
FROM ranked
WHERE gi.id = ranked.id AND ranked.rn > 1;

-- Enforce "one active plain invite per (group, target)" structurally. COALESCE collapses
-- the null-target opens to a single slot per group (a plain unique index would treat each
-- NULL as distinct); the partial predicate matches the active-plain set create() reuses.
CREATE UNIQUE INDEX "GroupInvite_active_plain_key"
ON "GroupInvite" ("groupId", COALESCE("targetGroupMemberId", ''))
WHERE "revokedAt" IS NULL AND "expiresAt" IS NULL AND "maxUses" IS NULL;
