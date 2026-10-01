export type WhatsAppProviderMode = "mock" | "meta" | "twilio" | "baileys";

export type NormalizedInboundMessage = {
  phone: string;
  name?: string;
  messageText: string;
  messageType: string;
  timestamp: string;
  // Undefined when the provider sent no id (Meta). Never replace it with a random value.
  providerMessageId?: string;
  // Provider account that received the message (Meta: metadata.phone_number_id).
  channelId?: string;
  rawPayload: unknown;
  transcribedFromAudio?: boolean;
};

export type OutboundMessage = {
  to: string;
  text: string;
};

export type OutboundDocument = {
  to: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  caption?: string;
};
