import { LeadDto } from "@/modules/crm/contracts";
import { ConversationCrmPayload } from "@/types/conversation";

type ConversationLeadDraft = Omit<
  LeadDto,
  "id" | "ownerId"
>;

export function createLeadFromConversationPayload(
  payload: ConversationCrmPayload,
  date = new Date()
): ConversationLeadDraft {
  const isoDate = date.toISOString().slice(0, 10);
  const prospect = payload.prospect;

  return {
    client: prospect.client,
    contact: prospect.contact,
    email: prospect.email,
    phone: prospect.phone,
    city: prospect.city,
    projectType: prospect.projectType,
    status: "Pendiente de revision humana",
    lastActivity: isoDate,
    nextAction: prospect.nextAction,
    nextActionDate: isoDate,
    owner: "Sofia",
    estimatedValue: 0,
    source: "WhatsApp",
    painPoint: prospect.painPoint,
    interestedSolutions:
      prospect.interestedSolutions,
    internalNotes: prospect.internalNotes,
    activities: [
      {
        id: `WA-${isoDate}-A1`,
        date: isoDate,
        type: "WhatsApp",
        note:
          "Expediente creado desde el simulador y enviado a revisión humana."
      }
    ]
  };
}
