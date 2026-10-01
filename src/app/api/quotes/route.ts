export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createQuoteInputSchema } from "@/modules/api/schemas";
import { formatQuoteFolio, getNextQuoteSequence } from "@/modules/quotes/folio";
import { createLeadWithCode } from "@/modules/leads/create-lead-with-code";
import {
  createCascadeSnapshot,
  readCascadeSnapshot,
  withCascadeSnapshot
} from "@/modules/cascade/operational";

type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;

function asMetadata(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function serializeQuote(
  quote: Prisma.QuoteGetPayload<{
    include: {
      items: true;
      lead: {
        include: {
          contacts: true;
        };
      };
    };
  }>
) {
  const metadata = asMetadata(quote.pdfMetadata);
  const primaryContact =
    quote.lead.contacts.find((contact) => contact.isPrimary) ??
    quote.lead.contacts[0];
  const cascadeSnapshot =
    readCascadeSnapshot(metadata);

  return {
    id: quote.id,
    folio: quote.folio,
    leadId: quote.leadId,
    leadCode: quote.lead.code,
    client:
      cascadeSnapshot?.client ??
      quote.lead.companyName,
    contact:
      cascadeSnapshot?.contactName ??
      primaryContact?.name ??
      "Contacto pendiente",
    email:
      cascadeSnapshot?.contactEmail ??
      primaryContact?.email ??
      "",
    phone:
      cascadeSnapshot?.contactPhone ??
      primaryContact?.phone ??
      "",
    city:
      cascadeSnapshot?.city ??
      quote.lead.city,
    cascadeSource:
      cascadeSnapshot
        ? "Prospecto"
        : "Legado",
    cascadeCapturedAt:
      cascadeSnapshot?.capturedAt,
    status: quote.status,
    subtotal: quote.subtotal,
    installation: quote.installation,
    tax: quote.tax,
    total: quote.total,
    pdfStatus: quote.pdfStatus,
    pdfVersion: quote.pdfVersion,
    projectLocation: String(metadata.projectLocation ?? ""),
    spaceType: String(metadata.spaceType ?? "Otro"),
    urgency: String(metadata.urgency ?? "Normal"),
    solutionType: String(metadata.solutionType ?? quote.lead.projectType),
    material: String(metadata.material ?? "TPU"),
    usage: String(metadata.usage ?? "Interior"),
    installationMethod: String(
      metadata.installationMethod ?? "Instalacion especializada"
    ),
    estimatedDelivery: String(metadata.estimatedDelivery ?? ""),
    observations: String(metadata.observations ?? ""),
    quantity: String(metadata.quantity ?? "Por definir"),
    evidence: String(metadata.evidence ?? "Sin archivo"),
    items: quote.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      description: item.description,
      solutionType: item.solutionType,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      installationCost: item.installationCost,
      notes: item.notes
    })),
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString()
  };
}

async function resolveLeadId(
  tx: Prisma.TransactionClient,
  input: CreateQuoteInput
) {
  if (input.leadId) {
    const existing = await tx.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("El prospecto asociado ya no existe.");
    }

    return existing.id;
  }

  if (input.leadCode) {
    const existing = await tx.lead.findUnique({
      where: { code: input.leadCode },
      select: { id: true }
    });

    if (!existing) {
      throw new Error(`No existe el prospecto ${input.leadCode}.`);
    }

    return existing.id;
  }

  if (!input.lead) {
    throw new Error("No se recibio un prospecto para la cotizacion.");
  }

  const existingLead = await tx.lead.findFirst({
    where: {
      companyName: input.lead.client,
      city: input.lead.city
    },
    orderBy: { updatedAt: "desc" }
  });

  if (existingLead) {
    return existingLead.id;
  }

  const newLead = await createLeadWithCode(tx, {
    companyName: input.lead.client,
    city: input.lead.city,
    projectType: input.lead.projectType,
    status: "NEW",
    source: "WEB",
    painPoint: input.lead.painPoint,
    estimatedValue: input.lead.estimatedValue,
    nextAction: input.lead.nextAction,
    nextActionDate: new Date(),
    internalNotes: input.lead.internalNotes,
    contacts: {
      create: {
        name: input.lead.contact,
        email: input.lead.email,
        phone: input.lead.phone,
        isPrimary: true
      }
    }
  });

  return newLead.id;
}

