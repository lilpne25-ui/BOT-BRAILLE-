export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { disconnectBaileys } from "@/modules/whatsapp/baileys-client";

export async function POST() {
  return NextResponse.json(disconnectBaileys());
}
