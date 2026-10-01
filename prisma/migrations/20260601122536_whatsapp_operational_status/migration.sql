-- CreateEnum
CREATE TYPE "public"."ConversationOperationalStatus" AS ENUM ('CAPTURING_DATA', 'REQUIRES_SALES', 'PRELIM_QUOTE_CREATED', 'SEND_ERROR');

-- AlterTable
ALTER TABLE "public"."ConversationSession"
ADD COLUMN "operationalStatus" "public"."ConversationOperationalStatus" NOT NULL DEFAULT 'CAPTURING_DATA',
ADD COLUMN "lastError" TEXT;