async function createQuoteWithRetry(input: CreateQuoteInput) {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const sequence = await getNextQuoteSequence(tx, year);
        const folio = formatQuoteFolio(year, sequence);
        const leadId = await resolveLeadId(tx, input);

        const sourceLead =
          await tx.lead.findUnique({
            where: {
              id: leadId
            },
            include: {
              contacts: true
            }
          });

        if (!sourceLead) {
          throw new Error(
            "El prospecto asociado ya no existe."
          );
        }

        const primaryContact =
          sourceLead.contacts.find(
            (contact) =>
              contact.isPrimary
          ) ??
          sourceLead.contacts[0];

        const cascadeSnapshot =
          createCascadeSnapshot({
            leadCode:
              sourceLead.code,
            client:
              sourceLead.companyName,
            contactName:
              primaryContact?.name,
            contactEmail:
              primaryContact?.email,
            contactPhone:
              primaryContact?.phone,
            city:
              sourceLead.city,
            projectType:
              sourceLead.projectType
          });

        const quoteMetadata =
          withCascadeSnapshot(
            input.pdfMetadata,
            cascadeSnapshot
          );

        const quote = await tx.quote.create({
          data: {
            folio,
            year,
            sequence,
            version: 1,
            status: input.status,
            currency: "MXN",
            subtotal: input.subtotal,
            installation: input.installation,
            tax: input.tax,
            total: input.total,
            leadId,
            pdfVersion: input.pdfMetadata?.version ?? 1,
            pdfGeneratedAt:
              input.pdfMetadata &&
              input.pdfMetadata.status !== "PENDING"
                ? new Date(input.pdfMetadata.generatedAt)
                : null,
            pdfStatus: input.pdfMetadata?.status ?? "PENDING",
            pdfMetadata:
              quoteMetadata as Prisma.InputJsonValue,
            items: {
              create: input.items.map((item) => ({
                productName: item.productName,
                description: item.description,
                solutionType: item.solutionType,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                installationCost: item.installationCost ?? 0,
                notes: item.notes
              }))
            }
          },
          include: {
            items: true,
            lead: {
              include: {
                contacts: true
              }
            }
          }
        });

        await tx.lead.update({
          where: { id: leadId },
          data: {
            estimatedValue: input.total,
            nextAction:
              input.status === "DRAFT"
                ? "Revisar borrador de cotizacion."
                : "Dar seguimiento a la cotizacion enviada."
          }
        });

        await tx.activityLog.create({
          data: {
            type: "QUOTE_CREATED",
            message: `Cotizacion ${folio} creada por un ejecutivo`,
            leadId,
            quoteId: quote.id,
            metadata: {
              total: input.total,
              items: input.items.length,
              status: input.status,
              origin: "human_cotizador",
              cascade:
                "PROSPECT_TO_QUOTE",
              leadCode:
                sourceLead.code
            }
          }
        });

        return quote;
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

  throw new Error("No se pudo generar folio correlativo para la cotizacion.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leadCode = url.searchParams.get("leadCode")?.trim();
  const client = url.searchParams.get("client")?.trim();
  const city = url.searchParams.get("city")?.trim();

  const where: Prisma.QuoteWhereInput = {};

  if (leadCode) {
    where.lead = {
      is: {
        code: leadCode
      }
    };
  } else if (client) {
    where.lead = {
      is: {
        companyName: client,
        ...(city ? { city } : {})
      }
    };
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      items: true,
      lead: {
        include: { contacts: true }
      }
    },
    take: 50
  });

  return NextResponse.json(quotes.map(serializeQuote));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createQuoteInputSchema.parse(body);
    const quote = await createQuoteWithRetry(input);

    return NextResponse.json(
      serializeQuote(quote),
      { status: 201 }
    );
  } catch (error) {
    console.error("Create quote failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la cotizacion."
      },
      { status: 400 }
    );
  }
}
