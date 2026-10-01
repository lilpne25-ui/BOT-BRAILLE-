import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  claimInboundEvent,
  completeInboundEvent,
  hashProviderMessageId
} from "@/modules/whatsapp/inbound-events";
import {
  TEST_DATABASE_URL,
  assertDisposableDatabase
} from "@/modules/whatsapp/test-support/disposable-database";

// Proves the PostgreSQL guarantees that a mock cannot. Skipped unless
// INBOUND_EVENTS_TEST_DATABASE_URL is set. It DROPS and recreates the InboundEvent
// table, so it refuses any URL that is not a local database whose name ends in "_test".

const MIGRATION_FILE = path.resolve(
  __dirname,
  "../../../prisma/migrations/20260930120000_inbound_events/migration.sql"
);

function migrationStatements() {
  return fs
    .readFileSync(MIGRATION_FILE, "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function uniqueId(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe.skipIf(!TEST_DATABASE_URL)("InboundEvent en PostgreSQL real", () => {
  // Two independent clients = two connection pools, like two backend processes.
  let processA: PrismaClient;
  let processB: PrismaClient;

  beforeAll(async () => {
    assertDisposableDatabase(TEST_DATABASE_URL);
    processA = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
    processB = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

    await processA.$executeRawUnsafe('DROP TABLE IF EXISTS "InboundEvent"');
    await processA.$executeRawUnsafe('DROP TYPE IF EXISTS "InboundEventStatus"');

    for (const statement of migrationStatements()) {
      await processA.$executeRawUnsafe(statement);
    }
  }, 30_000);

  afterAll(async () => {
    await processA?.$disconnect();
    await processB?.$disconnect();
  });

  const event = (providerMessageId: string) => ({
    provider: "META" as const,
    channelId: "PHONE_NUMBER_ID_TEST",
    providerMessageId,
    messageType: "text"
  });

  it("A + B: el primero reclama y la reentrega es duplicate", async () => {
    const id = uniqueId("wamid.AB");

    const first = await claimInboundEvent(event(id), processA);
    const second = await claimInboundEvent(event(id), processB);

    if (first.status !== "claimed") throw new Error("expected claimed");
    expect(second).toEqual({
      status: "duplicate",
      eventId: first.eventId,
      existingStatus: "PROCESSING"
    });
  });

  it("C: 20 intentos simultáneos desde dos clientes -> exactamente 1 claimed y 1 fila", async () => {
    const id = uniqueId("wamid.RACE");
    const attempts = Array.from({ length: 20 }, (_, index) =>
      claimInboundEvent(event(id), index % 2 === 0 ? processA : processB)
    );

    const results = await Promise.all(attempts);
    const claimed = results.filter((result) => result.status === "claimed");
    const duplicates = results.filter((result) => result.status === "duplicate");

    expect(claimed).toHaveLength(1);
    expect(duplicates).toHaveLength(19);
    expect(
      await processA.inboundEvent.count({ where: { providerMessageIdHash: hashProviderMessageId(id) } })
    ).toBe(1);
  }, 30_000);

  it("E: FAILED reentregado es duplicate con existingStatus FAILED; un id nuevo se reclama", async () => {
    const id = uniqueId("wamid.FAIL");
    const first = await claimInboundEvent(event(id), processA);
    if (first.status !== "claimed") throw new Error("expected claimed");

    await expect(
      completeInboundEvent(first.eventId, { status: "FAILED", errorCode: "test_failure" }, processA)
    ).resolves.toBe(true);
    // A finished event cannot be rewritten.
    await expect(
      completeInboundEvent(first.eventId, { status: "PROCESSED" }, processB)
    ).resolves.toBe(false);

    await expect(claimInboundEvent(event(id), processB)).resolves.toEqual({
      status: "duplicate",
      eventId: first.eventId,
      existingStatus: "FAILED"
    });
    await expect(claimInboundEvent(event(uniqueId("wamid.NEW")), processB)).resolves.toMatchObject({
      status: "claimed"
    });
  });

  it("eventos sin id se registran por separado (dedupeKey NULL no colisiona)", async () => {
    const noId = { ...event(""), providerMessageId: undefined };

    const first = await claimInboundEvent(noId, processA);
    const second = await claimInboundEvent(noId, processB);

    expect(first.status).toBe("unverifiable");
    expect(second.status).toBe("unverifiable");
    expect(first.eventId).not.toBe(second.eventId);
  });
});
