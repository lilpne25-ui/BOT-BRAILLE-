import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildInboundDedupeKey,
  claimInboundEvent,
  completeInboundEvent,
  hashProviderMessageId,
  inboundErrorCode,
  isInboundIdempotencyEnabled,
  resolveInboundEventIdentity
} from "@/modules/whatsapp/inbound-events";

// Unit tests with a mocked Prisma store. They verify the contract and the mapping
// of P2002 -> "duplicate"; they do NOT prove PostgreSQL atomicity. That is covered
// by inbound-events.integration.test.ts against a real, disposable PostgreSQL.

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test"
  });
}

function createStore() {
  const inboundEvent = {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn()
  };

  return { store: { inboundEvent } as any, inboundEvent };
}

const metaEvent = {
  provider: "META" as const,
  channelId: "PHONE_NUMBER_ID_1",
  providerMessageId: "wamid.TEST_1",
  messageType: "text"
};

describe("buildInboundDedupeKey", () => {
  it("F: es estable para los mismos componentes (vector fijo)", () => {
    const key = buildInboundDedupeKey(metaEvent);

    expect(key).toBe("034f0e3e0c024fe03f8af23e27b8d42beceb111b16e0e434dfc8f8a5872b6d9e");
    expect(buildInboundDedupeKey({ ...metaEvent })).toBe(key);
  });

  it("F: ignora espacios alrededor de los componentes", () => {
    const a = resolveInboundEventIdentity(metaEvent);
    const b = resolveInboundEventIdentity({
      ...metaEvent,
      channelId: "  PHONE_NUMBER_ID_1 ",
      providerMessageId: " wamid.TEST_1\n"
    });

    expect(a.ok && b.ok && a.dedupeKey === b.dedupeKey).toBe(true);
  });

  it("no colisiona por ambigüedad de separadores", () => {
    const a = buildInboundDedupeKey({ provider: "META", channelId: "a|b", providerMessageId: "c" });
    const b = buildInboundDedupeKey({ provider: "META", channelId: "a", providerMessageId: "b|c" });

    expect(a).not.toBe(b);
  });

  it("G: mismo providerMessageId con distinto proveedor o canal no colisiona", () => {
    const base = buildInboundDedupeKey(metaEvent);

    expect(buildInboundDedupeKey({ ...metaEvent, provider: "TWILIO" })).not.toBe(base);
    expect(buildInboundDedupeKey({ ...metaEvent, channelId: "PHONE_NUMBER_ID_2" })).not.toBe(base);
  });

  it("G: en Baileys el mismo key.id en chats distintos no colisiona", () => {
    const a = resolveInboundEventIdentity({
      provider: "BAILEYS",
      channelId: "LINKED_ACCOUNT",
      providerMessageId: "3EB0ABC",
      chatScope: "chat-a@s.whatsapp.net"
    });
    const b = resolveInboundEventIdentity({
      provider: "BAILEYS",
      channelId: "LINKED_ACCOUNT",
      providerMessageId: "3EB0ABC",
      chatScope: "chat-b@s.whatsapp.net"
    });

    expect(a.ok && b.ok && a.dedupeKey !== b.dedupeKey).toBe(true);
  });

  it("chatScope solo participa en Baileys", () => {
    const withScope = resolveInboundEventIdentity({ ...metaEvent, chatScope: "algo" });
    const withoutScope = resolveInboundEventIdentity(metaEvent);

    expect(withScope.ok && withoutScope.ok && withScope.dedupeKey === withoutScope.dedupeKey).toBe(true);
  });
});

describe("resolveInboundEventIdentity", () => {
  it("clasifica la falta de providerMessageId sin inventar un id", () => {
    expect(resolveInboundEventIdentity({ ...metaEvent, providerMessageId: undefined })).toEqual({
      ok: false,
      reason: "missing_provider_message_id",
      channelId: "PHONE_NUMBER_ID_1",
      providerMessageId: null
    });
    expect(resolveInboundEventIdentity({ ...metaEvent, providerMessageId: "   " }).ok).toBe(false);
  });

  it("clasifica la falta de canal", () => {
    const result = resolveInboundEventIdentity({ ...metaEvent, channelId: null });

    expect(result.ok === false && result.reason).toBe("missing_channel_id");
  });

  it("Baileys exige chatScope", () => {
    const result = resolveInboundEventIdentity({
      provider: "BAILEYS",
      channelId: "LINKED_ACCOUNT",
      providerMessageId: "3EB0ABC"
    });

    expect(result.ok === false && result.reason).toBe("missing_chat_scope");
  });
});

