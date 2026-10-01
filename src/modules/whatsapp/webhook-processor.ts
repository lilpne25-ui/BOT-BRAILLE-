import {
  ConversationOperationalStatus,
  Prisma
} from "@prisma/client";
import {
  FALLBACK_CONTACT_PHONE,
  buildCrmPayloadFromSession,
  processConversationMessage
} from "@/lib/conversation-engine";
import { prisma } from "@/lib/prisma";
import {
  mapConversationRoleToDb,
  mapConversationStatusFromDb,
  mapConversationStatusToDb
} from "@/modules/db/mappers";
import { upsertHumanReviewLead } from "@/modules/leads/upsert-human-review-lead";
import { completeInboundEvent } from "@/modules/whatsapp/inbound-events";
import { NormalizedInboundMessage } from "@/modules/whatsapp/integration-types";
import { sendWhatsAppReply } from "@/modules/whatsapp/provider";

type ActiveSessionRef = {
  conversationId: string;
  session: {
    id: string;
    status: "IDLE" | "COLLECTING" | "COMPLETED" | "CLOSED";
    startedAt: Date;
    updatedAt: Date;
    currentStepIndex: number;
    capturedData: Prisma.JsonValue | null;
    intentDetected: boolean;
    completedAt: Date | null;
    folio: string | null;
    estimatedAmount: number | null;
  };
};

