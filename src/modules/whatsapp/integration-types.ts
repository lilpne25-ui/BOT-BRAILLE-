export type WhatsAppProviderMode = "mock" | "meta" | "twilio" | "baileys";

export type NormalizedInboundMessage = {
  phone: string;
  name?: string;
  messageText: string;
  messageType: string;
  timestamp: string;
  providerMessageId: string;
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
