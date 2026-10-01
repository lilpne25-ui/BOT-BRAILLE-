import { OutboundDocument, OutboundMessage, WhatsAppProviderMode } from "@/modules/whatsapp/integration-types";
import { sendBaileysDocument, sendBaileysReply } from "@/modules/whatsapp/baileys-client";

function getProviderMode(): WhatsAppProviderMode {
  const mode = (process.env.WHATSAPP_PROVIDER ?? "mock").toLowerCase();
  if (mode === "meta" || mode === "twilio" || mode === "baileys") return mode;
  return "mock";
}

async function sendWithMeta(outbound: OutboundMessage) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID for meta provider.");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: outbound.to,
      type: "text",
      text: {
        body: outbound.text
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meta send failed (${response.status}): ${detail}`);
  }

  return response.json();
}

async function sendWithTwilio(outbound: OutboundMessage) {
  const accountSid = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const authToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const fromNumber = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID for twilio provider.");
  }

  const body = new URLSearchParams();
  body.set("From", fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`);
  body.set("To", outbound.to.startsWith("whatsapp:") ? outbound.to : `whatsapp:${outbound.to}`);
  body.set("Body", outbound.text);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio send failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export async function sendWhatsAppReply(outbound: OutboundMessage) {
  const mode = getProviderMode();
  if (mode === "mock") {
    return {
      provider: "mock",
      id: `mock-${Date.now()}`,
      to: outbound.to
    };
  }

  if (mode === "meta") {
    return sendWithMeta(outbound);
  }

  if (mode === "baileys") {
    return sendBaileysReply(outbound);
  }

  return sendWithTwilio(outbound);
}

export async function sendWhatsAppDocument(outbound: OutboundDocument) {
  const mode = getProviderMode();
  if (mode === "mock") {
    return {
      provider: "mock",
      id: `mock-doc-${Date.now()}`,
      to: outbound.to
    };
  }

  if (mode === "baileys") {
    return sendBaileysDocument(outbound);
  }

  throw new Error(`Document send is not implemented for provider mode: ${mode}`);
}
