export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { resolvePermissions } from "@/lib/auth/permissions";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const email = input.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !verifyPassword(input.password, user.passwordHash)
    ) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const permissions = resolvePermissions(user.role, user.permissions);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    setSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions
      }
    });
  } catch (error) {
    console.error("Login failed", error);

    return NextResponse.json(
      { error: "No fue posible iniciar sesion." },
      { status: 400 }
    );
  }
}
