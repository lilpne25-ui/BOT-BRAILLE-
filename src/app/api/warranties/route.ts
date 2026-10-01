export const dynamic = "force-dynamic";

import {
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createWarrantyInputSchema
} from "@/modules/warranties/contracts";
import {
  mapWarrantyStatusFromDb
} from "@/modules/db/mappers";
import {
  appendWarrantyEvent,
  formatWarrantyCode,
  mapWarrantyStatusToDb,
  normalizeWarrantyTimeline,
  parseWarrantySequence
} from "@/modules/warranties/operational";
import {
  asJsonRecord,
  readCascadeSnapshot
} from "@/modules/cascade/operational";

function serializeWarranty(
  warranty: Prisma.WarrantyGetPayload<{
    include: {
      project: {
        include: {
          quote: true;
        };
      };
      lead: {
        include: {
          contacts: true;
        };
      };
    };
  }>
) {
  const quoteMetadata =
    asJsonRecord(
      warranty.project?.quote
        ?.pdfMetadata
    );
  const snapshot =
    readCascadeSnapshot(
      quoteMetadata
    );
  const primaryContact =
    warranty.lead?.contacts.find(
      (contact) =>
        contact.isPrimary
    ) ??
    warranty.lead?.contacts[0];

  return {
    id: warranty.code,
    projectId:
      warranty.projectId ??
      undefined,
    projectCode:
      warranty.project?.code ??
      undefined,
    prospectId:
      warranty.leadId ??
      undefined,
    prospectCode:
      warranty.lead?.code ??
      undefined,
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
      warranty.projectId
        ? "Proyecto"
        : warranty.leadId
          ? "Prospecto"
          : "Manual",
    client:
      warranty.clientName,
    project:
      warranty.projectName,
    city:
      warranty.city,
    solutionInstalled:
      warranty.solutionInstalled,
    installDate:
      warranty.installDate
        .toISOString()
        .slice(0, 10),
    warrantyUntil:
      warranty.warrantyUntil
        .toISOString()
        .slice(0, 10),
    nextMaintenance:
      warranty.nextMaintenance
        .toISOString()
        .slice(0, 10),
    warrantyType:
      warranty.warrantyType,
    coverage:
      warranty.coverage,
    nextAction:
      warranty.nextAction,
    status:
      mapWarrantyStatusFromDb(
        warranty.status
      ),
    evidence:
      warranty.evidence,
    evidenceCount:
      warranty.evidenceCount,
    responsible:
      warranty.responsible,
    timeline:
      normalizeWarrantyTimeline(
        warranty.timeline
      ),
    observations:
      warranty.observations,
    createdAt:
      warranty.createdAt.toISOString(),
    updatedAt:
      warranty.updatedAt.toISOString()
  };
}

