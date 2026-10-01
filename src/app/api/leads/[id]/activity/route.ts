export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLeadActivitySchema } from "@/modules/crm/contracts";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  const body = await request.json();
  const input = addLeadActivitySchema.parse(body);

  const lead = await prisma.lead.findUnique({
    where: {
      code: context.params.id
    }
  });

  if (!lead) {
    return NextResponse.json(
      { error: "Prospecto no encontrado." },
      { status: 404 }
    );
  }

  const activity = await prisma.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      message: input.note,
      leadId: lead.id,
      metadata: {
        activityType: input.type,
        source: "manual"
      }
    }
  });

  return NextResponse.json(
    {
      id: activity.id,
      date: activity.createdAt.toISOString().slice(0, 10),
      type: input.type,
      note: activity.message
    },
    { status: 201 }
  );
}
