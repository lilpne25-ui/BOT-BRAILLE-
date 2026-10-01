export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectBaileys } from "@/modules/whatsapp/baileys-client";

export async function POST() {
  try {
    const status = await connectBaileys();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Baileys connect error", error);
    return NextResponse.json({ error: "No fue posible iniciar la conexion Baileys." }, { status: 500 });
  }
}
