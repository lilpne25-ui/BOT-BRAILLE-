export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startConversationSchema } from "@/modules/api/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = startConversationSchema.parse(body ?? {});

  const session = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        source: "WHATSAPP",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        status: "IDLE"
      }
    });

    const created = await tx.conversationSession.create({
      data: {
        conversationId: conversation.id,
        status: "IDLE",
        operationalStatus: "CAPTURING_DATA",
        currentStepIndex: 0,
        intentDetected: false
      }
    });

    return {
      conversationId: conversation.id,
      sessionId: created.id
    };
  });

  return NextResponse.json(session, { status: 201 });
}
