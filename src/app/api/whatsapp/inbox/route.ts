export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function mapOperationalStatus(status: string) {
  if (status === "CAPTURING_DATA") return "Capturando datos";
  if (status === "REQUIRES_SALES") return "Requiere vendedor";
  if (status === "PRELIM_QUOTE_CREATED") return "Cotizacion preliminar creada";
  if (status === "SEND_ERROR") return "Error de envio";
  if (status === "ATTENDED_BY_SALES") return "Atendido por vendedor";
  return "Capturando datos";
}

export async function GET() {
  const sessions = await prisma.conversationSession.findMany({
    include: {
      conversation: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  const payload = sessions.map((session) => ({
    id: session.id,
    phone: session.conversation.customerPhone ?? "Sin telefono",
    name: session.conversation.customerName ?? "Contacto WhatsApp",
    status: mapOperationalStatus(session.operationalStatus),
    updatedAt: session.updatedAt.toISOString(),
    lastMessage: session.messages[0]?.text ?? "Sin mensajes",
    lastError: session.lastError ?? null,
    folio: session.folio ?? null
  }));

  return NextResponse.json(payload);
}