async function nextWarrantyCode(
  tx: Prisma.TransactionClient
) {
  const year =
    new Date().getFullYear();
  const prefix =
    `GAR-${year}-`;

  const rows =
    await tx.warranty.findMany({
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

  const highest = rows.reduce(
    (current, row) => {
      const sequence =
        parseWarrantySequence(
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

  return formatWarrantyCode(
    year,
    highest + 1
  );
}

export async function GET() {
  const warranties =
    await prisma.warranty.findMany({
      include: {
        project: {
          include: {
            quote: true
          }
        },
        lead: {
          include: {
            contacts: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

  return NextResponse.json(
    warranties.map(
      serializeWarranty
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const input =
      createWarrantyInputSchema.parse(
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
              let projectId:
                | string
                | undefined;
              let leadId:
                | string
                | undefined;
              let inherited:
                | {
                    client: string;
                    project: string;
                    city: string;
                    solutionInstalled: string;
                    evidenceCount: number;
                  }
                | undefined;

              if (
                input.projectCode
              ) {
                const project =
                  await tx.project.findUnique({
                    where: {
                      code:
                        input.projectCode
                    },
                    include: {
                      warranties: {
                        select: {
                          code: true
                        }
                      },
                      quote: true,
                      lead: {
                        include: {
                          contacts: true
                        }
                      }
                    }
                  });

                if (!project) {
                  throw new Error(
                    `No existe el proyecto ${input.projectCode}.`
                  );
                }

                if (
                  project.status !==
                    "INSTALLED" &&
                  project.status !==
                    "CLOSED"
                ) {
                  throw new Error(
                    "Solo puedes abrir una garantia desde un proyecto instalado o cerrado."
                  );
                }

                if (
                  project.warranties
                    .length > 0
                ) {
                  throw new Error(
                    `El proyecto ya tiene la garantia ${project.warranties[0].code}.`
                  );
                }

                projectId =
                  project.id;
                leadId =
                  project.leadId ??
                  undefined;
                inherited = {
                  client:
                    project.clientName,
                  project:
                    project.name,
                  city:
                    project.city,
                  solutionInstalled:
                    project.solutionType,
                  evidenceCount:
                    project.evidenceCount
                };
              }

              const code =
                await nextWarrantyCode(
                  tx
                );

              const now =
                new Date();

              const timeline =
                appendWarrantyEvent(
                  [],
                  {
                    id:
                      crypto.randomUUID(),
                    date:
                      now
                        .toISOString()
                        .slice(0, 10),
                    title:
                      "Garantia creada",
                    note:
                      input.projectCode
                        ? `Garantia creada desde el proyecto ${input.projectCode}.`
                        : "Garantia creada manualmente desde postventa."
                  }
                );

              const warranty =
                await tx.warranty.create({
                  data: {
                    code,
                    ...(projectId
                      ? {
                          project: {
                            connect: {
                              id:
                                projectId
                            }
                          }
                        }
                      : {}),
                    ...(leadId
                      ? {
                          lead: {
                            connect: {
                              id:
                                leadId
                            }
                          }
                        }
                      : {}),
                    clientName:
                      inherited?.client ??
                      input.client,
                    projectName:
                      inherited?.project ??
                      input.project,
                    city:
                      inherited?.city ??
                      input.city,
                    solutionInstalled:
                      inherited?.solutionInstalled ??
                      input.solutionInstalled,
                    installDate:
                      new Date(
                        `${input.installDate}T12:00:00`
                      ),
                    warrantyUntil:
                      new Date(
                        `${input.warrantyUntil}T12:00:00`
                      ),
                    nextMaintenance:
                      new Date(
                        `${input.nextMaintenance}T12:00:00`
                      ),
                    warrantyType:
                      input.warrantyType,
                    coverage:
                      input.coverage,
                    nextAction:
                      input.nextAction,
                    status:
                      mapWarrantyStatusToDb(
                        input.status
                      ),
                    evidence:
                      input.evidence,
                    evidenceCount:
                      inherited?.evidenceCount ??
                      input.evidenceCount,
                    responsible:
                      input.responsible,
                    timeline:
                      timeline as Prisma.InputJsonValue,
                    observations:
                      input.observations
                  },
                  include: {
                    project: {
                      include: {
                        quote: true
                      }
                    },
                    lead: {
                      include: {
                        contacts: true
                      }
                    }
                  }
                });

              await tx.activityLog.create({
                data: {
                  type:
                    "STATUS_CHANGED",
                  message:
                    `Garantia ${code} creada`,
                  userId:
                    session?.id,
                  leadId:
                    leadId ?? null,
                  projectId:
                    projectId ?? null,
                  warrantyId:
                    warranty.id,
                  metadata: {
                    entity:
                      "warranty",
                    action:
                      "created",
                    status:
                      input.status,
                    warrantyType:
                      input.warrantyType,
                    cascade:
                      projectId
                        ? "PROJECT_TO_WARRANTY"
                        : leadId
                          ? "PROSPECT_TO_WARRANTY"
                          : "MANUAL"
                  }
                }
              });

              return warranty;
            }
          );

        return NextResponse.json(
          serializeWarranty(
            created
          ),
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
      "No se pudo generar un folio unico de garantia."
    );
  } catch (error) {
    console.error(
      "Create warranty failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la garantia."
      },
      { status: 400 }
    );
  }
}
