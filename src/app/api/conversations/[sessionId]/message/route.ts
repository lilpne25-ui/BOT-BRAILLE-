export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistConversationMessageSchema } from "@/modules/api/schemas";
import { mapConversationRoleToDb, mapConversationStatusToDb } from "@/modules/db/mappers";

type RouteContext = {
  params: {
    sessionId: string;
  };
};

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json();
  const input = persistConversationMessageSchema.parse(body);
  const sessionId = context.params.sessionId;

  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    include: { conversation: true }
  });

  if (!session) {
    return NextResponse.json({ error: "Conversation session not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const operationalStatus =
      input.session.status === "completed"
        ? "PRELIM_QUOTE_CREATED"
        : input.session.status === "idle"
          ? "REQUIRES_SALES"
          : "CAPTURING_DATA";

    await tx.conversationSession.update({
      where: { id: sessionId },
      data: {
        status: mapConversationStatusToDb(input.session.status),
        operationalStatus,
        currentStepIndex: input.session.currentStepIndex,
        capturedData: input.session.capturedData,
        intentDetected: input.session.intentDetected,
        folio: input.session.folio ?? null,
        estimatedAmount: input.session.estimatedAmount ?? null,
        completedAt: input.session.completedAt ? new Date(input.session.completedAt) : null
      }
    });

    await tx.conversation.update({
      where: { id: session.conversationId },
      data: {
        status: mapConversationStatusToDb(input.session.status)
      }
    });

    const messages = [input.userMessage, ...input.assistantMessages];
    await tx.conversationMessage.createMany({
      data: messages.map((message) => ({
        conversationId: session.conversationId,
        conversationSessionId: sessionId,
        role: mapConversationRoleToDb(message.role),
        text: message.text,
        stepId: message.stepId
      }))
    });
  });

  return NextResponse.json({ ok: true });
}
