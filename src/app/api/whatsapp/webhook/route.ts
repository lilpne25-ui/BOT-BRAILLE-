export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  claimInboundEvent,
  completeInboundEvent,
  inboundErrorCode,
  isInboundIdempotencyEnabled
} from "@/modules/whatsapp/inbound-events";
import { NormalizedInboundMessage } from "@/modules/whatsapp/integration-types";
import { detectWebhookProvider, normalizeWebhookPayload } from "@/modules/whatsapp/payload-normalizer";
import { processInboundWhatsAppMessage } from "@/modules/whatsapp/webhook-processor";

// Claims the event before any side effect. A duplicate or an event without a
// verifiable identity never reaches processInboundWhatsAppMessage().
async function processMetaMessageOnce(message: NormalizedInboundMessage) {
  const claim = await claimInboundEvent({
    provider: "META",
    channelId: message.channelId,
    providerMessageId: message.providerMessageId,
    messageType: message.messageType
  });

  if (claim.status === "duplicate") {
    console.info("WhatsApp inbound duplicate skipped", {
      provider: "META",
      eventId: claim.eventId,
      existingStatus: claim.existingStatus
    });
    return;
  }

  if (claim.status === "unverifiable") {
    console.warn("WhatsApp inbound event without verifiable identity skipped", {
      provider: "META",
      eventId: claim.eventId,
      reason: claim.reason
    });
    await completeInboundEvent(claim.eventId, {
      status: "IGNORED",
      outcome: claim.reason
    });
    return;
  }

  try {
    await processInboundWhatsAppMessage(message, {
      inboundEventId: claim.eventId
    });
  } catch (error) {
    await completeInboundEvent(claim.eventId, {
      status: "FAILED",
      errorCode: inboundErrorCode(error)
    }).catch((markError) => {
      console.error("WhatsApp inbound event could not be marked FAILED", {
        eventId: claim.eventId,
        errorCode: inboundErrorCode(markError)
      });
    });
    throw error;
  }
}

function getQueryParam(url: string, key: string) {
  return new URL(url).searchParams.get(key);
}

export async function GET(request: NextRequest) {
  const mode = getQueryParam(request.url, "hub.mode");
  const challenge = getQueryParam(request.url, "hub.challenge");
  const verifyToken = getQueryParam(request.url, "hub.verify_token");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: "WHATSAPP_VERIFY_TOKEN is not configured" }, { status: 500 });
  }

  if (mode === "subscribe" && verifyToken === expectedToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    let normalizedPayload;

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      normalizedPayload = normalizeWebhookPayload(new URLSearchParams(Array.from(form.entries()) as [string, string][]), contentType);
    } else {
      const body = await request.json().catch(() => ({}));
      normalizedPayload = normalizeWebhookPayload(body, contentType);
    }

    if (!normalizedPayload.length) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Idempotency currently applies to Meta only; Twilio keeps the legacy path.
    const useIdempotency =
      detectWebhookProvider(contentType) === "META" &&
      isInboundIdempotencyEnabled();

    for (const message of normalizedPayload) {
      if (useIdempotency) {
        await processMetaMessageOnce(message);
      } else {
        await processInboundWhatsAppMessage(message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
