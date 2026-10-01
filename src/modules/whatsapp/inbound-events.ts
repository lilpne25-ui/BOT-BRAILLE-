import { createHash } from "node:crypto";
import { InboundEventStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InboundEventProvider = "META" | "TWILIO" | "BAILEYS";

/**
 * Identity of an inbound event as reported by the provider.
 * - META:    channelId = metadata.phone_number_id, providerMessageId = message.id (wamid)
 * - TWILIO:  channelId = AccountSid,               providerMessageId = MessageSid
 * - BAILEYS: channelId = linked account,           providerMessageId = key.id,
 *            chatScope = key.remoteJid (Baileys ids are only guaranteed unique per chat)
 * chatScope is only hashed, never stored. Message text is never part of the identity:
 * two identical texts with different provider ids are two different events.
 */
export type InboundEventIdentityInput = {
  provider: InboundEventProvider;
  channelId?: string | null;
  providerMessageId?: string | null;
  chatScope?: string | null;
};

export type InboundEventIdentityProblem =
  | "missing_provider_message_id"
  | "missing_channel_id"
  | "missing_chat_scope";

export type ResolvedInboundEventIdentity =
  | {
      ok: true;
      dedupeKey: string;
      channelId: string;
      providerMessageId: string;
    }
  | {
      ok: false;
      reason: InboundEventIdentityProblem;
      channelId: string | null;
      providerMessageId: string | null;
    };

export type ClaimInboundEventInput = InboundEventIdentityInput & {
  messageType: string;
};

export type ClaimInboundEventResult =
  // This caller owns the event and may run its side effects.
  | { status: "claimed"; eventId: string }
  // Another delivery already owns this identity, whatever its current status
  // (PROCESSING, PROCESSED, IGNORED or FAILED). At-most-once: do not reprocess.
  | {
      status: "duplicate";
      eventId: string | null;
      existingStatus: InboundEventStatus | null;
    }
  // The provider gave no usable identity. The event is recorded but cannot be
  // deduplicated; the caller decides how to handle it.
  | {
      status: "unverifiable";
      eventId: string;
      reason: InboundEventIdentityProblem;
    };

export type InboundEventCompletion = {
  status: Exclude<InboundEventStatus, "PROCESSING">;
  outcome?: string;
  // Short machine-readable code. Never raw error text (it may contain PII).
  errorCode?: string;
  transcribed?: boolean;
  conversationId?: string;
  sessionId?: string;
};

type InboundEventStore = Pick<PrismaClient, "inboundEvent">;

const DEDUPE_KEY_VERSION = "inbound-event:v1";
const PROVIDER_MESSAGE_ID_HASH_VERSION = "inbound-event:provider-message-id:v1";

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sha256Hex(tuple: unknown[]) {
  return createHash("sha256")
    .update(JSON.stringify(tuple), "utf8")
    .digest("hex");
}

/**
 * The provider message id is stored only as this hash (a Meta wamid can encode the
 * sender's number). To find an event while debugging, hash the known id and query
 * InboundEvent.providerMessageIdHash.
 */
export function hashProviderMessageId(providerMessageId: string) {
  return sha256Hex([PROVIDER_MESSAGE_ID_HASH_VERSION, providerMessageId.trim()]);
}

/**
 * sha256 (hex) of the JSON array
 *   ["inbound-event:v1", provider, channelId, providerMessageId, chatScope]
 * chatScope is "" for providers that do not use it. A JSON array is used instead of
 * joining with a separator so that ("a|b", "c") and ("a", "b|c") can never collide.
 * Changing this function changes every key: bump DEDUPE_KEY_VERSION if you ever do.
 */
export function buildInboundDedupeKey(parts: {
  provider: InboundEventProvider;
  channelId: string;
  providerMessageId: string;
  chatScope?: string | null;
}) {
  return sha256Hex([
    DEDUPE_KEY_VERSION,
    parts.provider,
    parts.channelId,
    parts.providerMessageId,
    parts.chatScope ?? ""
  ]);
}

export function resolveInboundEventIdentity(
  input: InboundEventIdentityInput
): ResolvedInboundEventIdentity {
  const channelId = clean(input.channelId);
  const providerMessageId = clean(input.providerMessageId);
  const chatScope = clean(input.chatScope);

  if (!providerMessageId) {
    return { ok: false, reason: "missing_provider_message_id", channelId, providerMessageId };
  }

  if (!channelId) {
    return { ok: false, reason: "missing_channel_id", channelId, providerMessageId };
  }

  if (input.provider === "BAILEYS" && !chatScope) {
    return { ok: false, reason: "missing_chat_scope", channelId, providerMessageId };
  }

  return {
    ok: true,
    dedupeKey: buildInboundDedupeKey({
      provider: input.provider,
      channelId,
      providerMessageId,
      chatScope: input.provider === "BAILEYS" ? chatScope : null
    }),
    channelId,
    providerMessageId
  };
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Atomically claims an inbound event. The unique index on dedupeKey decides the
 * winner: the INSERT either succeeds (claimed) or fails with P2002 (duplicate).
 * There is no SELECT-before-INSERT, so concurrent requests, processes or instances
 * cannot both win.
 *
 * Must NOT be called inside an interactive transaction: in PostgreSQL a unique
 * violation aborts the surrounding transaction.
 */
export async function claimInboundEvent(
  input: ClaimInboundEventInput,
  db: InboundEventStore = prisma
): Promise<ClaimInboundEventResult> {
  const identity = resolveInboundEventIdentity(input);
  const messageType = clean(input.messageType) ?? "unknown";

  if (!identity.ok) {
    const recorded = await db.inboundEvent.create({
      data: {
        dedupeKey: null,
        provider: input.provider,
        channelId: identity.channelId,
        providerMessageIdHash: identity.providerMessageId
          ? hashProviderMessageId(identity.providerMessageId)
          : null,
        messageType,
        outcome: identity.reason
      },
      select: { id: true }
    });

    return { status: "unverifiable", eventId: recorded.id, reason: identity.reason };
  }

  try {
    const created = await db.inboundEvent.create({
      data: {
        dedupeKey: identity.dedupeKey,
        provider: input.provider,
        channelId: identity.channelId,
        providerMessageIdHash: hashProviderMessageId(identity.providerMessageId),
        messageType
      },
      select: { id: true }
    });

    return { status: "claimed", eventId: created.id };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Informational read only; the decision was already made by the unique index.
    const existing = await db.inboundEvent.findUnique({
      where: { dedupeKey: identity.dedupeKey },
      select: { id: true, status: true }
    });

    return {
      status: "duplicate",
      eventId: existing?.id ?? null,
      existingStatus: existing?.status ?? null
    };
  }
}

/**
 * Moves a claimed event out of PROCESSING. Only PROCESSING events can be completed,
 * so a finished event is never rewritten. Returns false when nothing was updated.
 * Safe to call inside a transaction (it cannot raise a unique violation).
 */
export async function completeInboundEvent(
  eventId: string,
  completion: InboundEventCompletion,
  db: InboundEventStore | Prisma.TransactionClient = prisma
) {
  const { count } = await db.inboundEvent.updateMany({
    where: { id: eventId, status: "PROCESSING" },
    data: {
      status: completion.status,
      outcome: completion.outcome,
      errorCode: completion.errorCode,
      transcribed: completion.transcribed,
      conversationId: completion.conversationId,
      sessionId: completion.sessionId,
      completedAt: new Date()
    }
  });

  return count === 1;
}
