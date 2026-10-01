import { z } from "zod";
import { chatMessageSchema, conversationSessionSchema } from "@/modules/whatsapp/contracts";
import { leadStatusValues } from "@/modules/crm/contracts";
import { isoDateSchema } from "@/modules/shared/schemas";

export const quoteStatusValues = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED"
] as const;

export const createQuoteItemInputSchema = z.object({
  productName: z.string().min(1),
  description: z.string().min(1),
  solutionType: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  installationCost: z.number().nonnegative().default(0),
  notes: z.string().optional()
});

export const quotePdfMetadataSchema = z.object({
  folio: z.string(),
  version: z.number().int().positive(),
  generatedAt: z.string(),
  total: z.number().nonnegative(),
  status: z.enum(["PENDING", "GENERATED", "SENT", "ARCHIVED"]),
  projectLocation: z.string().optional(),
  spaceType: z.string().optional(),
  urgency: z.string().optional(),
  solutionType: z.string().optional(),
  material: z.string().optional(),
  usage: z.string().optional(),
  installationMethod: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  observations: z.string().optional(),
  quantity: z.string().optional(),
  evidence: z.string().optional()
});

export const createQuoteInputSchema = z
  .object({
    leadId: z.string().min(1).optional(),
    leadCode: z.string().min(1).optional(),
    lead: z
      .object({
        client: z.string().min(1),
        contact: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        city: z.string().min(1),
        projectType: z.string().min(1),
        painPoint: z.string().min(1),
        nextAction: z.string().min(1),
        internalNotes: z.string().min(1),
        estimatedValue: z.number().nonnegative()
      })
      .optional(),
    status: z.enum(quoteStatusValues).default("DRAFT"),
    subtotal: z.number().nonnegative(),
    installation: z.number().nonnegative(),
    tax: z.number().nonnegative(),
    total: z.number().nonnegative(),
    items: z.array(createQuoteItemInputSchema).min(1),
    pdfMetadata: quotePdfMetadataSchema.optional()
  })
  .refine(
    (data) => Boolean(data.leadId || data.leadCode || data.lead),
    {
      message: "Debes asociar la cotizacion a un prospecto."
    }
  );

export const updateQuoteInputSchema = z
  .object({
    status: z.enum(quoteStatusValues).optional(),
    subtotal: z.number().nonnegative().optional(),
    installation: z.number().nonnegative().optional(),
    tax: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
    items: z.array(createQuoteItemInputSchema).min(1).optional(),
    pdfMetadata: quotePdfMetadataSchema.optional()
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.subtotal !== undefined ||
      data.installation !== undefined ||
      data.tax !== undefined ||
      data.total !== undefined ||
      data.items !== undefined ||
      data.pdfMetadata !== undefined,
    {
      message: "Debes enviar al menos un campo de la cotizacion."
    }
  );

export const updateQuotePdfMetadataSchema = z.object({
  quoteId: z.string().min(1),
  version: z.number().int().positive().default(1),
  generatedAt: z.string(),
  total: z.number().nonnegative(),
  status: z.enum(["PENDING", "GENERATED", "SENT", "ARCHIVED"]).default("GENERATED")
});

export const startConversationSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional()
});

export const persistConversationMessageSchema = z.object({
  userMessage: chatMessageSchema,
  assistantMessages: z.array(chatMessageSchema),
  session: conversationSessionSchema
});

export const updateLeadStatusSchema = z
  .object({
    status: z.enum(leadStatusValues).optional(),
    nextAction: z.string().min(1).optional(),
    nextActionDate: isoDateSchema.optional()
  })
  .refine((data) => data.status || data.nextAction || data.nextActionDate, {
    message: "Debes enviar al menos un campo a actualizar"
  });

export const closeConversationSchema = z.object({
  sessionId: z.string().min(1),
  leadData: z.object({
    client: z.string().min(1),
    contact: z.string().min(1),
    email: z.string().min(1).default("contacto-whatsapp@demo.mx"),
    phone: z.string().min(1).default("+52 55 0000 0000"),
    city: z.string().min(1),
    projectType: z.string().min(1),
    painPoint: z.string().min(1),
    estimatedValue: z.number().nonnegative(),
    nextAction: z.string().min(1),
    internalNotes: z.string().min(1)
  }),
  quoteData: z.object({
    projectLocation: z.string().min(1),
    spaceType: z.string().min(1),
    urgency: z.string().min(1),
    solutionType: z.string().min(1),
    material: z.string().min(1),
    usage: z.string().min(1),
    installationMethod: z.string().min(1),
    quantity: z.string().min(1),
    evidence: z.string().min(1),
    estimatedAmount: z.number().nonnegative()
  })
});
