// Shared guard for integration tests that DROP/CREATE database objects.
// They must only ever run against a local, disposable database.

export const TEST_DATABASE_URL =
  process.env.INBOUND_EVENTS_TEST_DATABASE_URL?.trim() ?? "";

export function assertDisposableDatabase(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const database = parsed.pathname.replace(/^\//, "");

  if (!["localhost", "127.0.0.1", "::1"].includes(host) || !database.endsWith("_test")) {
    throw new Error(
      "INBOUND_EVENTS_TEST_DATABASE_URL must point to a local database whose name ends in _test."
    );
  }
}

export function withSchema(url: string, schema: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("schema", schema);
  return parsed.toString();
}