describe("claimInboundEvent", () => {
  it("A: evento nuevo -> claimed", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockResolvedValue({ id: "evt_1" });

    await expect(claimInboundEvent(metaEvent, store)).resolves.toEqual({
      status: "claimed",
      eventId: "evt_1"
    });

    const data = inboundEvent.create.mock.calls[0][0].data;
    expect(data.dedupeKey).toBe(buildInboundDedupeKey(metaEvent));
    expect(inboundEvent.findUnique).not.toHaveBeenCalled();
  });

  it("A: no guarda texto, payload, teléfono ni chatScope en claro", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockResolvedValue({ id: "evt_1" });

    await claimInboundEvent(
      {
        provider: "BAILEYS",
        channelId: "LINKED_ACCOUNT",
        providerMessageId: "3EB0ABC",
        chatScope: "5215500000000@s.whatsapp.net",
        messageType: "audioMessage"
      },
      store
    );

    const data = inboundEvent.create.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(
      ["channelId", "dedupeKey", "messageType", "provider", "providerMessageIdHash"].sort()
    );
    expect(JSON.stringify(data)).not.toContain("5215500000000");
  });

  it("A: guarda el id del proveedor solo como hash, nunca en claro", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockResolvedValue({ id: "evt_1" });

    await claimInboundEvent(metaEvent, store);

    const data = inboundEvent.create.mock.calls[0][0].data;
    expect(data.providerMessageIdHash).toBe(hashProviderMessageId("wamid.TEST_1"));
    expect(data.providerMessageIdHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain("wamid.TEST_1");
  });

  it("B: misma identidad (P2002) -> duplicate con el estado existente", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockRejectedValue(uniqueViolation());
    inboundEvent.findUnique.mockResolvedValue({ id: "evt_1", status: "PROCESSED" });

    await expect(claimInboundEvent(metaEvent, store)).resolves.toEqual({
      status: "duplicate",
      eventId: "evt_1",
      existingStatus: "PROCESSED"
    });
  });

  it("D: mismo texto con ids distintos -> dos eventos distintos", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create
      .mockResolvedValueOnce({ id: "evt_1" })
      .mockResolvedValueOnce({ id: "evt_2" });

    // El texto ("hola") no forma parte de la identidad: solo el id del proveedor.
    const first = await claimInboundEvent({ ...metaEvent, providerMessageId: "wamid.HOLA_1" }, store);
    const second = await claimInboundEvent({ ...metaEvent, providerMessageId: "wamid.HOLA_2" }, store);

    expect(first.status).toBe("claimed");
    expect(second.status).toBe("claimed");
    expect(inboundEvent.create.mock.calls[0][0].data.dedupeKey).not.toBe(
      inboundEvent.create.mock.calls[1][0].data.dedupeKey
    );
  });

  it("E: un evento FAILED reentregado es duplicate (no se reprocesa) y se distingue de uno nuevo", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ id: "evt_new" });
    inboundEvent.findUnique.mockResolvedValue({ id: "evt_failed", status: "FAILED" });

    const redelivered = await claimInboundEvent(metaEvent, store);
    const fresh = await claimInboundEvent({ ...metaEvent, providerMessageId: "wamid.OTHER" }, store);

    expect(redelivered).toEqual({ status: "duplicate", eventId: "evt_failed", existingStatus: "FAILED" });
    expect(fresh).toEqual({ status: "claimed", eventId: "evt_new" });
  });

  it("sin providerMessageId -> unverifiable, registrado sin dedupeKey y sin id inventado", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockResolvedValue({ id: "evt_x" });

    const result = await claimInboundEvent({ ...metaEvent, providerMessageId: undefined }, store);

    expect(result).toEqual({
      status: "unverifiable",
      eventId: "evt_x",
      reason: "missing_provider_message_id"
    });

    const data = inboundEvent.create.mock.calls[0][0].data;
    expect(data.dedupeKey).toBeNull();
    expect(data.providerMessageIdHash).toBeNull();
    expect(data.outcome).toBe("missing_provider_message_id");
  });

  it("propaga errores que no son de unicidad (p. ej. BD caída)", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.create.mockRejectedValue(new Error("connection refused"));

    await expect(claimInboundEvent(metaEvent, store)).rejects.toThrow("connection refused");
  });
});

describe("isInboundIdempotencyEnabled", () => {
  it("por defecto está apagado y solo 1/true/on lo activan", () => {
    const original = process.env.WHATSAPP_INBOUND_IDEMPOTENCY;
    const check = (value: string | undefined) => {
      if (value === undefined) delete process.env.WHATSAPP_INBOUND_IDEMPOTENCY;
      else process.env.WHATSAPP_INBOUND_IDEMPOTENCY = value;
      return isInboundIdempotencyEnabled();
    };

    try {
      expect(check(undefined)).toBe(false);
      expect(check("")).toBe(false);
      expect(check("0")).toBe(false);
      expect(check("off")).toBe(false);
      expect(check("yes")).toBe(false);
      expect(check("1")).toBe(true);
      expect(check(" TRUE ")).toBe(true);
      expect(check("on")).toBe(true);
    } finally {
      check(original);
    }
  });
});

describe("inboundErrorCode", () => {
  it("usa solo la clase o el código Prisma, nunca el mensaje", () => {
    expect(inboundErrorCode(uniqueViolation())).toBe("prisma_P2002");
    expect(inboundErrorCode(new TypeError("cliente 5215500000001"))).toBe("error_TypeError");
    expect(inboundErrorCode("texto suelto")).toBe("error_unknown");
  });
});

describe("completeInboundEvent", () => {
  it("solo completa eventos en PROCESSING", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      completeInboundEvent("evt_1", { status: "FAILED", errorCode: "engine_error" }, store)
    ).resolves.toBe(true);

    const args = inboundEvent.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: "evt_1", status: "PROCESSING" });
    expect(args.data.status).toBe("FAILED");
    expect(args.data.completedAt).toBeInstanceOf(Date);
  });

  it("devuelve false si el evento ya no estaba en PROCESSING", async () => {
    const { store, inboundEvent } = createStore();
    inboundEvent.updateMany.mockResolvedValue({ count: 0 });

    await expect(completeInboundEvent("evt_1", { status: "PROCESSED" }, store)).resolves.toBe(false);
  });
});
