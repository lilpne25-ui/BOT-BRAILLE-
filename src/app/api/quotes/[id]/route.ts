export const dynamic = "force-dynamic";

import {
  LeadStatus,
  Prisma,
  QuoteStatus
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { updateQuoteInputSchema } from "@/modules/api/schemas";
import {
  formatProjectCode,
  parseProjectSequence
} from "@/modules/projects/operational";
import {
  createCascadeSnapshot,
  preserveCascadeSnapshot,
  readCascadeSnapshot
} from "@/modules/cascade/operational";

type RouteContext = {
  params: {
    id: string;
  };
};

function leadStatusForQuote(
  status: QuoteStatus
): LeadStatus | null {
  if (status === "SENT") return "QUOTE_SENT";
  if (status === "ACCEPTED") return "WON";
  if (status === "REJECTED") return "LOST";
  return null;
}

function nextActionForQuote(
  status: QuoteStatus
) {
  if (status === "SENT") {
    return "Dar seguimiento a la cotizacion enviada.";
  }

  if (status === "ACCEPTED") {
    return "Proyecto transferido a operaciones. Confirmar responsable y plan de ejecucion.";
  }

  if (status === "REJECTED") {
    return "Registrar motivo de perdida y cerrar seguimiento.";
  }

  return "Revisar borrador de cotizacion.";
}

function metadataObject(
  value: Prisma.JsonValue | null
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

async function nextProjectCode(
  tx: Prisma.TransactionClient
) {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;

  const existing = await tx.project.findMany({
    where: {
      code: {
        startsWith: prefix
      }
    },
    select: {
      code: true
    },
    orderBy: {
      code: "desc"
    },
    take: 20
  });

  const highest = existing.reduce(
    (current, row) => {
      const sequence =
        parseProjectSequence(
          row.code,
          year
        );

      return sequence &&
        sequence > current
        ? sequence
        : current;
    },
    0
  );

  return formatProjectCode(
    year,
    highest + 1
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const body =
      await request.json();
    const input =
      updateQuoteInputSchema.parse(
        body
      );
    const session =
      getCurrentSession();

    const existing =
      await prisma.quote.findUnique({
        where: {
          id: context.params.id
        },
        include: {
          items: true,
          lead: {
            include: {
              owner: true,
              contacts: true
            }
          },
          projects: {
            select: {
              id: true,
              code: true
            }
          }
        }
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Cotizacion no encontrada."
        },
        { status: 404 }
      );
    }

    const primaryContact =
      existing.lead.contacts.find(
        (contact) =>
          contact.isPrimary
      ) ??
      existing.lead.contacts[0];

    const fallbackCascadeSnapshot =
      createCascadeSnapshot({
        leadCode:
          existing.lead.code,
        client:
          existing.lead.companyName,
        contactName:
          primaryContact?.name,
        contactEmail:
          primaryContact?.email,
        contactPhone:
          primaryContact?.phone,
        city:
          existing.lead.city,
        projectType:
          existing.lead.projectType
      });

    const immutableCascadeSnapshot =
      readCascadeSnapshot(
        existing.pdfMetadata
      ) ??
      fallbackCascadeSnapshot;

    const result =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.quote.update({
              where: {
                id: existing.id
              },
              data: {
                ...(input.status !==
                undefined
                  ? {
                      status:
                        input.status
                    }
                  : {}),
                ...(input.subtotal !==
                undefined
                  ? {
                      subtotal:
                        input.subtotal
                    }
                  : {}),
                ...(input.installation !==
                undefined
                  ? {
                      installation:
                        input.installation
                    }
                  : {}),
                ...(input.tax !==
                undefined
                  ? {
                      tax:
                        input.tax
                    }
                  : {}),
                ...(input.total !==
                undefined
                  ? {
                      total:
                        input.total
                    }
                  : {}),
                ...(input.pdfMetadata !==
                undefined
                  ? {
                      pdfMetadata:
                        preserveCascadeSnapshot(
                          existing.pdfMetadata,
                          input.pdfMetadata,
                          immutableCascadeSnapshot
                        ) as Prisma.InputJsonValue
                    }
                  : {}),
                ...(input.items !==
                undefined
                  ? {
                      items: {
                        deleteMany: {},
                        create:
                          input.items.map(
                            (item) => ({
                              productName:
                                item.productName,
                              description:
                                item.description,
                              solutionType:
                                item.solutionType,
                              unit:
                                item.unit,
                              quantity:
                                item.quantity,
                              unitPrice:
                                item.unitPrice,
                              installationCost:
                                item.installationCost ??
                                0,
                              notes:
                                item.notes
                            })
                          )
                      }
                    }
                  : {})
              },
              include: {
                items: true
              }
            });

          if (
            input.total !==
            undefined
          ) {
            await tx.lead.update({
              where: {
                id:
                  existing.leadId
              },
              data: {
                estimatedValue:
                  input.total
              }
            });
          }

          let projectCode:
            | string
            | null =
            existing.projects[0]
              ?.code ?? null;

          if (
            input.status !==
              undefined &&
            input.status !==
              existing.status
          ) {
            const mappedLeadStatus =
              leadStatusForQuote(
                input.status
              );

            await tx.lead.update({
              where: {
                id:
                  existing.leadId
              },
              data: {
                ...(mappedLeadStatus
                  ? {
                      status:
                        mappedLeadStatus
                    }
                  : {}),
                nextAction:
                  nextActionForQuote(
                    input.status
                  )
              }
            });

            await tx.activityLog.create({
              data: {
                type:
                  "STATUS_CHANGED",
                message:
                  `Cotizacion ${existing.folio} cambio de ${existing.status} a ${input.status}`,
                userId:
                  session?.id,
                leadId:
                  existing.leadId,
                quoteId:
                  existing.id,
                metadata: {
                  entity:
                    "quote",
                  oldValue:
                    existing.status,
                  newValue:
                    input.status,
                  changedBy:
                    "human_cotizador"
                }
              }
            });

            if (
              input.status ===
              "ACCEPTED"
            ) {
              const previousProject =
                await tx.project.findFirst({
                  where: {
                    quoteId:
                      existing.id
                  },
                  select: {
                    id: true,
                    code: true
                  }
                });

              if (previousProject) {
                projectCode =
                  previousProject.code;
              } else {
                const code =
                  await nextProjectCode(
                    tx
                  );
                const metadataSource: Prisma.JsonValue | null =
                  input.pdfMetadata
                    ? (preserveCascadeSnapshot(
                        existing.pdfMetadata,
                        input.pdfMetadata,
                        immutableCascadeSnapshot
                      ) as unknown as Prisma.JsonValue)
                    : existing.pdfMetadata;
                const metadata =
                  metadataObject(
                    metadataSource
                  );
                const snapshot =
                  immutableCascadeSnapshot;
                const items =
                  input.items ??
                  existing.items.map(
                    (item) => ({
                      productName:
                        item.productName,
                      description:
                        item.description,
                      solutionType:
                        item.solutionType,
                      unit:
                        item.unit,
                      quantity:
                        item.quantity,
                      unitPrice:
                        item.unitPrice,
                      installationCost:
                        item.installationCost,
                      notes:
                        item.notes ??
                        undefined
                    })
                  );
                const solutionType =
                  String(
                    metadata.solutionType ??
                      items[0]
                        ?.solutionType ??
                      existing.lead
                        .projectType
                  );
                const projectLocation =
                  String(
                    metadata.projectLocation ??
                      ""
                  );
                const estimatedInstallation =
                  new Date();

                estimatedInstallation.setDate(
                  estimatedInstallation.getDate() +
                    14
                );

                const project =
                  await tx.project.create({
                    data: {
                      code,
                      leadId:
                        existing.leadId,
                      quoteId:
                        existing.id,
                      clientName:
                        snapshot.client,
                      name:
                        projectLocation
                          ? `${solutionType} - ${projectLocation}`
                          : `${solutionType} - ${snapshot.city}`,
                      solutionType,
                      city:
                        snapshot.city,
                      status:
                        "APPROVED",
                      responsible:
                        existing.lead
                          .owner?.name ??
                        "Sin asignar",
                      estimatedInstallation,
                      progress: 15,
                      risk: "LOW",
                      evidenceCount: 0,
                      nextAction:
                        "Asignar responsable operativo y confirmar plan de produccion e instalacion.",
                      mainItems:
                        items.map(
                          (item) =>
                            item.productName
                        ) as Prisma.InputJsonValue,
                      timeline:
                        [
                          {
                            id:
                              crypto.randomUUID(),
                            date:
                              new Date()
                                .toISOString()
                                .slice(
                                  0,
                                  10
                                ),
                            title:
                              "Proyecto creado desde cotizacion aceptada",
                            note:
                              `Cotizacion ${existing.folio} aceptada. Proyecto transferido automaticamente a operaciones.`
                          }
                        ] as Prisma.InputJsonValue
                    }
                  });

                projectCode =
                  project.code;

                await tx.activityLog.create({
                  data: {
                    type:
                      "STATUS_CHANGED",
                    message:
                      `Proyecto ${project.code} creado desde ${existing.folio}`,
                    userId:
                      session?.id,
                    leadId:
                      existing.leadId,
                    quoteId:
                      existing.id,
                    projectId:
                      project.id,
                    metadata: {
                      entity:
                        "project",
                      action:
                        "created_from_accepted_quote",
                      quoteFolio:
                        existing.folio,
                      cascade:
                        "QUOTE_TO_PROJECT",
                      leadCode:
                        snapshot.leadCode
                    }
                  }
                });
              }
            }
          } else if (
            input.items !==
              undefined ||
            input.total !==
              undefined
          ) {
            await tx.activityLog.create({
              data: {
                type:
                  "STATUS_CHANGED",
                message:
                  `Cotizacion ${existing.folio} actualizada por un ejecutivo`,
                userId:
                  session?.id,
                leadId:
                  existing.leadId,
                quoteId:
                  existing.id,
                metadata: {
                  entity:
                    "quote",
                  action:
                    "updated",
                  total:
                    input.total ??
                    existing.total
                }
              }
            });
          }

          return {
            updated,
            projectCode
          };
        }
      );

    return NextResponse.json({
      id: result.updated.id,
      folio:
        result.updated.folio,
      status:
        result.updated.status,
      total:
        result.updated.total,
      projectCode:
        result.projectCode,
      updatedAt:
        result.updated.updatedAt.toISOString()
    });
  } catch (error) {
    console.error(
      "Update quote failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la cotizacion."
      },
      { status: 400 }
    );
  }
}
