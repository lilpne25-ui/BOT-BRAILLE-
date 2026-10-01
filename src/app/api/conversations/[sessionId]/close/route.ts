export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeConversationSchema } from "@/modules/api/schemas";
import { upsertHumanReviewLead } from "@/modules/leads/upsert-human-review-lead";

type RouteContext = {
  params: {
    sessionId: string;
  };
};

function buildRequirements(input: {
  projectLocation: string;
  spaceType: string;
  urgency: string;
  solutionType: string;
  material: string;
  usage: string;
  installationMethod: string;
  quantity: string;
  evidence: string;
}) {
  return [
    `Ubicación del proyecto: ${input.projectLocation}`,
    `Tipo de espacio: ${input.spaceType}`,
    `Urgencia: ${input.urgency}`,
    `Solución de interés: ${input.solutionType}`,
    `Material: ${input.material}`,
    `Uso: ${input.usage}`,
    `Método de instalación: ${input.installationMethod}`,
    `Cantidad o metraje: ${input.quantity}`,
    `Evidencia: ${input.evidence}`,
    "Estado: PENDING_HUMAN_REVIEW",
    "Cotización automática: NO"
  ].join("\n");
}

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json();
  const input = closeConversationSchema.parse({
    ...body,
    sessionId: context.params.sessionId
  });

  const session = await prisma.conversationSession.findUnique({
    where: {
      id: input.sessionId
    }
  });

  if (!session) {
    return NextResponse.json(
      {
        error: "Conversation session not found"
      },
      {
        status: 404
      }
    );
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const outcome = await upsertHumanReviewLead(tx, {
          companyName: input.leadData.client,
          contactName: input.leadData.contact,
          email: input.leadData.email,
          phone: input.leadData.phone,
          city: input.leadData.city,
          projectType: input.leadData.projectType,
          source: "WHATSAPP",
          painPoint: input.leadData.painPoint,
          internalNotes: [
            input.leadData.internalNotes,
            buildRequirements(input.quoteData)
          ].join("\n\n"),
          nextAction:
            "Revisión humana del expediente y preparación de cotización."
        });

        await tx.conversationSession.update({
          where: {
            id: session.id
          },
          data: {
            status: "COMPLETED",
            operationalStatus: "REQUIRES_SALES",
            folio: null,
            estimatedAmount: null,
            completedAt: new Date(),
            lastError: null
          }
        });

        await tx.conversation.update({
          where: {
            id: session.conversationId
          },
          data: {
            leadId: outcome.lead.id,
            status: "COMPLETED"
          }
        });

        await tx.activityLog.createMany({
          data: [
            {
              type: outcome.created
                ? "LEAD_CREATED"
                : "STATUS_CHANGED",
              message: outcome.created
                ? `Lead ${outcome.lead.code} creado desde precalificación`
                : `Lead ${outcome.lead.code} actualizado desde precalificación`,
              leadId: outcome.lead.id,
              conversationId: session.conversationId,
              conversationSessionId: session.id,
              metadata: {
                source: "WHATSAPP",
                deduplicated: !outcome.created
              }
            },
            {
              type: "STATUS_CHANGED",
              message: `Lead ${outcome.lead.code} pendiente de revisión humana`,
              leadId: outcome.lead.id,
              conversationId: session.conversationId,
              conversationSessionId: session.id,
              metadata: {
                workflowStatus: "PENDING_HUMAN_REVIEW",
                quoteCreated: false,
                assignedTo: outcome.ownerName
              }
            }
          ]
        });

        return outcome;
      });

      const primaryContact =
        result.lead.contacts.find((contact) => contact.isPrimary) ??
        result.lead.contacts[0];

      return NextResponse.json({
        lead: {
          id: result.lead.code,
          client: result.lead.companyName,
          contact: primaryContact?.name ?? "Contacto pendiente",
          city: result.lead.city,
          projectType: result.lead.projectType,
          owner: result.ownerName
        },
        review: {
          status: "PENDING_HUMAN_REVIEW",
          quoteCreated: false,
          message:
            "El expediente quedó listo para que un ejecutivo revise y prepare la cotización."
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  return NextResponse.json(
    {
      error:
        "No se pudo registrar el expediente por un conflicto de identificador."
    },
    {
      status: 409
    }
  );
}
