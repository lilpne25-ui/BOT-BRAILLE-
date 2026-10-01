export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  updateProjectInputSchema
} from "@/modules/projects/contracts";
import {
  mapProjectRiskFromDb,
  mapProjectStatusFromDb
} from "@/modules/db/mappers";
import {
  appendTimelineEvent,
  mapProjectRiskToDb,
  mapProjectStatusToDb,
  normalizeTimeline,
  recommendedProgress
} from "@/modules/projects/operational";
import {
  daysFrom,
  formatWarrantyCode,
  parseWarrantySequence
} from "@/modules/warranties/operational";
import {
  asJsonRecord,
  readCascadeSnapshot
} from "@/modules/cascade/operational";

type RouteContext = {
  params: {
    id: string;
  };
};

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

  const highest =
    rows.reduce(
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

function stringArray(
  value: Prisma.JsonValue
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const input =
      updateProjectInputSchema.parse(
        await request.json()
      );
    const session =
      getCurrentSession();

    const existing =
      await prisma.project.findUnique({
        where: {
          code:
            context.params.id
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

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Proyecto no encontrado."
        },
        { status: 404 }
      );
    }

    const linkedToQuote =
      Boolean(
        existing.quoteId
      );
    const quoteMetadata =
      asJsonRecord(
        existing.quote
          ?.pdfMetadata
      );
    const cascadeSnapshot =
      readCascadeSnapshot(
        quoteMetadata
      );
    const primaryContact =
      existing.lead?.contacts.find(
        (contact) =>
          contact.isPrimary
      ) ??
      existing.lead?.contacts[0];

    const oldStatus =
      mapProjectStatusFromDb(
        existing.status
      );
    const newStatus =
      input.status ??
      oldStatus;
    const progress =
      input.progress !==
      undefined
        ? input.progress
        : input.status
          ? recommendedProgress(
              newStatus,
              existing.progress
            )
          : existing.progress;
    const statusChanged =
      input.status !== undefined &&
      input.status !== oldStatus;

    const changedFields =
      Object.keys(input).filter(
        (field) =>
          !(
            linkedToQuote &&
            [
              "solutionType",
              "city",
              "mainItems"
            ].includes(
              field
            )
          )
      );

    const event =
      appendTimelineEvent(
        existing.timeline,
        {
          id: crypto.randomUUID(),
          date: new Date()
            .toISOString()
            .slice(0, 10),
          title: statusChanged
            ? `Estado: ${newStatus}`
            : "Proyecto actualizado",
          note: statusChanged
            ? `El proyecto cambio de ${oldStatus} a ${newStatus}.`
            : `Se actualizaron: ${changedFields.join(", ")}.`
        }
      );

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const project =
            await tx.project.update({
              where: {
                id: existing.id
              },
              data: {
                ...(input.name !==
                undefined
                  ? {
                      name:
                        input.name
                    }
                  : {}),
                ...(!linkedToQuote &&
                input.solutionType !==
                  undefined
                  ? {
                      solutionType:
                        input.solutionType
                    }
                  : {}),
                ...(!linkedToQuote &&
                input.city !==
                  undefined
                  ? {
                      city:
                        input.city
                    }
                  : {}),
                ...(input.status !==
                undefined
                  ? {
                      status:
                        mapProjectStatusToDb(
                          input.status
                        )
                    }
                  : {}),
                ...(input.responsible !==
                undefined
                  ? {
                      responsible:
                        input.responsible
                    }
                  : {}),
                ...(input.estimatedInstallation !==
                undefined
                  ? {
                      estimatedInstallation:
                        new Date(
                          `${input.estimatedInstallation}T12:00:00`
                        )
                    }
                  : {}),
                progress,
                ...(input.risk !==
                undefined
                  ? {
                      risk:
                        mapProjectRiskToDb(
                          input.risk
                        )
                    }
                  : {}),
                ...(input.evidenceCount !==
                undefined
                  ? {
                      evidenceCount:
                        input.evidenceCount
                    }
                  : {}),
                ...(input.nextAction !==
                undefined
                  ? {
                      nextAction:
                        input.nextAction
                    }
                  : {}),
                ...(!linkedToQuote &&
                input.mainItems !==
                  undefined
                  ? {
                      mainItems:
                        input.mainItems as Prisma.InputJsonValue
                    }
                  : {}),
                timeline:
                  event as Prisma.InputJsonValue
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
                statusChanged
                  ? `Proyecto ${existing.code} cambio de ${oldStatus} a ${newStatus}`
                  : `Proyecto ${existing.code} actualizado`,
              userId:
                session?.id,
              leadId:
                existing.leadId,
              quoteId:
                existing.quoteId,
              projectId:
                existing.id,
              metadata: {
                entity:
                  "project",
                action:
                  statusChanged
                    ? "status_changed"
                    : "updated",
                changedFields,
                oldStatus,
                newStatus,
                progress,
                risk:
                  input.risk ??
                  mapProjectRiskFromDb(
                    existing.risk
                  )
              }
            }
          });

          if (
            statusChanged &&
            (
              newStatus === "Instalado" ||
              newStatus === "Cerrado"
            )
          ) {
            const previousWarranty =
              await tx.warranty.findFirst({
                where: {
                  projectId:
                    existing.id
                },
                select: {
                  id: true,
                  code: true
                }
              });

            if (!previousWarranty) {
              const code =
                await nextWarrantyCode(
                  tx
                );
              const installDate =
                new Date();
              const warrantyUntil =
                daysFrom(
                  installDate,
                  365
                );
              const nextMaintenance =
                daysFrom(
                  installDate,
                  180
                );

              const warranty =
                await tx.warranty.create({
                  data: {
                    code,
                    projectId:
                      existing.id,
                    leadId:
                      existing.leadId,
                    clientName:
                      project.clientName,
                    projectName:
                      project.name,
                    city:
                      project.city,
                    solutionInstalled:
                      project.solutionType,
                    installDate,
                    warrantyUntil,
                    nextMaintenance,
                    status:
                      "ACTIVE",
                    evidence:
                      "Evidencia pendiente de registro.",
                    evidenceCount:
                      project.evidenceCount,
                    responsible:
                      project.responsible,
                    warrantyType:
                      "Estandar",
                    coverage:
                      "Cobertura general de la instalacion y materiales conforme a las condiciones comerciales acordadas.",
                    nextAction:
                      "Programar revision postventa y mantenimiento preventivo.",
                    timeline:
                      [
                        {
                          id:
                            crypto.randomUUID(),
                          date:
                            installDate
                              .toISOString()
                              .slice(
                                0,
                                10
                              ),
                          title:
                            "Garantia activada",
                          note:
                            `Garantia creada automaticamente al marcar ${existing.code} como ${newStatus}.`
                        }
                      ] as Prisma.InputJsonValue,
                    observations:
                      "Garantia creada automaticamente desde el cierre operativo del proyecto."
                  }
                });

              await tx.activityLog.create({
                data: {
                  type:
                    "STATUS_CHANGED",
                  message:
                    `Garantia ${warranty.code} creada desde proyecto ${existing.code}`,
                  userId:
                    session?.id,
                  leadId:
                    existing.leadId,
                  quoteId:
                    existing.quoteId,
                  projectId:
                    existing.id,
                  warrantyId:
                    warranty.id,
                  metadata: {
                    entity:
                      "warranty",
                    action:
                      "created_from_installed_project",
                    projectCode:
                      existing.code,
                    projectStatus:
                      newStatus,
                    cascade:
                      "PROJECT_TO_WARRANTY"
                  }
                }
              });
            }
          }

          return project;
        }
      );

    return NextResponse.json({
      id: updated.code,
      prospectId:
        updated.leadId ??
        undefined,
      prospectCode:
        updated.lead?.code ??
        undefined,
      quoteId:
        updated.quoteId ??
        undefined,
      quoteFolio:
        updated.quote?.folio ??
        undefined,
      contact:
        cascadeSnapshot
          ?.contactName ??
        primaryContact?.name ??
        undefined,
      email:
        cascadeSnapshot
          ?.contactEmail ??
        primaryContact?.email ??
        undefined,
      phone:
        cascadeSnapshot
          ?.contactPhone ??
        primaryContact?.phone ??
        undefined,
      cascadeSource:
        updated.quoteId
          ? "Cotizacion"
          : updated.leadId
            ? "Prospecto"
            : "Manual",
      client:
        updated.clientName,
      name: updated.name,
      solutionType:
        updated.solutionType,
      city: updated.city,
      status:
        mapProjectStatusFromDb(
          updated.status
        ),
      responsible:
        updated.responsible,
      estimatedInstallation:
        updated.estimatedInstallation
          .toISOString()
          .slice(0, 10),
      progress:
        updated.progress,
      risk:
        mapProjectRiskFromDb(
          updated.risk
        ),
      evidenceCount:
        updated.evidenceCount,
      nextAction:
        updated.nextAction,
      mainItems:
        stringArray(
          updated.mainItems
        ),
      timeline:
        normalizeTimeline(
          updated.timeline
        ),
      createdAt:
        updated.createdAt.toISOString(),
      updatedAt:
        updated.updatedAt.toISOString()
    });
  } catch (error) {
    console.error(
      "Update project failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el proyecto."
      },
      { status: 400 }
    );
  }
}
