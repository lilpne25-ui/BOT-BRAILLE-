export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { normalizeWebhookPayload } from "@/modules/whatsapp/payload-normalizer";
import { processInboundWhatsAppMessage } from "@/modules/whatsapp/webhook-processor";

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

    for (const message of normalizedPayload) {
      await processInboundWhatsAppMessage(message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
