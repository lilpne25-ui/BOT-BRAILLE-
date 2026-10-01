import { z } from "zod";
import {
  isoDateSchema,
  nonEmptyTextSchema,
  positiveAmountSchema
} from "@/modules/shared/schemas";

export const warrantyStatusValues = [
  "Activa",
  "Por vencer",
  "Requiere revision",
  "Mantenimiento agendado",
  "Atendida"
] as const;

export const warrantyTypeValues = [
  "Estandar",
  "Extendida",
  "Servicio",
  "Especial"
] as const;

export const maintenanceTimelineItemSchema = z.object({
  id: nonEmptyTextSchema,
  date: isoDateSchema,
  title: nonEmptyTextSchema,
  note: nonEmptyTextSchema
});

export const warrantySchema = z.object({
  id: nonEmptyTextSchema,
  projectId: nonEmptyTextSchema.optional(),
  projectCode: nonEmptyTextSchema.optional(),
  prospectId: nonEmptyTextSchema.optional(),
  prospectCode: nonEmptyTextSchema.optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  cascadeSource: z.string().optional(),
  client: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  solutionInstalled: nonEmptyTextSchema,
  installDate: isoDateSchema,
  warrantyUntil: isoDateSchema,
  nextMaintenance: isoDateSchema,
  warrantyType: nonEmptyTextSchema,
  coverage: nonEmptyTextSchema,
  nextAction: nonEmptyTextSchema,
  status: z.enum(warrantyStatusValues),
  evidence: nonEmptyTextSchema,
  evidenceCount: positiveAmountSchema,
  responsible: nonEmptyTextSchema,
  timeline: z.array(maintenanceTimelineItemSchema),
  observations: nonEmptyTextSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const createWarrantyInputSchema = z.object({
  projectCode: z.string().trim().min(1).optional(),
  client: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  solutionInstalled: nonEmptyTextSchema,
  installDate: isoDateSchema,
  warrantyUntil: isoDateSchema,
  nextMaintenance: isoDateSchema,
  warrantyType: nonEmptyTextSchema,
  coverage: nonEmptyTextSchema,
  nextAction: nonEmptyTextSchema,
  status: z.enum(warrantyStatusValues).default("Activa"),
  evidence: nonEmptyTextSchema,
  evidenceCount: z.number().int().nonnegative().default(0),
  responsible: nonEmptyTextSchema,
  observations: nonEmptyTextSchema
}).refine(
  (value) =>
    value.warrantyUntil >= value.installDate,
  {
    message:
      "La fecha de vencimiento no puede ser anterior a la instalacion.",
    path: ["warrantyUntil"]
  }
);

export const updateWarrantyInputSchema = z
  .object({
    project: nonEmptyTextSchema.optional(),
    city: nonEmptyTextSchema.optional(),
    solutionInstalled: nonEmptyTextSchema.optional(),
    installDate: isoDateSchema.optional(),
    warrantyUntil: isoDateSchema.optional(),
    nextMaintenance: isoDateSchema.optional(),
    warrantyType: nonEmptyTextSchema.optional(),
    coverage: nonEmptyTextSchema.optional(),
    nextAction: nonEmptyTextSchema.optional(),
    status: z.enum(warrantyStatusValues).optional(),
    evidence: nonEmptyTextSchema.optional(),
    evidenceCount: z.number().int().nonnegative().optional(),
    responsible: nonEmptyTextSchema.optional(),
    observations: nonEmptyTextSchema.optional()
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    {
      message:
        "Debes enviar al menos un cambio."
    }
  );

export const addWarrantyActivitySchema = z.object({
  title: nonEmptyTextSchema,
  note: nonEmptyTextSchema
});

export type WarrantyStatus =
  z.infer<typeof warrantySchema>["status"];
export type WarrantyDto =
  z.infer<typeof warrantySchema>;

export interface WarrantyRepository {
  listWarranties(): WarrantyDto[];
}
