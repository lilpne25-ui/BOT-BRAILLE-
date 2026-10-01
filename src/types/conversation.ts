import {
  ChoiceOption,
  ConversationCapturedData,
  ConversationSessionDto,
  ConversationStepDefinition,
  ConversationStepId,
  ConversationStatus,
  MessageRole
} from "@/modules/whatsapp/contracts";

export type {
  ChoiceOption,
  ConversationCapturedData,
  ConversationStepDefinition,
  ConversationStepId,
  ConversationStatus,
  MessageRole
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  stepId?: ConversationStepId;
};

export type ConversationSession = ConversationSessionDto;

export type PostQuoteIntent = "needs_human" | "restarted";

export type EngineProcessResult = {
  session: ConversationSession;
  replies: string[];
  stepPrompt?: string;
  postQuoteIntent?: PostQuoteIntent;
};

export type GeneratedProspectDraft = {
  client: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  source: "WhatsApp";
  painPoint: string;
  interestedSolutions: string[];
  internalNotes: string;
  estimatedValue: number;
  nextAction: string;
};

export type ConversationCrmPayload = {
  prospect: GeneratedProspectDraft;
};
