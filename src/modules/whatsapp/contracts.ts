import { z } from "zod";
import { nonEmptyTextSchema, optionalTextSchema } from "@/modules/shared/schemas";

export const conversationStatusValues = ["idle", "collecting", "completed"] as const;
export const conversationStepIdValues = [
  "clientCompany",
  "contactName",
  "contactEmail",
  "contactPhone",
  "city",
  "projectLocation",
  "spaceType",
  "urgency",
  "solutionType",
  "material",
  "usage",
  "installationMethod",
  "quantity",
  "evidence"
] as const;
export const messageRoleValues = ["assistant", "user"] as const;

export const choiceOptionSchema = z.object({
  value: nonEmptyTextSchema,
  aliases: z.array(nonEmptyTextSchema).optional()
});

export const conversationStepDefinitionSchema = z.object({
  id: z.enum(conversationStepIdValues),
  label: nonEmptyTextSchema,
  question: nonEmptyTextSchema,
  helpText: optionalTextSchema,
  placeholder: optionalTextSchema,
  options: z.array(choiceOptionSchema).optional(),
  freeText: z.boolean()
});

export const conversationCapturedDataSchema = z.object({
  clientCompany: optionalTextSchema,
  contactName: optionalTextSchema,
  contactEmail: optionalTextSchema,
  contactPhone: optionalTextSchema,
  city: optionalTextSchema,
  projectLocation: optionalTextSchema,
  spaceType: optionalTextSchema,
  urgency: optionalTextSchema,
  solutionType: optionalTextSchema,
  material: optionalTextSchema,
  usage: optionalTextSchema,
  installationMethod: optionalTextSchema,
  quantity: optionalTextSchema,
  evidence: optionalTextSchema
});

export const chatMessageSchema = z.object({
  id: nonEmptyTextSchema,
  role: z.enum(messageRoleValues),
  text: nonEmptyTextSchema,
  timestamp: nonEmptyTextSchema,
  stepId: z.enum(conversationStepIdValues).optional()
});

export const conversationSessionSchema = z.object({
  id: nonEmptyTextSchema,
  status: z.enum(conversationStatusValues),
  startedAt: nonEmptyTextSchema,
  updatedAt: nonEmptyTextSchema,
  currentStepIndex: z.number().min(0),
  capturedData: conversationCapturedDataSchema,
  intentDetected: z.boolean(),
  completedAt: optionalTextSchema,
  folio: optionalTextSchema,
  estimatedAmount: z.number().positive().optional()
});

export const createConversationSessionSchema = z.object({
  status: z.enum(conversationStatusValues).default("idle"),
  currentStepIndex: z.number().min(0).default(0),
  capturedData: conversationCapturedDataSchema.default({}),
  intentDetected: z.boolean().default(false)
});

export type ConversationStatus = z.infer<typeof conversationSessionSchema>["status"];
export type ConversationStepId = z.infer<typeof conversationStepDefinitionSchema>["id"];
export type MessageRole = z.infer<typeof chatMessageSchema>["role"];
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type ConversationStepDefinition = z.infer<typeof conversationStepDefinitionSchema>;
export type ConversationCapturedData = z.infer<typeof conversationCapturedDataSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ConversationSessionDto = z.infer<typeof conversationSessionSchema>;

export interface ConversationRepository {
  createSession(): ConversationSessionDto;
  listSessions(): ConversationSessionDto[];
  getSessionById(id: string): ConversationSessionDto | null;
  saveSession(session: ConversationSessionDto): ConversationSessionDto;
  transitionStatus(id: string, status: ConversationStatus): ConversationSessionDto;
}
