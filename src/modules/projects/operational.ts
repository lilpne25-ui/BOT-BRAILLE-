import {
  ProjectRisk as DbProjectRisk,
  ProjectStatus as DbProjectStatus
} from "@prisma/client";
import {
  ProjectRisk,
  ProjectStatus
} from "@/modules/projects/contracts";

export const projectStatusProgress: Record<ProjectStatus, number> = {
  "Diagnostico tecnico": 5,
  "Cotizado": 10,
  "Aprobado": 15,
  "En produccion": 35,
  "Programado para instalacion": 60,
  "En instalacion": 75,
  "Instalado": 95,
  "Cerrado": 100
};

export function mapProjectStatusToDb(
  status: ProjectStatus
): DbProjectStatus {
  if (status === "Diagnostico tecnico") return "TECHNICAL_DIAGNOSIS";
  if (status === "Cotizado") return "QUOTED";
  if (status === "Aprobado") return "APPROVED";
  if (status === "En produccion") return "IN_PRODUCTION";
  if (status === "Programado para instalacion") {
    return "SCHEDULED_INSTALLATION";
  }
  if (status === "En instalacion") return "IN_INSTALLATION";
  if (status === "Instalado") return "INSTALLED";
  return "CLOSED";
}

export function mapProjectRiskToDb(
  risk: ProjectRisk
): DbProjectRisk {
  if (risk === "Bajo") return "LOW";
  if (risk === "Medio") return "MEDIUM";
  return "HIGH";
}

export function recommendedProgress(
  status: ProjectStatus,
  currentProgress = 0
) {
  return Math.max(
    Math.min(currentProgress, 100),
    projectStatusProgress[status]
  );
}

export function formatProjectCode(
  year: number,
  sequence: number
) {
  return `PR-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseProjectSequence(
  code: string,
  year: number
) {
  const match = code.match(
    new RegExp(`^PR-${year}-(\\d{4,})$`)
  );

  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export type ProjectTimelineEvent = {
  id: string;
  date: string;
  title: string;
  note: string;
};

export function normalizeTimeline(
  value: unknown
): ProjectTimelineEvent[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const row = item as Record<string, unknown>;

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

export function appendTimelineEvent(
  timeline: unknown,
  event: ProjectTimelineEvent
) {
  return [
    event,
    ...normalizeTimeline(timeline)
  ].slice(0, 100);
}
