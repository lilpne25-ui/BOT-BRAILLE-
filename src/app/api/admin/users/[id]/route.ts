export const dynamic = "force-dynamic";

import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentSession } from "@/lib/auth/session";
import {
  hasPermission,
  roleDefaultPermissions
} from "@/lib/auth/permissions";
import { permissionKeys, PermissionKey } from "@/lib/auth/types";

type RouteContext = {
  params: {
    id: string;
  };
};

const permissionSchema = z.enum(permissionKeys);

const updateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    role: z.enum(["ADMIN", "SALES", "OPERATIONS"]).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(10).optional(),
    permissions: z.array(permissionSchema).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No hay cambios para guardar."
  });

function requirePermission(permission: PermissionKey) {
  const session = getCurrentSession();

  if (!session || !hasPermission(session.permissions, permission)) {
    return null;
  }

  return session;
}

async function ensureAdminSurvives(
  target: {
    id: string;
    role: UserRole;
    isActive: boolean;
  },
  nextRole?: UserRole,
  nextActive?: boolean
) {
  const roleAfter = nextRole ?? target.role;
  const activeAfter = nextActive ?? target.isActive;

  const removesActiveAdmin =
    target.role === "ADMIN" &&
    target.isActive &&
    (roleAfter !== "ADMIN" || !activeAfter);

  if (!removesActiveAdmin) return true;

  const activeAdmins = await prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true
    }
  });

  return activeAdmins > 1;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = requirePermission("users.manage");

  if (!session) {
    return NextResponse.json(
      { error: "No tienes permiso para administrar usuarios." },
      { status: 403 }
    );
  }

  try {
    const input = updateSchema.parse(await request.json());

    const target = await prisma.user.findUnique({
      where: { id: context.params.id }
    });

    if (!target) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (target.id === session.id && input.isActive === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta." },
        { status: 400 }
      );
    }

    if (target.id === session.id && input.role && input.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No puedes quitarte tu propio rol de administrador." },
        { status: 400 }
      );
    }

    if (
      target.id === session.id &&
      input.permissions &&
      (
        !input.permissions.includes("users.view") ||
        !input.permissions.includes("users.manage")
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Tu propia cuenta debe conservar Ver usuarios y Administrar usuarios."
        },
        { status: 400 }
      );
    }

    const adminSurvives = await ensureAdminSurvives(
      target,
      input.role,
      input.isActive
    );

    if (!adminSurvives) {
      return NextResponse.json(
        { error: "Debe existir al menos un administrador activo." },
        { status: 400 }
      );
    }

    const data: {
      name?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
      permissions?: Prisma.InputJsonValue;
    } = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.password) data.passwordHash = hashPassword(input.password);

    if (input.permissions !== undefined) {
      data.permissions = input.permissions as Prisma.InputJsonValue;
    } else if (input.role !== undefined) {
      data.permissions =
        roleDefaultPermissions[input.role] as Prisma.InputJsonValue;
    }

    await prisma.user.update({
      where: { id: target.id },
      data
    });

    return NextResponse.json({
      ok: true,
      reloginRecommended:
        input.role !== undefined || input.permissions !== undefined
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el usuario."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = requirePermission("users.delete");

  if (!session) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar usuarios." },
      { status: 403 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: context.params.id },
    include: {
      _count: {
        select: {
          leads: true,
          activities: true
        }
      }
    }
  });

  if (!target) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (target.id === session.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta." },
      { status: 400 }
    );
  }

  if (target.role === "ADMIN" && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true }
    });

    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "No puedes eliminar el último administrador activo." },
        { status: 400 }
      );
    }
  }

  const impact = {
    assignedLeads: target._count.leads,
    auditEntries: target._count.activities
  };

  await prisma.user.delete({
    where: { id: target.id }
  });

  return NextResponse.json({
    ok: true,
    deletedUser: {
      name: target.name,
      email: target.email
    },
    impact
  });
}
