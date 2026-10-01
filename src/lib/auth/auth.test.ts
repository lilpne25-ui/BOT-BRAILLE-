import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionToken, verifySessionToken } from "@/lib/auth/token";
import {
  canAccessApi,
  canAccessUi,
  resolvePermissions,
  roleDefaultPermissions
} from "@/lib/auth/permissions";

describe("auth password", () => {
  it("genera y valida scrypt", () => {
    const hash = hashPassword("ClaveSegura2026!");
    expect(verifyPassword("ClaveSegura2026!", hash)).toBe(true);
    expect(verifyPassword("incorrecta", hash)).toBe(false);
  });
});

describe("auth session", () => {
  const secret = "0123456789abcdef0123456789abcdef0123456789abcdef";

  it("firma permisos dentro de la sesion", () => {
    const token = signSessionToken(
      {
        id: "U1",
        email: "admin@bidesign.local",
        name: "Administrador",
        role: "ADMIN",
        permissions: ["dashboard.view", "users.view", "users.manage"]
      },
      secret,
      1000
    );

    const session = verifySessionToken(token, secret, 2000);

    expect(session?.role).toBe("ADMIN");
    expect(session?.permissions).toContain("users.manage");
  });

  it("rechaza token alterado", () => {
    const token = signSessionToken(
      {
        id: "U1",
        email: "ventas@test.mx",
        name: "Ventas",
        role: "SALES",
        permissions: roleDefaultPermissions.SALES
      },
      secret
    );

    expect(verifySessionToken(`${token}x`, secret)).toBeNull();
  });
});

describe("granular permissions", () => {
  it("usa la plantilla del rol si no hay permisos guardados", () => {
    expect(resolvePermissions("SALES", null)).toEqual(
      roleDefaultPermissions.SALES
    );
  });

  it("permite quitar cotizador aunque el rol sea ventas", () => {
    const permissions = ["dashboard.view", "leads.view"] as const;

    expect(canAccessUi([...permissions], "/prospectos")).toBe(true);
    expect(canAccessUi([...permissions], "/cotizador")).toBe(false);
  });

  it("separa ver catalogo de editar catalogo", () => {
    const permissions = ["catalog.view"] as const;

    expect(canAccessApi([...permissions], "/api/catalog", "GET")).toBe(true);
    expect(canAccessApi([...permissions], "/api/catalog", "POST")).toBe(false);
  });

  it("separa administrar de eliminar usuarios", () => {
    const permissions = ["users.view", "users.manage"] as const;

    expect(canAccessApi([...permissions], "/api/admin/users/U1", "PATCH")).toBe(true);
    expect(canAccessApi([...permissions], "/api/admin/users/U1", "DELETE")).toBe(false);
  });
});
