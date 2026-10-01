import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/whatsapp/webhook-processor", () => ({
  processInboundWhatsAppMessage: vi.fn()
}));

vi.mock("@/modules/whatsapp/inbound-events", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/whatsapp/inbound-events")>()),
  claimInboundEvent: vi.fn(),
  completeInboundEvent: vi.fn()
}));

import { POST } from "@/app/api/whatsapp/webhook/route";
import { claimInboundEvent, completeInboundEvent } from "@/modules/whatsapp/inbound-events";
import { processInboundWhatsAppMessage } from "@/modules/whatsapp/webhook-processor";

const claim = vi.mocked(claimInboundEvent);
const complete = vi.mocked(completeInboundEvent);
const processMessage = vi.mocked(processInboundWhatsAppMessage);

function metaMessage(id: string | undefined, text = "quiero cotizar") {
  return {
    from: "5215500000001",
    ...(id ? { id } : {}),
    timestamp: "1759300000",
    type: "text",
    text: { body: text }
  };
}

function metaRequest(messages: unknown[]) {
  const body = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "PHONE_NUMBER_ID_TEST" },
              contacts: [{ profile: { name: "Cliente Prueba" } }],
              messages
            }
          }
        ]
      }
    ]
  };

  return new NextRequest("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/whatsapp/webhook — idempotencia Meta", () => {
  const originalFlag = process.env.WHATSAPP_INBOUND_IDEMPOTENCY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    processMessage.mockResolvedValue({} as never);
    complete.mockResolvedValue(true);
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.WHATSAPP_INBOUND_IDEMPOTENCY;
    else process.env.WHATSAPP_INBOUND_IDEMPOTENCY = originalFlag;
    vi.restoreAllMocks();
  });

  it("flag ausente -> comportamiento legacy, sin claim", async () => {
    delete process.env.WHATSAPP_INBOUND_IDEMPOTENCY;

    const response = await POST(metaRequest([metaMessage("wamid.A")]));

    expect(response.status).toBe(200);
    expect(claim).not.toHaveBeenCalled();
    expect(processMessage).toHaveBeenCalledTimes(1);
    expect(processMessage.mock.calls[0]).toHaveLength(1);
  });

  it("flag en '0' -> legacy", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "0";

    await POST(metaRequest([metaMessage("wamid.A")]));

    expect(claim).not.toHaveBeenCalled();
    expect(processMessage).toHaveBeenCalledTimes(1);
  });

  it("flag on + claimed -> procesa con inboundEventId", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    claim.mockResolvedValue({ status: "claimed", eventId: "evt_1" });

    const response = await POST(metaRequest([metaMessage("wamid.A")]));

    expect(response.status).toBe(200);
    expect(claim).toHaveBeenCalledWith({
      provider: "META",
      channelId: "PHONE_NUMBER_ID_TEST",
      providerMessageId: "wamid.A",
      messageType: "text"
    });
    expect(processMessage).toHaveBeenCalledWith(expect.anything(), { inboundEventId: "evt_1" });
  });

  it("flag on + duplicate -> NO procesa y responde 200", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    claim.mockResolvedValue({ status: "duplicate", eventId: "evt_1", existingStatus: "PROCESSED" });

    const response = await POST(metaRequest([metaMessage("wamid.A")]));

    expect(response.status).toBe(200);
    expect(processMessage).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("flag on + sin message.id -> unverifiable, se registra como IGNORED y NO procesa", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    claim.mockResolvedValue({
      status: "unverifiable",
      eventId: "evt_x",
      reason: "missing_provider_message_id"
    });

    const response = await POST(metaRequest([metaMessage(undefined)]));

    expect(response.status).toBe(200);
    expect(claim.mock.calls[0][0].providerMessageId).toBeUndefined();
    expect(processMessage).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith("evt_x", {
      status: "IGNORED",
      outcome: "missing_provider_message_id"
    });
  });

  it("flag on + excepción -> FAILED con errorCode seguro (sin texto ni teléfono) y HTTP 500", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    claim.mockResolvedValue({ status: "claimed", eventId: "evt_1" });
    processMessage.mockRejectedValue(new Error("fallo con 5215500000001 y 'quiero cotizar'"));

    const response = await POST(metaRequest([metaMessage("wamid.A")]));

    expect(response.status).toBe(500);
    expect(complete).toHaveBeenCalledWith("evt_1", { status: "FAILED", errorCode: "error_Error" });
    expect(JSON.stringify(complete.mock.calls)).not.toContain("5215500000001");
  });

  it("lote: el duplicado se salta y el mensaje nuevo se procesa", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    claim
      .mockResolvedValueOnce({ status: "duplicate", eventId: "evt_1", existingStatus: "PROCESSED" })
      .mockResolvedValueOnce({ status: "claimed", eventId: "evt_2" });

    await POST(metaRequest([metaMessage("wamid.A"), metaMessage("wamid.B")]));

    expect(processMessage).toHaveBeenCalledTimes(1);
    expect(processMessage).toHaveBeenCalledWith(expect.anything(), { inboundEventId: "evt_2" });
  });

  it("Twilio sigue en legacy aunque el flag esté activo", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    const form = new URLSearchParams({
      From: "whatsapp:+5215500000001",
      Body: "quiero cotizar",
      MessageSid: "SM_TEST",
      AccountSid: "AC_TEST"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString()
      })
    );

    expect(response.status).toBe(200);
    expect(claim).not.toHaveBeenCalled();
    expect(processMessage).toHaveBeenCalledTimes(1);
    expect(processMessage.mock.calls[0]).toHaveLength(1);
  });
});
