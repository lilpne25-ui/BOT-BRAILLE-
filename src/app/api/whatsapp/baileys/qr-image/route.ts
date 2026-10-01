export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBaileysStatus } from "@/modules/whatsapp/baileys-client";

export async function GET() {
  const status = getBaileysStatus();
  if (!status.qr) {
    return NextResponse.json({ error: "QR no disponible" }, { status: 404 });
  }

  const png = await QRCode.toBuffer(status.qr, {
    type: "png",
    width: 420,
    margin: 1
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
