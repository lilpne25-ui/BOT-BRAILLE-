import { describe, expect, it } from "vitest";
import {
  detectWebhookProvider,
  normalizeWebhookPayload
} from "@/modules/whatsapp/payload-normalizer";

function metaPayload(message: Record<string, unknown>, metadata?: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID_TEST",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: metadata ?? {
                display_phone_number: "5215500000000",
                phone_number_id: "PHONE_NUMBER_ID_TEST"
              },
              contacts: [{ profile: { name: "Cliente Prueba" }, wa_id: "5215500000001" }],
              messages: [message]
            }
          }
        ]
      }
    ]
  };
}

const textMessage = {
  from: "5215500000001",
  id: "wamid.TEST_A",
  timestamp: "1759300000",
  type: "text",
  text: { body: "quiero cotizar" }
};

describe("normalizeWebhookPayload (Meta)", () => {
  it("extrae message.id y metadata.phone_number_id", () => {
    const [message] = normalizeWebhookPayload(metaPayload(textMessage), "application/json");

    expect(message.providerMessageId).toBe("wamid.TEST_A");
    expect(message.channelId).toBe("PHONE_NUMBER_ID_TEST");
    expect(message.messageText).toBe("quiero cotizar");
  });

  it("sin message.id deja providerMessageId vacío (no inventa un UUID)", () => {
    const { id: _omit, ...withoutId } = textMessage;
    const [message] = normalizeWebhookPayload(metaPayload(withoutId), "application/json");

    expect(message.providerMessageId).toBeUndefined();
    expect(message.messageText).toBe("quiero cotizar");
  });

  it("sin metadata deja channelId vacío", () => {
    const [message] = normalizeWebhookPayload(metaPayload(textMessage, {}), "application/json");

    expect(message.channelId).toBeUndefined();
  });
});

describe("detectWebhookProvider", () => {
  it("form-urlencoded es Twilio; lo demás es Meta", () => {
    expect(detectWebhookProvider("application/x-www-form-urlencoded; charset=utf-8")).toBe("TWILIO");
    expect(detectWebhookProvider("application/json")).toBe("META");
    expect(detectWebhookProvider(null)).toBe("META");
  });
});
