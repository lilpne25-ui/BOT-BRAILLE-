export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function metadataObject(
  value: Prisma.JsonValue | null
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {} as Record<
      string,
      unknown
    >;
  }

  return value as Record<
    string,
    unknown
  >;
}

export async function GET() {
  const [
    responsibleUsers,
    acceptedQuotes
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [
            "ADMIN",
            "OPERATIONS"
          ]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.quote.findMany({
      where: {
        status: "ACCEPTED",
        projects: {
          none: {}
        }
      },
      include: {
        lead: true,
        items: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 50
    })
  ]);

  return NextResponse.json({
    responsibleUsers,
    acceptedQuotes:
      acceptedQuotes.map(
        (quote) => {
          const metadata =
            metadataObject(
              quote.pdfMetadata
            );

          return {
            id: quote.id,
            folio: quote.folio,
            leadCode:
              quote.lead.code,
            client:
              quote.lead
                .companyName,
            city:
              quote.lead.city,
            solutionType:
              String(
                metadata.solutionType ??
                  quote.items[0]
                    ?.solutionType ??
                  quote.lead
                    .projectType
              ),
            projectLocation:
              String(
                metadata.projectLocation ??
                  ""
              ),
            items:
              quote.items.map(
                (item) =>
                  item.productName
              )
          };
        }
      )
  });
}
