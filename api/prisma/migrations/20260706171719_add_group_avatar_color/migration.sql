-- Groups gain a stored avatar colour (chosen at creation). Add the column nullable,
-- backfill existing groups with a deterministic, varied palette key (so they aren't
-- all the same once cards render the stored colour instead of the derived hue), then
-- make it NOT NULL with a 'blue' default safety net. Keep the key list/order in sync
-- with api/src/common/avatar-color.ts and web/src/lib/avatar-color.ts.
-- `hashtext & 7` (low 3 bits → 0..7) avoids abs(INT_MIN) overflow, which would abort
-- the whole UPDATE with "integer out of range".

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "avatarColor" TEXT;

UPDATE "Group"
SET "avatarColor" = (
  ARRAY['blue', 'green', 'teal', 'amber', 'red', 'magenta', 'violet', 'gold']
)[(hashtext("id") & 7) + 1]
WHERE "avatarColor" IS NULL;

ALTER TABLE "Group" ALTER COLUMN "avatarColor" SET NOT NULL,
ALTER COLUMN "avatarColor" SET DEFAULT 'blue';
