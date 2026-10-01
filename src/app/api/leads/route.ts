export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createLeadSchema } from "@/modules/crm/contracts";
import { prisma } from "@/lib/prisma";
import {
  mapLeadSourceFromDb,
  mapLeadSourceToDb,
  mapLeadStatusFromDb,
  mapLeadStatusToDb
} from "@/modules/db/mappers";
import { createLeadWithCode } from "@/modules/leads/create-lead-with-code";

function mapActivityType(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "Nota interna" as const;
  }

  const activityType = (metadata as Record<string, unknown>).activityType;
  if (
    activityType === "Llamada" ||
    activityType === "Correo" ||
    activityType === "Visita" ||
    activityType === "WhatsApp" ||
    activityType === "Nota interna"
  ) {
    return activityType;
  }

  return "Nota interna" as const;
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      contacts: true,
      activityLogs: {
        orderBy: { createdAt: "desc" }
      },
      owner: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const payload = leads.map((lead) => {
    const primaryContact =
      lead.contacts.find((contact) => contact.isPrimary) ??
      lead.contacts[0];

    return {
      id: lead.code,
      client: lead.companyName,
      contact: primaryContact?.name ?? "Contacto pendiente",
      email: primaryContact?.email ?? "sin-correo@demo.mx",
      phone: primaryContact?.phone ?? "+52 55 0000 0000",
      city: lead.city,
      projectType: lead.projectType,
      status: mapLeadStatusFromDb(lead.status),
      lastActivity: (
        lead.activityLogs[0]?.createdAt ?? lead.updatedAt
      )
        .toISOString()
        .slice(0, 10),
      nextAction: lead.nextAction,
      nextActionDate: lead.nextActionDate.toISOString().slice(0, 10),
      owner: lead.owner?.name ?? "Sin asignar",
      ownerId: lead.ownerId,
      estimatedValue: lead.estimatedValue,
      source: mapLeadSourceFromDb(lead.source),
      painPoint: lead.painPoint,
      interestedSolutions: [lead.projectType],
      internalNotes: lead.internalNotes,
      activities: lead.activityLogs.slice(0, 20).map((log) => ({
        id: log.id,
        date: log.createdAt.toISOString().slice(0, 10),
        type: mapActivityType(log.metadata),
        note: log.message
      }))
    };
  });

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const body = await request.json();
  const input = createLeadSchema.parse(body);

  if (input.ownerId) {
    const owner = await prisma.user.findFirst({
      where: {
        id: input.ownerId,
        role: {
          in: ["ADMIN", "SALES"]
        }
      }
    });

    if (!owner) {
      return NextResponse.json(
        { error: "El responsable seleccionado no es válido." },
        { status: 400 }
      );
    }
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const lead = await createLeadWithCode(tx, {
          companyName: input.client,
          city: input.city,
          projectType: input.projectType,
          status: mapLeadStatusToDb(input.status),
          source: mapLeadSourceToDb(input.source),
          painPoint: input.painPoint,
          estimatedValue: input.estimatedValue,
          nextAction: input.nextAction,
          nextActionDate: new Date(input.nextActionDate),
          internalNotes: input.internalNotes,
          owner: input.ownerId
            ? {
                connect: {
                  id: input.ownerId
                }
              }
            : undefined,
          contacts: {
            create: {
              name: input.contact,
              email: input.email,
              phone: input.phone,
              isPrimary: true
            }
          }
        });

        await tx.activityLog.create({
          data: {
            type: "LEAD_CREATED",
            message: `Prospecto ${lead.code} creado manualmente en CRM`,
            leadId: lead.id,
            metadata: {
              activityType: "Nota interna",
              source: "manual"
            }
          }
        });

        return lead;
      });

      return NextResponse.json(
        {
          id: created.code
        },
        { status: 201 }
      );
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
    { error: "No se pudo generar un código de prospecto único." },
    { status: 409 }
  );
}
