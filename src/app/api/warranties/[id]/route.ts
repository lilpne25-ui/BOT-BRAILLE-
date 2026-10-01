export const dynamic = "force-dynamic";

import {
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  updateWarrantyInputSchema
} from "@/modules/warranties/contracts";
import {
  mapWarrantyStatusFromDb
} from "@/modules/db/mappers";
import {
  appendWarrantyEvent,
  mapWarrantyStatusToDb,
  normalizeWarrantyTimeline
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const input =
      updateWarrantyInputSchema.parse(
        await request.json()
      );
    const session =
      getCurrentSession();

    const existing =
      await prisma.warranty.findUnique({
        where: {
          code:
            context.params.id
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

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Garantia no encontrada."
        },
        { status: 404 }
      );
    }

    const linkedToProject =
      Boolean(
        existing.projectId
      );
    const quoteMetadata =
      asJsonRecord(
        existing.project?.quote
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
      mapWarrantyStatusFromDb(
        existing.status
      );
    const newStatus =
      input.status ??
      oldStatus;
    const statusChanged =
      input.status !==
        undefined &&
      input.status !==
        oldStatus;
    const changedFields =
      Object.keys(input).filter(
        (field) =>
          !(
            linkedToProject &&
            [
              "project",
              "city",
              "solutionInstalled"
            ].includes(
              field
            )
          )
      );

    const timeline =
      appendWarrantyEvent(
        existing.timeline,
        {
          id:
            crypto.randomUUID(),
          date:
            new Date()
              .toISOString()
              .slice(0, 10),
          title:
            statusChanged
              ? `Estado: ${newStatus}`
              : "Garantia actualizada",
          note:
            statusChanged
              ? `La garantia cambio de ${oldStatus} a ${newStatus}.`
              : `Se actualizaron: ${changedFields.join(", ")}.`
        }
      );

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const warranty =
            await tx.warranty.update({
              where: {
                id:
                  existing.id
              },
              data: {
                ...(!linkedToProject &&
                input.project !==
                  undefined
                  ? {
                      projectName:
                        input.project
                    }
                  : {}),
                ...(!linkedToProject &&
                input.city !==
                  undefined
                  ? {
                      city:
                        input.city
                    }
                  : {}),
                ...(!linkedToProject &&
                input.solutionInstalled !==
                  undefined
                  ? {
                      solutionInstalled:
                        input.solutionInstalled
                    }
                  : {}),
                ...(input.installDate !==
                undefined
                  ? {
                      installDate:
                        new Date(
                          `${input.installDate}T12:00:00`
                        )
                    }
                  : {}),
                ...(input.warrantyUntil !==
                undefined
                  ? {
                      warrantyUntil:
                        new Date(
                          `${input.warrantyUntil}T12:00:00`
                        )
                    }
                  : {}),
                ...(input.nextMaintenance !==
                undefined
                  ? {
                      nextMaintenance:
                        new Date(
                          `${input.nextMaintenance}T12:00:00`
                        )
                    }
                  : {}),
                ...(input.warrantyType !==
                undefined
                  ? {
                      warrantyType:
                        input.warrantyType
                    }
                  : {}),
                ...(input.coverage !==
                undefined
                  ? {
                      coverage:
                        input.coverage
                    }
                  : {}),
                ...(input.nextAction !==
                undefined
                  ? {
                      nextAction:
                        input.nextAction
                    }
                  : {}),
                ...(input.status !==
                undefined
                  ? {
                      status:
                        mapWarrantyStatusToDb(
                          input.status
                        )
                    }
                  : {}),
                ...(input.evidence !==
                undefined
                  ? {
                      evidence:
                        input.evidence
                    }
                  : {}),
                ...(input.evidenceCount !==
                undefined
                  ? {
                      evidenceCount:
                        input.evidenceCount
                    }
                  : {}),
                ...(input.responsible !==
                undefined
                  ? {
                      responsible:
                        input.responsible
                    }
                  : {}),
                ...(input.observations !==
                undefined
                  ? {
                      observations:
                        input.observations
                    }
                  : {}),
                timeline:
                  timeline as Prisma.InputJsonValue
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
                statusChanged
                  ? `Garantia ${existing.code} cambio de ${oldStatus} a ${newStatus}`
                  : `Garantia ${existing.code} actualizada`,
              userId:
                session?.id,
              leadId:
                existing.leadId,
              projectId:
                existing.projectId,
              warrantyId:
                existing.id,
              metadata: {
                entity:
                  "warranty",
                action:
                  statusChanged
                    ? "status_changed"
                    : "updated",
                changedFields,
                oldStatus,
                newStatus
              }
            }
          });

          return warranty;
        }
      );

    return NextResponse.json({
      id:
        updated.code,
      projectId:
        updated.projectId ??
        undefined,
      projectCode:
        updated.project?.code ??
        undefined,
      prospectId:
        updated.leadId ??
        undefined,
      prospectCode:
        updated.lead?.code ??
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
        updated.projectId
          ? "Proyecto"
          : updated.leadId
            ? "Prospecto"
            : "Manual",
      client:
        updated.clientName,
      project:
        updated.projectName,
      city:
        updated.city,
      solutionInstalled:
        updated.solutionInstalled,
      installDate:
        updated.installDate
          .toISOString()
          .slice(0, 10),
      warrantyUntil:
        updated.warrantyUntil
          .toISOString()
          .slice(0, 10),
      nextMaintenance:
        updated.nextMaintenance
          .toISOString()
          .slice(0, 10),
      warrantyType:
        updated.warrantyType,
      coverage:
        updated.coverage,
      nextAction:
        updated.nextAction,
      status:
        mapWarrantyStatusFromDb(
          updated.status
        ),
      evidence:
        updated.evidence,
      evidenceCount:
        updated.evidenceCount,
      responsible:
        updated.responsible,
      timeline:
        normalizeWarrantyTimeline(
          updated.timeline
        ),
      observations:
        updated.observations,
      createdAt:
        updated.createdAt
          .toISOString(),
      updatedAt:
        updated.updatedAt
          .toISOString()
    });
  } catch (error) {
    console.error(
      "Update warranty failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la garantia."
      },
      { status: 400 }
    );
  }
}
