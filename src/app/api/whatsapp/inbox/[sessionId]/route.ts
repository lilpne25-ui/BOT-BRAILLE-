export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: {
    sessionId: string;
  };
};

export async function PATCH(_request: Request, context: RouteContext) {
  const session = await prisma.conversationSession.findUnique({ where: { id: context.params.sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.operationalStatus !== "REQUIRES_SALES") {
    return NextResponse.json(
      { error: "Solo se puede marcar como atendida una sesion que requiere vendedor" },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.conversationSession.update({
      where: { id: session.id },
      data: { operationalStatus: "ATTENDED_BY_SALES" }
    }),
    prisma.activityLog.create({
      data: {
        type: "STATUS_CHANGED",
        message: "Vendedor marco la conversacion como atendida",
        conversationId: session.conversationId,
        conversationSessionId: session.id,
        metadata: { entity: "conversationSession", oldValue: "REQUIRES_SALES", newValue: "ATTENDED_BY_SALES" }
      }
    })
  ]);

  return NextResponse.json({ id: session.id, operationalStatus: "ATTENDED_BY_SALES" });
}
