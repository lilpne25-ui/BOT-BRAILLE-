import {
  ActivityType,
  ConversationRole,
  ConversationStatus,
  LeadSource,
  LeadStatus,
  ProjectRisk,
  ProjectStatus,
  WarrantyStatus
} from "@prisma/client";
import { LeadDto } from "@/modules/crm/contracts";
import { ProjectDto } from "@/modules/projects/contracts";
import { WarrantyDto } from "@/modules/warranties/contracts";

const leadStatusLabel: Record<
  LeadStatus,
  LeadDto["status"]
> = {
  NEW: "Nuevo",
  DIAGNOSIS: "Pendiente de revision humana",
  QUOTE_SENT: "Cotizacion enviada",
  NEGOTIATION: "Negociacion",
  WON: "Ganado",
  LOST: "Perdido"
};

const leadSourceLabel: Record<
  LeadSource,
  LeadDto["source"]
> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referido",
  EMAIL: "Correo",
  CALL: "Llamada"
};

const projectStatusLabel: Record<
  ProjectStatus,
  ProjectDto["status"]
> = {
  TECHNICAL_DIAGNOSIS: "Diagnostico tecnico",
  QUOTED: "Cotizado",
  APPROVED: "Aprobado",
  IN_PRODUCTION: "En produccion",
  SCHEDULED_INSTALLATION:
    "Programado para instalacion",
  IN_INSTALLATION: "En instalacion",
  INSTALLED: "Instalado",
  CLOSED: "Cerrado"
};

const projectRiskLabel: Record<
  ProjectRisk,
  ProjectDto["risk"]
> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto"
};

const warrantyStatusLabel: Record<
  WarrantyStatus,
  WarrantyDto["status"]
> = {
  ACTIVE: "Activa",
  EXPIRING: "Por vencer",
  REVIEW_REQUIRED: "Requiere revision",
  MAINTENANCE_SCHEDULED:
    "Mantenimiento agendado",
  ATTENDED: "Atendida"
};

export function mapLeadStatusToDb(
  status: LeadDto["status"]
): LeadStatus {
  if (status === "Nuevo") return "NEW";

  if (status === "Pendiente de revision humana") {
    return "DIAGNOSIS";
  }

  if (status === "Cotizacion enviada") {
    return "QUOTE_SENT";
  }

  if (status === "Negociacion") {
    return "NEGOTIATION";
  }

  if (status === "Ganado") return "WON";

  return "LOST";
}

export function mapLeadSourceToDb(
  source: LeadDto["source"]
): LeadSource {
  if (source === "Web") return "WEB";
  if (source === "WhatsApp") return "WHATSAPP";
  if (source === "Referido") return "REFERRAL";
  if (source === "Correo") return "EMAIL";

  return "CALL";
}

export function mapLeadStatusFromDb(
  status: LeadStatus
): LeadDto["status"] {
  return leadStatusLabel[status];
}

export function mapLeadSourceFromDb(
  source: LeadSource
): LeadDto["source"] {
  return leadSourceLabel[source];
}

export function mapProjectStatusFromDb(
  status: ProjectStatus
): ProjectDto["status"] {
  return projectStatusLabel[status];
}

export function mapProjectRiskFromDb(
  risk: ProjectRisk
): ProjectDto["risk"] {
  return projectRiskLabel[risk];
}

export function mapWarrantyStatusFromDb(
  status: WarrantyStatus
): WarrantyDto["status"] {
  return warrantyStatusLabel[status];
}

export function mapConversationStatusToDb(
  status: "idle" | "collecting" | "completed"
): ConversationStatus {
  if (status === "idle") return "IDLE";
  if (status === "collecting") return "COLLECTING";

  return "COMPLETED";
}

export function mapConversationRoleToDb(
  role: "assistant" | "user"
): ConversationRole {
  return role === "assistant"
    ? "ASSISTANT"
    : "USER";
}

export function mapConversationStatusFromDb(
  status: ConversationStatus
): "idle" | "collecting" | "completed" {
  if (status === "IDLE") return "idle";
  if (status === "COLLECTING") {
    return "collecting";
  }

  return "completed";
}

export function mapActivityTypeToMessage(
  type: ActivityType,
  detail: string
) {
  return `${type}: ${detail}`;
}
