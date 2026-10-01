import { z } from "zod";
import { nonEmptyTextSchema, positiveAmountSchema } from "@/modules/shared/schemas";

export const solutionTypes = [
  "Piso podotactil",
  "Senalizacion braille",
  "Mapas hapticos",
  "Directorios",
  "Atriles",
  "Proteccion civil",
  "Arquitectura especializada"
] as const;

export const materials = [
  "TPU",
  "Acero inoxidable",
  "Policoncreto",
  "Acrilico",
  "Aluminio",
  "PVC fotoluminiscente"
] as const;

export const spaceTypes = ["Hospital", "Universidad", "Plaza", "Oficina", "Edificio publico", "Hotel", "Otro"] as const;
export const urgencyLevels = ["Normal", "Prioritario", "Urgente"] as const;
export const usageTypes = ["Interior", "Exterior", "Alto transito", "Zona premium"] as const;
export const installationMethods = ["Pin de anclaje", "Autoadhesivo", "Sin adhesivo / epoxico", "Instalacion especializada"] as const;

export const unitLabels: Record<(typeof solutionTypes)[number], string> = {
  "Piso podotactil": "metros lineales",
  "Senalizacion braille": "piezas",
  "Mapas hapticos": "piezas",
  Directorios: "piezas",
  Atriles: "piezas",
  "Proteccion civil": "piezas",
  "Arquitectura especializada": "horas de diagnostico"
};

export const basePrices: Record<(typeof solutionTypes)[number], number> = {
  "Piso podotactil": 1180,
  "Senalizacion braille": 1450,
  "Mapas hapticos": 14500,
  Directorios: 8800,
  Atriles: 7200,
  "Proteccion civil": 980,
  "Arquitectura especializada": 2600
};

export const materialMultipliers: Record<(typeof materials)[number], number> = {
  TPU: 1,
  "Acero inoxidable": 1.45,
  Policoncreto: 1.2,
  Acrilico: 1.12,
  Aluminio: 1.25,
  "PVC fotoluminiscente": 1.18
};

export const preliminaryQuoteSchema = z.object({
  id: nonEmptyTextSchema,
  folio: nonEmptyTextSchema,
  client: nonEmptyTextSchema,
  contact: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  projectLocation: nonEmptyTextSchema,
  spaceType: nonEmptyTextSchema,
  urgency: nonEmptyTextSchema,
  solutionType: nonEmptyTextSchema,
  material: nonEmptyTextSchema,
  usage: nonEmptyTextSchema,
  installationMethod: nonEmptyTextSchema,
  quantity: nonEmptyTextSchema,
  evidence: nonEmptyTextSchema,
  estimatedAmount: positiveAmountSchema,
  createdAt: nonEmptyTextSchema
});

export const createPreliminaryQuoteSchema = preliminaryQuoteSchema.omit({
  id: true,
  folio: true,
  createdAt: true
});

export type SolutionType = (typeof solutionTypes)[number];
export type Material = (typeof materials)[number];
export type SpaceType = (typeof spaceTypes)[number];
export type UrgencyLevel = (typeof urgencyLevels)[number];
export type UsageType = (typeof usageTypes)[number];
export type InstallationMethod = (typeof installationMethods)[number];
export type PreliminaryQuoteDto = z.infer<typeof preliminaryQuoteSchema>;
export type CreatePreliminaryQuoteDto = z.infer<typeof createPreliminaryQuoteSchema>;

export interface QuoteRepository {
  listPreliminaryQuotes(): PreliminaryQuoteDto[];
  createPreliminaryQuote(input: CreatePreliminaryQuoteDto): PreliminaryQuoteDto;
  generateDemoFolio(date?: Date): string;
}
