export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateQuotePdfMetadataSchema } from "@/modules/api/schemas";

function asMetadata(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = updateQuotePdfMetadataSchema.parse(body);

    const existing = await prisma.quote.findUnique({
      where: { id: input.quoteId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Cotizacion no encontrada." },
        { status: 404 }
      );
    }

    const previousMetadata = asMetadata(existing.pdfMetadata);

    const quote = await prisma.quote.update({
      where: { id: input.quoteId },
      data: {
        pdfVersion: input.version,
        pdfGeneratedAt: new Date(input.generatedAt),
        pdfStatus: input.status,
        pdfMetadata: {
          ...previousMetadata,
          version: input.version,
          generatedAt: input.generatedAt,
          total: input.total,
          status: input.status
        }
      }
    });

    await prisma.activityLog.create({
      data: {
        type: "PDF_GENERATED",
        quoteId: quote.id,
        leadId: quote.leadId,
        message: `PDF generado para ${quote.folio}`,
        metadata: {
          version: input.version,
          total: input.total,
          status: input.status,
          generatedBy: "human_cotizador"
        }
      }
    });

    return NextResponse.json({
      ok: true,
      quoteId: quote.id,
      folio: quote.folio
    });
  } catch (error) {
    console.error("Quote PDF metadata update failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el PDF."
      },
      { status: 400 }
    );
  }
}
