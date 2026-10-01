export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBaileysStatus } from "@/modules/whatsapp/baileys-client";

export async function GET() {
  return NextResponse.json(getBaileysStatus());
}
