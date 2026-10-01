import { z } from "zod";
import {
  isoDateSchema,
  nonEmptyTextSchema,
  positiveAmountSchema
} from "@/modules/shared/schemas";

export const leadStatusValues = [
  "Nuevo",
  "Pendiente de revision humana",
  "Cotizacion enviada",
  "Negociacion",
  "Ganado",
  "Perdido"
] as const;

export const leadSourceValues = [
  "Web",
  "WhatsApp",
  "Referido",
  "Correo",
  "Llamada"
] as const;

export const leadActivityTypeValues = [
  "Llamada",
  "Correo",
  "Visita",
  "WhatsApp",
  "Nota interna"
] as const;

export const leadActivitySchema = z.object({
  id: nonEmptyTextSchema,
  date: isoDateSchema,
  type: z.enum(leadActivityTypeValues),
  note: nonEmptyTextSchema
});

export const leadSchema = z.object({
  id: nonEmptyTextSchema,
  client: nonEmptyTextSchema,
  contact: nonEmptyTextSchema,
  email: nonEmptyTextSchema,
  phone: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  projectType: nonEmptyTextSchema,
  status: z.enum(leadStatusValues),
  lastActivity: isoDateSchema,
  nextAction: nonEmptyTextSchema,
  nextActionDate: isoDateSchema,
  owner: nonEmptyTextSchema,
  ownerId: z.string().nullable().optional(),
  estimatedValue: positiveAmountSchema,
  source: z.enum(leadSourceValues),
  painPoint: nonEmptyTextSchema,
  interestedSolutions: z.array(nonEmptyTextSchema),
  internalNotes: nonEmptyTextSchema,
  activities: z.array(leadActivitySchema)
});

export const createLeadSchema = z.object({
  client: nonEmptyTextSchema,
  contact: nonEmptyTextSchema,
  email: nonEmptyTextSchema,
  phone: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  projectType: nonEmptyTextSchema,
  status: z.enum(leadStatusValues).default("Nuevo"),
  nextAction: nonEmptyTextSchema,
  nextActionDate: isoDateSchema,
  ownerId: z.string().nullable().optional(),
  estimatedValue: positiveAmountSchema.default(0),
  source: z.enum(leadSourceValues),
  painPoint: nonEmptyTextSchema,
  internalNotes: nonEmptyTextSchema
});

export const updateLeadSchema = createLeadSchema.partial();

export const addLeadActivitySchema = z.object({
  type: z.enum(leadActivityTypeValues).default("Nota interna"),
  note: nonEmptyTextSchema
});

export const salesUserSchema = z.object({
  id: nonEmptyTextSchema,
  name: nonEmptyTextSchema,
  email: nonEmptyTextSchema,
  role: z.enum(["ADMIN", "SALES"])
});

export type LeadStatus = z.infer<
  typeof leadSchema
>["status"];

export type LeadActivityDto = z.infer<
  typeof leadActivitySchema
>;

export type LeadDto = z.infer<typeof leadSchema>;

export type CreateLeadDto = z.infer<
  typeof createLeadSchema
>;

export type UpdateLeadDto = z.infer<
  typeof updateLeadSchema
>;

export type AddLeadActivityDto = z.infer<
  typeof addLeadActivitySchema
>;

export type SalesUserDto = z.infer<
  typeof salesUserSchema
>;

export interface LeadRepository {
  listLeads(): LeadDto[];
  createLead(input: CreateLeadDto): LeadDto;
}
