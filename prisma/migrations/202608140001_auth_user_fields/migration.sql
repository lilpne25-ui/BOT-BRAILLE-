-- Bring the persisted User table in line with the authentication-aware Prisma schema.
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "permissions" JSONB,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_role_isActive_idx" ON "public"."User"("role", "isActive");
