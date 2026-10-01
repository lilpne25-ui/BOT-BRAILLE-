import {
  describe,
  expect,
  it
} from "vitest";
import { createLeadFromConversationPayload } from "@/modules/whatsapp/mappers";
import { ConversationCrmPayload } from "@/types/conversation";

describe("whatsapp mappers", () => {
  it("crea un lead pendiente de revisión humana", () => {
    const payload: ConversationCrmPayload = {
      prospect: {
        client: "Hospital Demo",
        contact: "Lic. Carla",
        email: "carla@hospitaldemo.mx",
        phone: "55 1234 5678",
        city: "CDMX",
        projectType: "Piso podotactil",
        source: "WhatsApp",
        painPoint:
          "No hay rutas accesibles",
        interestedSolutions: [
          "Piso podotactil"
        ],
        internalNotes:
          "Expediente capturado por simulador",
        estimatedValue: 0,
        nextAction:
          "Revisión humana y preparación de cotización"
      }
    };

    const lead =
      createLeadFromConversationPayload(
        payload,
        new Date(
          "2026-06-01T00:00:00Z"
        )
      );

    expect(lead.status).toBe(
      "Pendiente de revision humana"
    );
    expect(lead.source).toBe("WhatsApp");
    expect(lead.estimatedValue).toBe(0);
    expect(lead.lastActivity).toBe(
      "2026-06-01"
    );
    expect(lead.client).toBe(
      "Hospital Demo"
    );
    expect(lead.email).toBe(
      "carla@hospitaldemo.mx"
    );
    expect(lead.phone).toBe(
      "55 1234 5678"
    );
  });
});
