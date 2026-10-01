export type LeadCascadeImpact = {
  contacts: number;
  quotes: number;
  quoteItems: number;
  projects: number;
  warranties: number;
  conversations: number;
  conversationSessions: number;
  conversationMessages: number;
  auditEventsPreserved: number;
};

export function buildProspectDeleteConfirmation(
  code: string
) {
  return `ELIMINAR ${code}`;
}

export function isValidProspectDeleteConfirmation(
  code: string,
  confirmation: string
) {
  return (
    confirmation.trim() ===
    buildProspectDeleteConfirmation(
      code
    )
  );
}

export function totalCascadeRecords(
  impact: LeadCascadeImpact
) {
  return (
    1 +
    impact.contacts +
    impact.quotes +
    impact.quoteItems +
    impact.projects +
    impact.warranties +
    impact.conversations +
    impact.conversationSessions +
    impact.conversationMessages
  );
}
