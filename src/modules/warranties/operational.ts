import {
  WarrantyStatus as DbWarrantyStatus
} from "@prisma/client";
import {
  WarrantyStatus
} from "@/modules/warranties/contracts";

export function mapWarrantyStatusToDb(
  status: WarrantyStatus
): DbWarrantyStatus {
  if (status === "Activa") return "ACTIVE";
  if (status === "Por vencer") return "EXPIRING";
  if (status === "Requiere revision") return "REVIEW_REQUIRED";
  if (status === "Mantenimiento agendado") {
    return "MAINTENANCE_SCHEDULED";
  }
  return "ATTENDED";
}

export function formatWarrantyCode(
  year: number,
  sequence: number
) {
  return `GAR-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseWarrantySequence(
  code: string,
  year: number
) {
  const match = code.match(
    new RegExp(`^GAR-${year}-(\\d{4,})$`)
  );

  if (!match) return null;

  const parsed = Number(match[1]);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export type WarrantyTimelineEvent = {
  id: string;
  date: string;
  title: string;
  note: string;
};

export function normalizeWarrantyTimeline(
  value: unknown
): WarrantyTimelineEvent[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return [];
    }

    const row =
      item as Record<string, unknown>;

    if (
      typeof row.id !== "string" ||
      typeof row.date !== "string" ||
      typeof row.title !== "string" ||
      typeof row.note !== "string"
    ) {
      return [];
    }

    return [{
      id: row.id,
      date: row.date,
      title: row.title,
      note: row.note
    }];
  });
}

export function appendWarrantyEvent(
  timeline: unknown,
  event: WarrantyTimelineEvent
) {
  return [
    event,
    ...normalizeWarrantyTimeline(
      timeline
    )
  ].slice(0, 150);
}

export function daysFrom(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
