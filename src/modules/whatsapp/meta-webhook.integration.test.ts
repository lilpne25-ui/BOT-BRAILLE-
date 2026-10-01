import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_DATABASE_URL,
  assertDisposableDatabase,
  withSchema
} from "@/modules/whatsapp/test-support/disposable-database";

// End-to-end: Meta payload -> POST /api/whatsapp/webhook -> claim -> processor -> mock send
// -> PostgreSQL. Skipped unless INBOUND_EVENTS_TEST_DATABASE_URL is set. Uses its own
// schema in the disposable test database, created with `prisma db push` (never reset flags).

const SCHEMA = "meta_webhook_e2e";

const sent = vi.hoisted(() => [] as Array<{ to: string; text: string }>);

vi.mock("@/modules/whatsapp/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/whatsapp/provider")>();

  return {
    ...actual,
    sendWhatsAppReply: async (outbound: { to: string; text: string }) => {
      // Hard stop: this test must never reach a real WhatsApp provider.
      if (process.env.WHATSAPP_PROVIDER !== "mock") {
        throw new Error("E2E test requires WHATSAPP_PROVIDER=mock");
      }
      sent.push(outbound);
      return actual.sendWhatsAppReply(outbound);
    }
  };
});

type RoutePost = typeof import("@/app/api/whatsapp/webhook/route").POST;
type HashFn = typeof import("@/modules/whatsapp/inbound-events").hashProviderMessageId;

function metaRequest(options: {
  wamid?: string;
  from: string;
  text: string;
  phoneNumberId?: string;
}) {
  const message = {
    from: options.from,
    ...(options.wamid ? { id: options.wamid } : {}),
    timestamp: "1759300000",
    type: "text",
    text: { body: options.text }
  };

  return new NextRequest("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID_E2E",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "5215500000000",
                  phone_number_id: options.phoneNumberId ?? "PHONE_NUMBER_ID_E2E"
                },
                contacts: [{ profile: { name: "Cliente Prueba" }, wa_id: options.from }],
                messages: [message]
              }
            }
          ]
        }
      ]
    })
  });
}

