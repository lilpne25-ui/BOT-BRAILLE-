export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
