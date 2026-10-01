export const appRoles = ["ADMIN", "SALES", "OPERATIONS"] as const;

export type AppRole = (typeof appRoles)[number];

export const permissionKeys = [
  "dashboard.view",
  "leads.view",
  "leads.create",
  "leads.edit",
  "quotes.view",
  "quotes.create",
  "quotes.edit",
  "quotes.pdf",
  "catalog.view",
  "catalog.edit",
  "projects.view",
  "projects.edit",
  "warranties.view",
  "warranties.edit",
  "whatsapp.view",
  "whatsapp.manage",
  "users.view",
  "users.manage",
  "users.delete"
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  permissions: PermissionKey[];
  issuedAt: number;
  expiresAt: number;
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoles.includes(value as AppRole);
}

export function isPermissionKey(value: unknown): value is PermissionKey {
  return (
    typeof value === "string" &&
    permissionKeys.includes(value as PermissionKey)
  );
}