describe.skipIf(!TEST_DATABASE_URL)("Webhook Meta + InboundEvent en PostgreSQL real", () => {
  let db: PrismaClient;
  let POST: RoutePost;
  let hashProviderMessageId: HashFn;

  async function stats(phone: string) {
    const conversations = await db.conversation.findMany({
      where: { customerPhone: phone },
      select: { id: true }
    });
    const ids = conversations.map((row) => row.id);
    const count = (role: "USER" | "ASSISTANT") =>
      db.conversationMessage.count({ where: { conversationId: { in: ids }, role } });

    return {
      conversations: ids.length,
      userMessages: await count("USER"),
      assistantMessages: await count("ASSISTANT"),
      repliesSent: sent.filter((row) => row.to === phone).length
    };
  }

  function eventsFor(wamid: string) {
    return db.inboundEvent.findMany({
      where: { providerMessageIdHash: hashProviderMessageId(wamid) },
      orderBy: { receivedAt: "asc" }
    });
  }

  beforeAll(async () => {
    assertDisposableDatabase(TEST_DATABASE_URL);
    const url = withSchema(TEST_DATABASE_URL, SCHEMA);
    assertDisposableDatabase(url);

    const admin = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await admin.$disconnect();

    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe"
    });

    // Must be set before the app modules (and the Prisma singleton) are imported.
    process.env.DATABASE_URL = url;
    process.env.WHATSAPP_PROVIDER = "mock";

    ({ POST } = await import("@/app/api/whatsapp/webhook/route"));
    ({ hashProviderMessageId } = await import("@/modules/whatsapp/inbound-events"));
    db = new PrismaClient({ datasourceUrl: url });
  }, 180_000);

  afterAll(async () => {
    await db?.$disconnect();
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });

  beforeEach(() => {
    sent.length = 0;
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "1";
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("mismo payload dos veces -> 1 evento, 1 procesamiento, 1 respuesta", async () => {
    const phone = "5215500000101";
    const request = () => metaRequest({ wamid: "wamid.E2E_SAME", from: phone, text: "quiero cotizar" });

    const first = await POST(request());
    const afterFirst = await stats(phone);
    const second = await POST(request());
    const afterSecond = await stats(phone);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(afterFirst).toMatchObject({ conversations: 1, userMessages: 1, repliesSent: 1 });
    expect(afterFirst.assistantMessages).toBeGreaterThan(0);
    // The redelivery changed nothing.
    expect(afterSecond).toEqual(afterFirst);

    const events = await eventsFor("wamid.E2E_SAME");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "META",
      channelId: "PHONE_NUMBER_ID_E2E",
      status: "PROCESSED",
      outcome: "replied",
      transcribed: false
    });
    expect(events[0].conversationId).toBeTruthy();
    expect(events[0].sessionId).toBeTruthy();
    expect(events[0].completedAt).toBeInstanceOf(Date);

    // No PII or raw ids in the ledger.
    const stored = JSON.stringify(events[0]);
    expect(stored).not.toContain(phone);
    expect(stored).not.toContain("quiero cotizar");
    expect(stored).not.toContain("wamid.E2E_SAME");
  });

  it("wamid-A y wamid-B con el mismo texto -> ambos se procesan", async () => {
    const phone = "5215500000102";

    await POST(metaRequest({ wamid: "wamid.E2E_A", from: phone, text: "quiero cotizar" }));
    await POST(metaRequest({ wamid: "wamid.E2E_B", from: phone, text: "quiero cotizar" }));

    expect(await stats(phone)).toMatchObject({ conversations: 1, userMessages: 2, repliesSent: 2 });
    expect((await eventsFor("wamid.E2E_A"))[0].status).toBe("PROCESSED");
    expect((await eventsFor("wamid.E2E_B"))[0].status).toBe("PROCESSED");
  });

  it("mismo wamid en distinto phone_number_id -> eventos distintos por diseño", async () => {
    const phone = "5215500000103";

    await POST(metaRequest({ wamid: "wamid.E2E_CHANNEL", from: phone, text: "quiero cotizar", phoneNumberId: "PNI_1" }));
    await POST(metaRequest({ wamid: "wamid.E2E_CHANNEL", from: phone, text: "quiero cotizar", phoneNumberId: "PNI_2" }));

    const events = await eventsFor("wamid.E2E_CHANNEL");
    expect(events.map((row) => row.channelId)).toEqual(["PNI_1", "PNI_2"]);
    expect(new Set(events.map((row) => row.dedupeKey)).size).toBe(2);
    expect(await stats(phone)).toMatchObject({ userMessages: 2, repliesSent: 2 });
  });

  it("Meta sin message.id -> unverifiable: registrado como IGNORED, sin procesar ni responder", async () => {
    const phone = "5215500000104";

    await POST(metaRequest({ from: phone, text: "quiero cotizar" }));
    await POST(metaRequest({ from: phone, text: "quiero cotizar" }));

    const unverifiable = await db.inboundEvent.findMany({
      where: { dedupeKey: null, outcome: "missing_provider_message_id" }
    });
    expect(unverifiable.length).toBeGreaterThanOrEqual(2);
    expect(unverifiable.every((row) => row.status === "IGNORED" && row.providerMessageIdHash === null)).toBe(true);
    expect(await stats(phone)).toEqual({
      conversations: 0,
      userMessages: 0,
      assistantMessages: 0,
      repliesSent: 0
    });
  });

  it("mensaje sin intención de cotizar -> IGNORED (non_quote_message), sin respuesta", async () => {
    const phone = "5215500000105";

    await POST(metaRequest({ wamid: "wamid.E2E_HOLA", from: phone, text: "hola" }));

    expect((await eventsFor("wamid.E2E_HOLA"))[0]).toMatchObject({
      status: "IGNORED",
      outcome: "non_quote_message"
    });
    expect(await stats(phone)).toMatchObject({ conversations: 0, repliesSent: 0 });
  });

  it("flag apagado -> legacy: sin InboundEvent y el duplicado SÍ se reprocesa (comportamiento previo)", async () => {
    process.env.WHATSAPP_INBOUND_IDEMPOTENCY = "0";
    const phone = "5215500000106";
    const request = () => metaRequest({ wamid: "wamid.E2E_LEGACY", from: phone, text: "quiero cotizar" });

    await POST(request());
    await POST(request());

    expect(await eventsFor("wamid.E2E_LEGACY")).toHaveLength(0);
    expect(await stats(phone)).toMatchObject({ userMessages: 2, repliesSent: 2 });
  });
});
