export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createProjectInputSchema
} from "@/modules/projects/contracts";
import {
  mapProjectRiskFromDb,
  mapProjectStatusFromDb
} from "@/modules/db/mappers";
import {
  appendTimelineEvent,
  formatProjectCode,
  mapProjectRiskToDb,
  mapProjectStatusToDb,
  normalizeTimeline,
  parseProjectSequence,
  recommendedProgress
} from "@/modules/projects/operational";
import {
  asJsonRecord,
  readCascadeSnapshot
} from "@/modules/cascade/operational";

function stringArray(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0
  );
}

function serializeProject(
  project: Prisma.ProjectGetPayload<{
    include: {
      lead: {
        include: {
          contacts: true;
        };
      };
      quote: true;
    };
  }>
) {
  const metadata =
    asJsonRecord(
      project.quote?.pdfMetadata
    );
  const snapshot =
    readCascadeSnapshot(
      metadata
    );
  const primaryContact =
    project.lead?.contacts.find(
      (contact) =>
        contact.isPrimary
    ) ??
    project.lead?.contacts[0];

  return {
    id: project.code,
    prospectId: project.leadId ?? undefined,
    prospectCode: project.lead?.code ?? undefined,
    quoteId: project.quoteId ?? undefined,
    quoteFolio: project.quote?.folio ?? undefined,
    contact:
      snapshot?.contactName ??
      primaryContact?.name ??
      undefined,
    email:
      snapshot?.contactEmail ??
      primaryContact?.email ??
      undefined,
    phone:
      snapshot?.contactPhone ??
      primaryContact?.phone ??
      undefined,
    cascadeSource:
      project.quoteId
        ? "Cotizacion"
        : project.leadId
          ? "Prospecto"
          : "Manual",
    client: project.clientName,
    name: project.name,
    solutionType: project.solutionType,
    city: project.city,
    status: mapProjectStatusFromDb(project.status),
    responsible: project.responsible,
    estimatedInstallation:
      project.estimatedInstallation.toISOString().slice(0, 10),
    progress: project.progress,
    risk: mapProjectRiskFromDb(project.risk),
    evidenceCount: project.evidenceCount,
    nextAction: project.nextAction,
    mainItems: stringArray(project.mainItems),
    timeline: normalizeTimeline(project.timeline),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
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
      const sequence = parseProjectSequence(
        row.code,
        year
      );

      return sequence && sequence > current
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

export async function GET() {
  const projects =
    await prisma.project.findMany({
      include: {
        lead: {
          include: {
            contacts: true
          }
        },
        quote: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

  return NextResponse.json(
    projects.map(serializeProject)
  );
}

export async function POST(
  request: Request
) {
  try {
    const input =
      createProjectInputSchema.parse(
        await request.json()
      );
    const session =
      getCurrentSession();

    for (
      let attempt = 0;
      attempt < 4;
      attempt += 1
    ) {
      try {
        const created =
          await prisma.$transaction(
            async (tx) => {
              let leadId:
                | string
                | undefined;
              let quoteId:
                | string
                | undefined =
                input.quoteId;

              let inherited:
                | {
                    client: string;
                    city: string;
                    solutionType: string;
                    mainItems: string[];
                  }
                | undefined;

              if (input.quoteId) {
                const quote =
                  await tx.quote.findUnique({
                    where: {
                      id: input.quoteId
                    },
                    include: {
                      projects: {
                        select: {
                          id: true,
                          code: true
                        }
                      },
                      lead: {
                        include: {
                          contacts: true
                        }
                      },
                      items: true
                    }
                  });

                if (!quote) {
                  throw new Error(
                    "La cotizacion asociada no existe."
                  );
                }

                if (
                  quote.projects.length >
                  0
                ) {
                  throw new Error(
                    `La cotizacion ya esta asociada al proyecto ${quote.projects[0].code}.`
                  );
                }

                if (
                  quote.status !==
                  "ACCEPTED"
                ) {
                  throw new Error(
                    "Solo puedes crear un proyecto desde una cotizacion Aceptada."
                  );
                }

                const metadata =
                  asJsonRecord(
                    quote.pdfMetadata
                  );
                const snapshot =
                  readCascadeSnapshot(
                    metadata
                  );

                inherited = {
                  client:
                    snapshot?.client ??
                    quote.lead
                      .companyName,
                  city:
                    snapshot?.city ??
                    quote.lead.city,
                  solutionType:
                    String(
                      metadata.solutionType ??
                        quote.items[0]
                          ?.solutionType ??
                        snapshot
                          ?.projectType ??
                        quote.lead
                          .projectType
                    ),
                  mainItems:
                    quote.items.map(
                      (item) =>
                        item.productName
                    )
                };

                leadId =
                  quote.leadId;
              } else if (
                input.leadCode
              ) {
                const lead =
                  await tx.lead.findUnique({
                    where: {
                      code:
                        input.leadCode
                    },
                    select: {
                      id: true
                    }
                  });

                if (!lead) {
                  throw new Error(
                    `No existe el prospecto ${input.leadCode}.`
                  );
                }

                leadId = lead.id;
              }

              const code =
                await nextProjectCode(
                  tx
                );
              const now =
                new Date();
              const status =
                mapProjectStatusToDb(
                  input.status
                );
              const progress =
                recommendedProgress(
                  input.status,
                  input.progress
                );

              const timeline =
                appendTimelineEvent(
                  [],
                  {
                    id: crypto.randomUUID(),
                    date: now
                      .toISOString()
                      .slice(0, 10),
                    title:
                      "Proyecto creado",
                    note:
                      quoteId
                        ? "Proyecto creado manualmente y asociado a una cotizacion."
                        : "Proyecto creado manualmente desde el modulo operativo."
                  }
                );

              const project =
                await tx.project.create({
                  data: {
                    code,
                    ...(leadId
                      ? {
                          lead: {
                            connect: {
                              id: leadId
                            }
                          }
                        }
                      : {}),
                    ...(quoteId
                      ? {
                          quote: {
                            connect: {
                              id: quoteId
                            }
                          }
                        }
                      : {}),
                    clientName:
                      inherited?.client ??
                      input.client,
                    name: input.name,
                    solutionType:
                      inherited?.solutionType ??
                      input.solutionType,
                    city:
                      inherited?.city ??
                      input.city,
                    status,
                    responsible:
                      input.responsible,
                    estimatedInstallation:
                      new Date(
                        `${input.estimatedInstallation}T12:00:00`
                      ),
                    progress,
                    risk:
                      mapProjectRiskToDb(
                        input.risk
                      ),
                    evidenceCount:
                      input.evidenceCount,
                    nextAction:
                      input.nextAction,
                    mainItems:
                      (inherited?.mainItems ??
                        input.mainItems) as Prisma.InputJsonValue,
                    timeline:
                      timeline as Prisma.InputJsonValue
                  },
                  include: {
                    lead: {
                      include: {
                        contacts: true
                      }
                    },
                    quote: true
                  }
                });

              await tx.activityLog.create({
                data: {
                  type:
                    "STATUS_CHANGED",
                  message:
                    `Proyecto ${code} creado manualmente`,
                  userId:
                    session?.id,
                  leadId:
                    leadId ?? null,
                  quoteId:
                    quoteId ?? null,
                  projectId:
                    project.id,
                  metadata: {
                    entity:
                      "project",
                    action:
                      "created",
                    status:
                      input.status,
                    progress,
                    cascade:
                      quoteId
                        ? "QUOTE_TO_PROJECT"
                        : leadId
                          ? "PROSPECT_TO_PROJECT"
                          : "MANUAL"
                  }
                }
              });

              return project;
            }
          );

        return NextResponse.json(
          serializeProject(created),
          { status: 201 }
        );
      } catch (error) {
        if (
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error(
      "No se pudo generar un codigo unico de proyecto."
    );
  } catch (error) {
    console.error(
      "Create project failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el proyecto."
      },
      { status: 400 }
    );
  }
}
