import { z } from "zod";
import {
  isoDateSchema,
  nonEmptyTextSchema,
  percentageSchema,
  positiveAmountSchema
} from "@/modules/shared/schemas";

export const projectStatusValues = [
  "Diagnostico tecnico",
  "Cotizado",
  "Aprobado",
  "En produccion",
  "Programado para instalacion",
  "En instalacion",
  "Instalado",
  "Cerrado"
] as const;

export const projectRiskValues = [
  "Bajo",
  "Medio",
  "Alto"
] as const;

export const projectTimelineItemSchema = z.object({
  id: nonEmptyTextSchema,
  date: isoDateSchema,
  title: nonEmptyTextSchema,
  note: nonEmptyTextSchema
});

export const projectSchema = z.object({
  id: nonEmptyTextSchema,
  prospectId: nonEmptyTextSchema.optional(),
  prospectCode: nonEmptyTextSchema.optional(),
  quoteId: nonEmptyTextSchema.optional(),
  quoteFolio: nonEmptyTextSchema.optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  cascadeSource: z.string().optional(),
  client: nonEmptyTextSchema,
  name: nonEmptyTextSchema,
  solutionType: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  status: z.enum(projectStatusValues),
  responsible: nonEmptyTextSchema,
  estimatedInstallation: isoDateSchema,
  progress: percentageSchema,
  risk: z.enum(projectRiskValues),
  evidenceCount: positiveAmountSchema,
  nextAction: nonEmptyTextSchema,
  mainItems: z.array(nonEmptyTextSchema),
  timeline: z.array(projectTimelineItemSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const createProjectInputSchema = z.object({
  leadCode: z.string().trim().min(1).optional(),
  quoteId: z.string().trim().min(1).optional(),
  client: nonEmptyTextSchema,
  name: nonEmptyTextSchema,
  solutionType: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  status: z.enum(projectStatusValues).default("Diagnostico tecnico"),
  responsible: nonEmptyTextSchema,
  estimatedInstallation: isoDateSchema,
  progress: percentageSchema.default(5),
  risk: z.enum(projectRiskValues).default("Bajo"),
  evidenceCount: z.number().int().nonnegative().default(0),
  nextAction: nonEmptyTextSchema,
  mainItems: z.array(nonEmptyTextSchema).default([])
});

export const updateProjectInputSchema = z
  .object({
    name: nonEmptyTextSchema.optional(),
    solutionType: nonEmptyTextSchema.optional(),
    city: nonEmptyTextSchema.optional(),
    status: z.enum(projectStatusValues).optional(),
    responsible: nonEmptyTextSchema.optional(),
    estimatedInstallation: isoDateSchema.optional(),
    progress: percentageSchema.optional(),
    risk: z.enum(projectRiskValues).optional(),
    evidenceCount: z.number().int().nonnegative().optional(),
    nextAction: nonEmptyTextSchema.optional(),
    mainItems: z.array(nonEmptyTextSchema).optional()
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    {
      message: "Debes enviar al menos un cambio."
    }
  );

export const addProjectActivitySchema = z.object({
  title: nonEmptyTextSchema,
  note: nonEmptyTextSchema
});

export const dashboardBarItemSchema = z.object({
  name: nonEmptyTextSchema,
  value: positiveAmountSchema
});

export const maintenanceMonthItemSchema = z.object({
  month: nonEmptyTextSchema,
  value: positiveAmountSchema
});

export type ProjectStatus =
  z.infer<typeof projectSchema>["status"];
export type ProjectRisk =
  z.infer<typeof projectSchema>["risk"];
export type ProjectDto =
  z.infer<typeof projectSchema>;
export type DashboardBarItemDto =
  z.infer<typeof dashboardBarItemSchema>;
export type MaintenanceMonthItemDto =
  z.infer<typeof maintenanceMonthItemSchema>;

export interface ProjectRepository {
  listProjects(): ProjectDto[];
  listProjectTypeData(): DashboardBarItemDto[];
  listQuoteStatusData(): DashboardBarItemDto[];
  listMaintenanceByMonthData(): MaintenanceMonthItemDto[];
}
