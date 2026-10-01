import { describe, expect, it } from "vitest";
import {
  buildCrmPayloadFromSession,
  createInitialConversationSession,
  generateDemoFolio,
  processConversationMessage
} from "@/lib/conversation-engine";

describe("conversation engine", () => {
  it("conserva el folio demo solo por compatibilidad", () => {
    const folioA = generateDemoFolio(
      "session-demo-1",
      new Date("2026-06-01T00:00:00Z")
    );
    const folioB = generateDemoFolio(
      "session-demo-1",
      new Date("2026-06-01T00:00:00Z")
    );

    expect(folioA).toBe(folioB);
    expect(folioA).toMatch(/^BI-COT-2026-\d{3}$/);
  });

  it("formatea opciones con menús numéricos", async () => {
    const session = createInitialConversationSession();
    const result1 = await processConversationMessage(
      session,
      "quiero cotizar"
    );
    const result2 = await processConversationMessage(
      result1.session,
      "Hospital Santa Lucia"
    );
    const result3 = await processConversationMessage(
      result2.session,
      "Lic. Andrea Perez"
    );
    const result3b = await processConversationMessage(
      result3.session,
      "andrea.perez@santalucia.mx"
    );
    const result3c = await processConversationMessage(
      result3b.session,
      "477 123 4567"
    );
    const result4 = await processConversationMessage(
      result3c.session,
      "Leon, Guanajuato"
    );
    const result5 = await processConversationMessage(
      result4.session,
      "Av. Juarez 123, Col. Centro"
    );

    const lastReply =
      result5.replies[result5.replies.length - 1];

    expect(lastReply).toContain(
      "Responde con el número de tu opción:"
    );
    expect(lastReply).toContain("1️⃣ Hospital");
    expect(lastReply).toContain("2️⃣ Plaza");
    expect(lastReply).toContain(
      "3️⃣ Centro comercial"
    );
  });

  it("mapea respuestas numéricas y textuales", async () => {
    const session = createInitialConversationSession();
    const mockSession = {
      ...session,
      status: "collecting" as const,
      currentStepIndex: 6,
      capturedData: {
        clientCompany: "Hospital Santa Lucia",
        contactName: "Lic. Andrea Perez",
        contactEmail:
          "andrea.perez@santalucia.mx",
        contactPhone: "477 123 4567",
        city: "Leon",
        projectLocation:
          "Av. Juarez 123, Col. Centro"
      }
    };

    const numeric = await processConversationMessage(
      mockSession,
      "2"
    );
    expect(
      numeric.session.capturedData.spaceType
    ).toBe("Plaza");

    const text = await processConversationMessage(
      mockSession,
      "Oficina"
    );
    expect(
      text.session.capturedData.spaceType
    ).toBe("Oficina");

    const invalid = await processConversationMessage(
      mockSession,
      "99"
    );
    expect(
      invalid.session.capturedData.spaceType
    ).toBeUndefined();
    expect(invalid.session.currentStepIndex).toBe(6);
  });

  it("termina en revisión humana sin folio, monto ni cotización automática", async () => {
    const session = createInitialConversationSession();
    const mockSession = {
      ...session,
      status: "collecting" as const,
      currentStepIndex: 13,
      capturedData: {
        clientCompany: "Hospital Santa Lucia",
        contactName: "Lic. Andrea Perez",
        contactEmail:
          "andrea.perez@santalucia.mx",
        contactPhone: "477 123 4567",
        city: "Leon",
        projectLocation:
          "Av. Juarez 123, Col. Centro",
        spaceType: "Hospital",
        urgency: "Normal",
        solutionType: "Piso podotactil",
        material: "Acero inoxidable",
        usage: "Exterior",
        installationMethod: "Epoxico",
        quantity: "150 piezas"
      }
    };
    let estimatorCalled = false;

    const result = await processConversationMessage(
      mockSession,
      "Sin archivo",
      async () => {
        estimatorCalled = true;
        return 99999;
      }
    );

    expect(estimatorCalled).toBe(false);
    expect(result.session.status).toBe("completed");
    expect(result.session.folio).toBeUndefined();
    expect(
      result.session.estimatedAmount
    ).toBeUndefined();
    expect(result.replies.join(" ")).toContain(
      "revisado por un ejecutivo"
    );
    expect(result.replies.join(" ")).toContain(
      "no se genera de forma automática"
    );
  });

  it("construye un expediente CRM sin exigir folio o monto", () => {
    const session = {
      ...createInitialConversationSession(),
      status: "completed" as const,
      completedAt: new Date().toISOString(),
      capturedData: {
        clientCompany: "Hospital Santa Lucia",
        contactName: "Lic. Andrea Perez",
        contactEmail:
          "andrea.perez@santalucia.mx",
        contactPhone: "477 123 4567",
        city: "Leon",
        projectLocation:
          "Av. Juarez 123, Col. Centro",
        spaceType: "Hospital",
        urgency: "Normal",
        solutionType: "Piso podotactil",
        material: "Acero inoxidable",
        usage: "Exterior",
        installationMethod: "Epoxico",
        quantity: "150 piezas",
        evidence: "Sin archivo"
      }
    };

    const payload =
      buildCrmPayloadFromSession(session);

    expect(payload).not.toBeNull();
    expect(payload?.prospect.estimatedValue).toBe(0);
    expect(
      payload?.prospect.internalNotes
    ).toContain("PENDING_HUMAN_REVIEW");
    expect(
      payload?.prospect.internalNotes
    ).toContain("Cotización automática: NO");
  });

  it("después de completar dirige cualquier duda a una persona", async () => {
    const session = {
      ...createInitialConversationSession(),
      status: "completed" as const,
      capturedData: {
        clientCompany: "Hospital Santa Lucia"
      }
    };

    const result = await processConversationMessage(
      session,
      "¿cuánto tiempo tarda la instalación?"
    );

    expect(result.postQuoteIntent).toBe(
      "needs_human"
    );
    expect(result.replies.join(" ")).toContain(
      "ejecutivo"
    );
  });

  it("reinicia el flujo para una solicitud nueva", async () => {
    const session = {
      ...createInitialConversationSession(),
      status: "completed" as const,
      capturedData: {
        clientCompany: "Hospital Santa Lucia"
      }
    };

    const result = await processConversationMessage(
      session,
      "quiero cotizar otra cosa"
    );

    expect(result.postQuoteIntent).toBe("restarted");
    expect(result.session.status).toBe("collecting");
    expect(result.session.currentStepIndex).toBe(0);
    expect(result.session.capturedData).toEqual({});
  });
});
