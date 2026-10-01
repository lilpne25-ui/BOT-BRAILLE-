import { NormalizedInboundMessage } from "@/modules/whatsapp/integration-types";

function normalizePhone(value: string) {
  return value.replace(/^whatsapp:/i, "").trim();
}

function fromMetaPayload(payload: any): NormalizedInboundMessage[] {
  const entry = Array.isArray(payload?.entry) ? payload.entry : [];
  const results: NormalizedInboundMessage[] = [];

  for (const item of entry) {
    const changes = Array.isArray(item?.changes) ? item.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const contactName = contacts[0]?.profile?.name as string | undefined;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const channelId = phoneNumberId ? String(phoneNumberId) : undefined;

      for (const message of messages) {
        const messageType = String(message?.type ?? "unknown");
        const text =
          messageType === "text"
            ? String(message?.text?.body ?? "")
            : messageType === "button"
              ? String(message?.button?.text ?? "")
              : messageType === "interactive"
                ? String(message?.interactive?.button_reply?.title ?? message?.interactive?.list_reply?.title ?? "")
                : `[${messageType}]`;

        results.push({
          phone: normalizePhone(String(message?.from ?? contacts[0]?.wa_id ?? "")),
          name: contactName,
          messageText: text,
          messageType,
          timestamp: new Date(Number(message?.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
          // No invented fallback: a missing id must stay missing so it is never mistaken
          // for a real provider identity.
          providerMessageId: message?.id ? String(message.id) : undefined,
          channelId,
          rawPayload: message
        });
      }
    }
  }

  return results.filter((row) => row.phone && row.messageText);
}

function fromTwilioForm(form: URLSearchParams): NormalizedInboundMessage[] {
  const text = form.get("Body") ?? "";
  const from = form.get("From") ?? "";
  const profileName = form.get("ProfileName") ?? undefined;
  const messageSid = form.get("MessageSid") ?? form.get("SmsMessageSid") ?? crypto.randomUUID();
  const messageType = (form.get("NumMedia") && Number(form.get("NumMedia")) > 0) ? "media" : "text";

  if (!from || !text) return [];

  return [
    {
      phone: normalizePhone(from),
      name: profileName,
      messageText: text,
      messageType,
      timestamp: new Date().toISOString(),
      providerMessageId: messageSid,
      rawPayload: Object.fromEntries(form.entries())
    }
  ];
}

export function detectWebhookProvider(contentType: string | null): "META" | "TWILIO" {
  return contentType?.includes("application/x-www-form-urlencoded") ? "TWILIO" : "META";
}

export function normalizeWebhookPayload(payload: unknown, contentType: string | null): NormalizedInboundMessage[] {
  if (detectWebhookProvider(contentType) === "TWILIO") {
    const form = payload instanceof URLSearchParams ? payload : new URLSearchParams();
    return fromTwilioForm(form);
  }

  return fromMetaPayload(payload as any);
}
