export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBaileysStatus } from "@/modules/whatsapp/baileys-client";

export async function GET() {
  const status = getBaileysStatus();
  if (!status.qrDataUrl) {
    return NextResponse.json({ error: "QR no disponible" }, { status: 404 });
  }
  return NextResponse.json({
    qrDataUrl: status.qrDataUrl,
    status: status.status
  });
}