type HumanReviewOutcome = {
  leadId: string;
  leadCode: string;
  created: boolean;
  ownerName: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isStrictQuoteStart(message: string) {
  return normalizeText(message).includes("quiero cotizar");
}

function asCapturedData(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function pickReplyTarget(message: NormalizedInboundMessage) {
  const payload = message.rawPayload as {
    key?: {
      remoteJidAlt?: unknown;
      senderPn?: unknown;
      participantPn?: unknown;
      remoteJid?: unknown;
    };
  };
  const key = payload?.key;
  const candidate =
    (typeof key?.remoteJidAlt === "string" &&
      key.remoteJidAlt) ||
    (typeof key?.senderPn === "string" &&
      key.senderPn) ||
    (typeof key?.participantPn === "string" &&
      key.participantPn) ||
    (typeof key?.remoteJid === "string" &&
      key.remoteJid) ||
    message.phone;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : message.phone;
}

function normalizePhoneForStorage(phone: string) {
  const raw = phone.trim();

  if (!raw) return raw;

  if (raw.includes("@")) {
    return raw;
  }

  const clean = raw.replace(/[^\d]/g, "");

  return clean || raw;
}

function contactPhoneFallback(phoneLike: string) {
  const raw = phoneLike.trim();
  const base = raw.includes("@")
    ? raw.split("@")[0] ?? raw
    : raw;
  const clean = base.replace(/[^\d]/g, "");

  if (!clean) return "+52 55 0000 0000";

  return clean.startsWith("52")
    ? `+${clean}`
    : `+52${clean}`;
}

async function findActiveSession(
  phone: string
): Promise<ActiveSessionRef | null> {
  const existing = await prisma.conversation.findFirst({
    where: {
      customerPhone: phone
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      sessions: {
        where: {
          status: {
            not: "CLOSED"
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!existing || !existing.sessions[0]) return null;

  return {
    conversationId: existing.id,
    session: existing.sessions[0]
  };
}

async function createFreshSession(
  phone: string,
  name?: string
): Promise<ActiveSessionRef> {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        source: "WHATSAPP",
        customerPhone: phone,
        customerName: name,
        status: "IDLE"
      }
    });

    const session = await tx.conversationSession.create({
      data: {
        conversationId: conversation.id,
        status: "IDLE",
        operationalStatus: "CAPTURING_DATA",
        currentStepIndex: 0,
        intentDetected: false
      }
    });

    return {
      conversationId: conversation.id,
      session
    };
  });
}

async function createHumanReviewOutcomeWithRetry(
  conversationId: string,
  sessionId: string,
  phone: string,
  payload: NonNullable<
    ReturnType<typeof buildCrmPayloadFromSession>
  >
): Promise<HumanReviewOutcome> {
  const whatsappPhone = contactPhoneFallback(phone);
  const contactPhone =
    payload.prospect.phone === FALLBACK_CONTACT_PHONE
      ? whatsappPhone
      : payload.prospect.phone;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const outcome = await upsertHumanReviewLead(tx, {
          companyName: payload.prospect.client,
          contactName: payload.prospect.contact,
          email: payload.prospect.email,
          phone: contactPhone,
          city: payload.prospect.city,
          projectType: payload.prospect.projectType,
          source: "WHATSAPP",
          painPoint: payload.prospect.painPoint,
          internalNotes: payload.prospect.internalNotes,
          nextAction: payload.prospect.nextAction
        });

        await tx.conversationSession.update({
          where: {
            id: sessionId
          },
          data: {
            folio: null,
            estimatedAmount: null,
            status: "COMPLETED",
            operationalStatus: "REQUIRES_SALES",
            completedAt: new Date(),
            lastError: null
          }
        });

        await tx.conversation.update({
          where: {
            id: conversationId
          },
          data: {
            leadId: outcome.lead.id,
            status: "COMPLETED"
          }
        });

        await tx.activityLog.createMany({
          data: [
            {
              type: outcome.created
                ? "LEAD_CREATED"
                : "STATUS_CHANGED",
              message: outcome.created
                ? `Lead ${outcome.lead.code} creado desde WhatsApp`
                : `Lead ${outcome.lead.code} actualizado desde WhatsApp`,
              leadId: outcome.lead.id,
              conversationId,
              conversationSessionId: sessionId,
              metadata: {
                deduplicated: !outcome.created,
                source: "WHATSAPP"
              }
            },
            {
              type: "STATUS_CHANGED",
              message: `Lead ${outcome.lead.code} pendiente de revisión humana`,
              leadId: outcome.lead.id,
              conversationId,
              conversationSessionId: sessionId,
              metadata: {
                workflowStatus: "PENDING_HUMAN_REVIEW",
                quoteCreated: false,
                assignedTo: outcome.ownerName
              }
            }
          ]
        });

        return {
          leadId: outcome.lead.id,
          leadCode: outcome.lead.code,
          created: outcome.created,
          ownerName: outcome.ownerName
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "No se pudo crear o actualizar el prospecto por conflicto de código."
  );
}

export async function processInboundWhatsAppMessage(
  message: NormalizedInboundMessage,
  options?: {
    // Set only when the caller already claimed the event (idempotency enabled).
    inboundEventId?: string;
  }
) {
  const inboundEventId = options?.inboundEventId;
  const storagePhone = normalizePhoneForStorage(
    message.phone
  );
  const strictStart = isStrictQuoteStart(
    message.messageText
  );
  let started = await findActiveSession(storagePhone);

  if (!started && !strictStart) {
    if (inboundEventId) {
      await completeInboundEvent(inboundEventId, {
        status: "IGNORED",
        outcome: "non_quote_message"
      });
    }

    return {
      ignored: true,
      reason: "non_quote_message"
    };
  }

  if (!started) {
    started = await createFreshSession(
      storagePhone,
      message.name
    );
  }

  const dbSession = started.session;
  const internalSession = {
    id: dbSession.id,
    status: mapConversationStatusFromDb(
      dbSession.status
    ),
    startedAt: dbSession.startedAt.toISOString(),
    updatedAt: dbSession.updatedAt.toISOString(),
    currentStepIndex: dbSession.currentStepIndex,
    capturedData: asCapturedData(
      dbSession.capturedData
    ),
    intentDetected: dbSession.intentDetected,
    completedAt: toIso(dbSession.completedAt),
    folio: dbSession.folio ?? undefined,
    estimatedAmount:
      dbSession.estimatedAmount ?? undefined
  };

  const result = await processConversationMessage(
    internalSession,
    message.messageText
  );
  const replyTarget = pickReplyTarget(message);
  let sendError: string | null = null;
  let crmOutcome: HumanReviewOutcome | null = null;

  const shouldCreateCrmOutcome =
    result.session.status === "completed" &&
    dbSession.status !== "COMPLETED" &&
    dbSession.status !== "CLOSED";

  if (shouldCreateCrmOutcome) {
    const payload = buildCrmPayloadFromSession(
      result.session
    );

    if (payload) {
      crmOutcome =
        await createHumanReviewOutcomeWithRetry(
          started.conversationId,
          dbSession.id,
          storagePhone,
          payload
        );

      result.session.folio = undefined;
      result.session.estimatedAmount = undefined;
      result.replies.push(
        `Expediente ${crmOutcome.leadCode} registrado en el CRM.`
      );

      if (crmOutcome.ownerName) {
        result.replies.push(
          `Responsable inicial: ${crmOutcome.ownerName}.`
        );
      }
    }
  }

  const assistantReply = result.replies.join("\n");

  if (assistantReply.trim()) {
    try {
      await sendWhatsAppReply({
        to: replyTarget,
        text: assistantReply
      });
    } catch (error) {
      sendError =
        error instanceof Error
          ? error.message
          : "Unknown provider error";
    }
  }

  let finalOperationalStatus: ConversationOperationalStatus;

  if (sendError) {
    finalOperationalStatus = "SEND_ERROR";
  } else if (
    crmOutcome ||
    result.postQuoteIntent === "needs_human" ||
    result.session.status === "completed" ||
    result.session.status === "idle"
  ) {
    finalOperationalStatus = "REQUIRES_SALES";
  } else {
    finalOperationalStatus = "CAPTURING_DATA";
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversationSession.update({
      where: {
        id: dbSession.id
      },
      data: {
        status: mapConversationStatusToDb(
          result.session.status
        ),
        operationalStatus: finalOperationalStatus,
        currentStepIndex:
          result.session.currentStepIndex,
        capturedData: result.session.capturedData,
        intentDetected:
          result.session.intentDetected,
        folio: null,
        estimatedAmount: null,
        completedAt: result.session.completedAt
          ? new Date(result.session.completedAt)
          : null,
        lastError: sendError
      }
    });

    await tx.conversation.update({
      where: {
        id: started.conversationId
      },
      data: {
        status: mapConversationStatusToDb(
          result.session.status
        ),
        leadId: crmOutcome?.leadId
      }
    });

    await tx.conversationMessage.create({
      data: {
        conversationId: started.conversationId,
        conversationSessionId: dbSession.id,
        role: mapConversationRoleToDb("user"),
        text: message.messageText,
        stepId: message.providerMessageId
          ? `provider:${message.providerMessageId}`
          : null
      }
    });

    for (const reply of result.replies) {
      await tx.conversationMessage.create({
        data: {
          conversationId: started.conversationId,
          conversationSessionId: dbSession.id,
          role: mapConversationRoleToDb(
            "assistant"
          ),
          text: reply
        }
      });
    }

    if (sendError) {
      await tx.activityLog.create({
        data: {
          type: "STATUS_CHANGED",
          message: `Error enviando WhatsApp: ${sendError}`,
          conversationId: started.conversationId,
          conversationSessionId: dbSession.id,
          leadId: crmOutcome?.leadId,
          metadata: {
            phone: message.phone,
            replyTarget,
            providerMessageId:
              message.providerMessageId,
            sendError
          }
        }
      });
    }

    // Same transaction as the conversation writes: either both commit or neither does.
    // NOTE: the reply was already sent above (known send-before-persist gap, Phase 2).
    if (inboundEventId) {
      await completeInboundEvent(
        inboundEventId,
        {
          status: "PROCESSED",
          outcome: sendError
            ? "reply_send_failed"
            : assistantReply.trim()
              ? "replied"
              : "no_reply",
          transcribed: Boolean(message.transcribedFromAudio),
          conversationId: started.conversationId,
          sessionId: dbSession.id
        },
        tx
      );
    }
  });

  return {
    conversationSessionId: dbSession.id,
    replies: result.replies,
    operationalStatus: finalOperationalStatus,
    leadCode: crmOutcome?.leadCode,
    quoteCreated: false
  };
}
