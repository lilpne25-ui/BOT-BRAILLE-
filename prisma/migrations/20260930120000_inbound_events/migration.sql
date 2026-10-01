-- Inbound event idempotency ledger (Phase 1).
-- Additive only: creates one enum, one table and two indexes. Touches no existing object.
-- Generated offline with:
--   prisma migrate diff --from-schema-datamodel <baseline schema.prisma> --to-schema-datamodel prisma/schema.prisma --script
-- Do NOT apply to a shared/real database until the migration history (F-04) is resolved.
--
-- Manual rollback (only if the table holds nothing worth keeping):
--   DROP TABLE "InboundEvent";
--   DROP TYPE "InboundEventStatus";

-- CreateEnum
CREATE TYPE "InboundEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "InboundEvent" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "provider" TEXT NOT NULL,
    "channelId" TEXT,
    "providerMessageId" TEXT,
    "messageType" TEXT NOT NULL,
    "status" "InboundEventStatus" NOT NULL DEFAULT 'PROCESSING',
    "outcome" TEXT,
    "errorCode" TEXT,
    "transcribed" BOOLEAN NOT NULL DEFAULT false,
    "conversationId" TEXT,
    "sessionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundEvent_dedupeKey_key" ON "InboundEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "InboundEvent_status_receivedAt_idx" ON "InboundEvent"("status", "receivedAt");
