export const dynamic = "force-dynamic";

import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentSession } from "@/lib/auth/session";
import {
  hasPermission,
  resolvePermissions,
  roleDefaultPermissions
} from "@/lib/auth/permissions";
import { permissionKeys } from "@/lib/auth/types";

const permissionSchema = z.enum(permissionKeys);

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "SALES", "OPERATIONS"]),
  password: z.string().min(10),
  permissions: z.array(permissionSchema).optional()
});

function can(permission: "users.view" | "users.manage") {
  const session = getCurrentSession();

  if (!session || !hasPermission(session.permissions, permission)) {
    return null;
  }

  return session;
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Prisma.JsonValue | null;
  isActive: boolean;
  passwordHash: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: {
    leads: number;
    activities: number;
  };
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    permissions: resolvePermissions(user.role, user.permissions),
    usesRoleDefaults: !Array.isArray(user.permissions),
    passwordConfigured: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    assignedLeads: user._count.leads,
    auditEntries: user._count.activities
  };
}

export async function GET() {
  if (!can("users.view")) {
    return NextResponse.json(
      { error: "No tienes permiso para consultar usuarios." },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      isActive: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: {
          leads: true,
          activities: true
        }
      }
    }
  });

  return NextResponse.json(users.map(serializeUser));
}

export async function POST(request: Request) {
  if (!can("users.manage")) {
    return NextResponse.json(
      { error: "No tienes permiso para crear usuarios." },
      { status: 403 }
    );
  }

  try {
    const input = createUserSchema.parse(await request.json());
    const effectivePermissions =
      input.permissions ?? roleDefaultPermissions[input.role];

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        role: input.role,
        passwordHash: hashPassword(input.password),
        permissions: effectivePermissions as Prisma.InputJsonValue,
        isActive: true
      }
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el usuario."
      },
      { status: 400 }
    );
  }
}
