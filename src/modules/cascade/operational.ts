export const CASCADE_VERSION = "CASCADE_V1" as const;

export type CascadeSnapshot = {
  version: typeof CASCADE_VERSION;
  capturedAt: string;
  leadCode: string;
  client: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  projectType: string;
};

export function asJsonRecord(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function createCascadeSnapshot(input: {
  leadCode: string;
  client: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  city: string;
  projectType: string;
  capturedAt?: string;
}): CascadeSnapshot {
  return {
    version: CASCADE_VERSION,
    capturedAt:
      input.capturedAt ??
      new Date().toISOString(),
    leadCode: input.leadCode,
    client: input.client,
    contactName:
      input.contactName?.trim() ||
      "Contacto pendiente",
    contactEmail:
      input.contactEmail?.trim() ||
      "",
    contactPhone:
      input.contactPhone?.trim() ||
      "",
    city: input.city,
    projectType:
      input.projectType
  };
}

export function readCascadeSnapshot(
  metadata: unknown
): CascadeSnapshot | null {
  const record =
    asJsonRecord(metadata);
  const candidate =
    asJsonRecord(
      record.cascadeSnapshot
    );

  if (
    candidate.version !==
      CASCADE_VERSION ||
    typeof candidate.capturedAt !==
      "string" ||
    typeof candidate.leadCode !==
      "string" ||
    typeof candidate.client !==
      "string" ||
    typeof candidate.contactName !==
      "string" ||
    typeof candidate.contactEmail !==
      "string" ||
    typeof candidate.contactPhone !==
      "string" ||
    typeof candidate.city !==
      "string" ||
    typeof candidate.projectType !==
      "string"
  ) {
    return null;
  }

  return {
    version:
      CASCADE_VERSION,
    capturedAt:
      candidate.capturedAt,
    leadCode:
      candidate.leadCode,
    client:
      candidate.client,
    contactName:
      candidate.contactName,
    contactEmail:
      candidate.contactEmail,
    contactPhone:
      candidate.contactPhone,
    city:
      candidate.city,
    projectType:
      candidate.projectType
  };
}

export function withCascadeSnapshot(
  metadata: unknown,
  snapshot: CascadeSnapshot
) {
  return {
    ...asJsonRecord(metadata),
    cascadeSnapshot:
      snapshot
  };
}

export function preserveCascadeSnapshot(
  currentMetadata: unknown,
  nextMetadata: unknown,
  fallbackSnapshot: CascadeSnapshot
) {
  return withCascadeSnapshot(
    nextMetadata,
    readCascadeSnapshot(
      currentMetadata
    ) ?? fallbackSnapshot
  );
}
