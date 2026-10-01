export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import {
  addProjectActivitySchema
} from "@/modules/projects/contracts";
import {
  appendTimelineEvent
} from "@/modules/projects/operational";

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
      addProjectActivitySchema.parse(
        await request.json()
      );
    const session =
      getCurrentSession();

    const project =
      await prisma.project.findUnique({
        where: {
          code:
            context.params.id
        }
      });

    if (!project) {
      return NextResponse.json(
        {
          error:
            "Proyecto no encontrado."
        },
        { status: 404 }
      );
    }

    const event = {
      id: crypto.randomUUID(),
      date: new Date()
        .toISOString()
        .slice(0, 10),
      title: input.title,
      note: input.note
    };

    await prisma.$transaction(
      async (tx) => {
        await tx.project.update({
          where: {
            id: project.id
          },
          data: {
            timeline:
              appendTimelineEvent(
                project.timeline,
                event
              ) as Prisma.InputJsonValue
          }
        });

        await tx.activityLog.create({
          data: {
            type:
              "STATUS_CHANGED",
            message:
              `Nota agregada a ${project.code}: ${input.title}`,
            userId:
              session?.id,
            leadId:
              project.leadId,
            quoteId:
              project.quoteId,
            projectId:
              project.id,
            metadata: {
              entity:
                "project",
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
