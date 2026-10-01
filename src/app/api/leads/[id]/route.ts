export const dynamic =
  "force-dynamic";

import {
  Prisma
} from "@prisma/client";
import {
  NextResponse
} from "next/server";
import {
  z
} from "zod";
import {
  prisma
} from "@/lib/prisma";
import {
  getActiveAdmin
} from "@/lib/auth/active-admin";
import {
  updateLeadSchema
} from "@/modules/crm/contracts";
import {
  mapLeadSourceToDb,
  mapLeadStatusToDb
} from "@/modules/db/mappers";
import {
  isValidProspectDeleteConfirmation
} from "@/modules/leads/cascade-delete";
import {
  collectLeadCascade
} from "@/modules/leads/cascade-delete-server";

type RouteContext = {
  params: {
    id: string;
  };
};

const deleteLeadSchema =
  z.object({
    confirmation:
      z.string().trim()
  });

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const body =
    await request.json();
  const input =
    updateLeadSchema.parse(
      body
    );

  const lead =
    await prisma.lead.findUnique({
      where: {
        code:
          context.params.id
      },
      include: {
        contacts: true,
        owner: true
      }
    });

  if (!lead) {
    return NextResponse.json(
      {
        error:
          "Prospecto no encontrado."
      },
      {
        status: 404
      }
    );
  }

  if (input.ownerId) {
    const owner =
      await prisma.user.findFirst({
        where: {
          id:
            input.ownerId,
          role: {
            in: [
              "ADMIN",
              "SALES"
            ]
          }
        }
      });

    if (!owner) {
      return NextResponse.json(
        {
          error:
            "El responsable seleccionado no es valido."
        },
        {
          status: 400
        }
      );
    }
  }

  const leadData:
    Prisma.LeadUpdateInput =
      {};

  if (
    input.client !==
    undefined
  ) {
    leadData.companyName =
      input.client;
  }

  if (
    input.city !==
    undefined
  ) {
    leadData.city =
      input.city;
  }

  if (
    input.projectType !==
    undefined
  ) {
    leadData.projectType =
      input.projectType;
  }

  if (
    input.status !==
    undefined
  ) {
    leadData.status =
      mapLeadStatusToDb(
        input.status
      );
  }

  if (
    input.source !==
    undefined
  ) {
    leadData.source =
      mapLeadSourceToDb(
        input.source
      );
  }

  if (
    input.painPoint !==
    undefined
  ) {
    leadData.painPoint =
      input.painPoint;
  }

  if (
    input.estimatedValue !==
    undefined
  ) {
    leadData.estimatedValue =
      input.estimatedValue;
  }

  if (
    input.nextAction !==
    undefined
  ) {
    leadData.nextAction =
      input.nextAction;
  }

  if (
    input.nextActionDate !==
    undefined
  ) {
    leadData.nextActionDate =
      new Date(
        input.nextActionDate
      );
  }

  if (
    input.internalNotes !==
    undefined
  ) {
    leadData.internalNotes =
      input.internalNotes;
  }

  if (
    input.ownerId !==
    undefined
  ) {
    leadData.owner =
      input.ownerId
        ? {
            connect: {
              id:
                input.ownerId
            }
          }
        : {
            disconnect:
              true
          };
  }

  const primaryContact =
    lead.contacts.find(
      (contact) =>
        contact.isPrimary
    ) ??
    lead.contacts[0];

  const contactChanged =
    input.contact !==
      undefined ||
    input.email !==
      undefined ||
    input.phone !==
      undefined;

  const changedFields =
    Object.keys(
      input
    ).filter(
      (key) =>
        input[
          key as keyof typeof input
        ] !== undefined
    );

  await prisma.$transaction(
    async (tx) => {
      await tx.lead.update({
        where: {
          id:
            lead.id
        },
        data:
          leadData
      });

      if (
        contactChanged
      ) {
        if (
          primaryContact
        ) {
          await tx.contact.update({
            where: {
              id:
                primaryContact.id
            },
            data: {
              name:
                input.contact ??
                primaryContact.name,
              email:
                input.email ??
                primaryContact.email,
              phone:
                input.phone ??
                primaryContact.phone,
              isPrimary:
                true
            }
          });
        } else {
          await tx.contact.create({
            data: {
              leadId:
                lead.id,
              name:
                input.contact ??
                "Contacto pendiente",
              email:
                input.email ??
                "sin-correo@demo.mx",
              phone:
                input.phone ??
                "+52 55 0000 0000",
              isPrimary:
                true
            }
          });
        }
      }

      if (
        changedFields.length >
        0
      ) {
        const statusChanged =
          input.status !==
            undefined &&
          mapLeadStatusToDb(
            input.status
          ) !==
            lead.status;

        await tx.activityLog.create({
          data: {
            type:
              "STATUS_CHANGED",
            message:
              statusChanged
                ? `Estado de ${lead.code} actualizado a "${input.status}"`
                : `Expediente ${lead.code} actualizado manualmente`,
            leadId:
              lead.id,
            metadata: {
              activityType:
                "Nota interna",
              changedFields,
              previousOwner:
                lead.owner
                  ?.name ??
                null,
              newOwnerId:
                input.ownerId !==
                undefined
                  ? input.ownerId
                  : lead.ownerId
            }
          }
        });
      }
    }
  );

  return NextResponse.json({
    ok: true,
    id:
      lead.code
  });
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const admin =
      await getActiveAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Solo un administrador activo puede eliminar prospectos."
        },
        {
          status: 403
        }
      );
    }

    const input =
      deleteLeadSchema.parse(
        await request.json()
      );

    if (
      !isValidProspectDeleteConfirmation(
        context.params.id,
        input.confirmation
      )
    ) {
      return NextResponse.json(
        {
          error:
            `La confirmacion debe ser exactamente: ELIMINAR ${context.params.id}`
        },
        {
          status: 400
        }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const cascade =
            await collectLeadCascade(
              tx,
              context.params.id
            );

          if (!cascade) {
            return null;
          }

          const deletedLead = {
            code:
              cascade.lead.code,
            client:
              cascade.lead.companyName,
            city:
              cascade.lead.city
          };

          await tx.warranty.deleteMany({
            where: {
              id: {
                in:
                  cascade.warrantyIds
              }
            }
          });

          await tx.project.deleteMany({
            where: {
              id: {
                in:
                  cascade.projectIds
              }
            }
          });

          await tx.conversation.deleteMany({
            where: {
              id: {
                in:
                  cascade.conversationIds
              }
            }
          });

          await tx.quote.deleteMany({
            where: {
              id: {
                in:
                  cascade.quoteIds
              }
            }
          });

          await tx.contact.deleteMany({
            where: {
              leadId:
                cascade.lead.id
            }
          });

          await tx.lead.delete({
            where: {
              id:
                cascade.lead.id
            }
          });

          const audit =
            await tx.activityLog.create({
              data: {
                type:
                  "STATUS_CHANGED",
                message:
                  `Administrador ${admin.name} elimino definitivamente el prospecto ${deletedLead.code} (${deletedLead.client}) en cascada.`,
                userId:
                  admin.id,
                metadata: {
                  action:
                    "lead_cascade_deleted",
                  deletedLead,
                  deletedBy: {
                    id:
                      admin.id,
                    name:
                      admin.name,
                    email:
                      admin.email
                  },
                  impact:
                    cascade.impact,
                  auditPolicy:
                    "Los eventos historicos existentes se conservaron con referencias liberadas."
                }
              }
            });

          return {
            code:
              deletedLead.code,
            client:
              deletedLead.client,
            impact:
              cascade.impact,
            auditLogId:
              audit.id
          };
        }
      );

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Prospecto no encontrado."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      ...result
    });
  } catch (error) {
    console.error(
      "Lead cascade delete failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el prospecto."
      },
      {
        status: 400
      }
    );
  }
}
