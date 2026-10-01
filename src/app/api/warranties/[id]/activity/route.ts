export const dynamic = "force-dynamic";

import {
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  addWarrantyActivitySchema
} from "@/modules/warranties/contracts";
import {
  appendWarrantyEvent
} from "@/modules/warranties/operational";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const input =
      addWarrantyActivitySchema.parse(
        await request.json()
      );
    const session =
      getCurrentSession();

    const warranty =
      await prisma.warranty.findUnique({
        where: {
          code:
            context.params.id
        }
      });

    if (!warranty) {
      return NextResponse.json(
        {
          error:
            "Garantia no encontrada."
        },
        { status: 404 }
      );
    }

    const event = {
      id:
        crypto.randomUUID(),
      date:
        new Date()
          .toISOString()
          .slice(0, 10),
      title:
        input.title,
      note:
        input.note
    };

    await prisma.$transaction(
      async (tx) => {
        await tx.warranty.update({
          where: {
            id:
              warranty.id
          },
          data: {
            timeline:
              appendWarrantyEvent(
                warranty.timeline,
                event
              ) as Prisma.InputJsonValue
          }
        });

        await tx.activityLog.create({
          data: {
            type:
              "STATUS_CHANGED",
            message:
              `Nota agregada a ${warranty.code}: ${input.title}`,
            userId:
              session?.id,
            leadId:
              warranty.leadId,
            projectId:
              warranty.projectId,
            warrantyId:
              warranty.id,
            metadata: {
              entity:
                "warranty",
              action:
                "activity_added",
              title:
                input.title
            }
          }
        });
      }
    );

    return NextResponse.json(
      event,
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo agregar la nota."
      },
      { status: 400 }
    );
  }
}
