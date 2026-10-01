import {
  AppRole,
  PermissionKey,
  isAppRole,
  isPermissionKey,
  permissionKeys
} from "@/lib/auth/types";

export type PermissionDefinition = {
  key: PermissionKey;
  group: string;
  label: string;
  description: string;
};

export const permissionCatalog: PermissionDefinition[] = [
  {
    key: "dashboard.view",
    group: "General",
    label: "Ver dashboard",
    description: "Acceder al panel principal."
  },
  {
    key: "leads.view",
    group: "Prospectos",
    label: "Ver prospectos",
    description: "Consultar expedientes comerciales."
  },
  {
    key: "leads.create",
    group: "Prospectos",
    label: "Crear prospectos",
    description: "Registrar nuevos prospectos."
  },
  {
    key: "leads.edit",
    group: "Prospectos",
    label: "Editar prospectos",
    description: "Modificar expediente, responsable y seguimiento."
  },
  {
    key: "quotes.view",
    group: "Cotizaciones",
    label: "Ver cotizaciones",
    description: "Consultar cotizaciones e historial."
  },
  {
    key: "quotes.create",
    group: "Cotizaciones",
    label: "Crear cotizaciones",
    description: "Crear nuevos borradores y folios."
  },
  {
    key: "quotes.edit",
    group: "Cotizaciones",
    label: "Editar cotizaciones",
    description: "Modificar partidas y estados comerciales."
  },
  {
    key: "quotes.pdf",
    group: "Cotizaciones",
    label: "Generar PDF",
    description: "Generar y registrar PDFs de cotización."
  },
  {
    key: "catalog.view",
    group: "Catálogo",
    label: "Ver catálogo",
    description: "Consultar productos, materiales y precios."
  },
  {
    key: "catalog.edit",
    group: "Catálogo",
    label: "Editar catálogo",
    description: "Modificar precios y multiplicadores."
  },
  {
    key: "projects.view",
    group: "Proyectos",
    label: "Ver proyectos",
    description: "Consultar proyectos operativos."
  },
  {
    key: "projects.edit",
    group: "Proyectos",
    label: "Modificar proyectos",
    description: "Crear o actualizar proyectos cuando el módulo lo permita."
  },
  {
    key: "warranties.view",
    group: "Garantías",
    label: "Ver garantías",
    description: "Consultar garantías y mantenimientos."
  },
  {
    key: "warranties.edit",
    group: "Garantías",
    label: "Modificar garantías",
    description: "Crear o actualizar garantías cuando el módulo lo permita."
  },
  {
    key: "whatsapp.view",
    group: "WhatsApp",
    label: "Ver WhatsApp",
    description: "Consultar estado, bandeja y registros."
  },
  {
    key: "whatsapp.manage",
    group: "WhatsApp",
    label: "Administrar WhatsApp",
    description: "Conectar, desconectar o reiniciar el proveedor."
  },
  {
    key: "users.view",
    group: "Usuarios",
    label: "Ver usuarios",
    description: "Consultar cuentas y permisos."
  },
  {
    key: "users.manage",
    group: "Usuarios",
    label: "Administrar usuarios",
    description: "Crear cuentas, cambiar rol, contraseña y permisos."
  },
  {
    key: "users.delete",
    group: "Usuarios",
    label: "Eliminar usuarios",
    description: "Eliminar cuentas definitivamente conservando auditoría histórica."
  }
];

export const roleDefaultPermissions: Record<AppRole, PermissionKey[]> = {
  ADMIN: [...permissionKeys],
  SALES: [
    "dashboard.view",
    "leads.view",
    "leads.create",
    "leads.edit",
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.pdf",
    "catalog.view"
  ],
  OPERATIONS: [
    "dashboard.view",
    "projects.view",
    "projects.edit",
    "warranties.view",
    "warranties.edit"
  ]
};

export function normalizeRole(value: unknown): AppRole | null {
  return isAppRole(value) ? value : null;
}

export function normalizePermissions(value: unknown): PermissionKey[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is PermissionKey => isPermissionKey(item)))
  );
}

export function resolvePermissions(
  role: AppRole,
  storedPermissions: unknown
): PermissionKey[] {
  if (!Array.isArray(storedPermissions)) {
    return [...roleDefaultPermissions[role]];
  }

  return normalizePermissions(storedPermissions);
}

export function hasPermission(
  permissions: PermissionKey[],
  permission: PermissionKey
) {
  return permissions.includes(permission);
}

export function canAccessUi(
  permissions: PermissionKey[],
  pathname: string
) {
  if (pathname === "/acceso-denegado") return true;
  if (pathname === "/") return hasPermission(permissions, "dashboard.view");
  if (pathname.startsWith("/prospectos")) return hasPermission(permissions, "leads.view");
  if (pathname.startsWith("/cotizador")) return hasPermission(permissions, "quotes.view");
  if (pathname.startsWith("/catalogo")) return hasPermission(permissions, "catalog.view");
  if (pathname.startsWith("/proyectos")) return hasPermission(permissions, "projects.view");
  if (pathname.startsWith("/garantias")) return hasPermission(permissions, "warranties.view");
  if (pathname.startsWith("/whatsapp")) return hasPermission(permissions, "whatsapp.view");
  if (pathname.startsWith("/usuarios")) return hasPermission(permissions, "users.view");
  if (pathname.startsWith("/cotizacion-demo")) return hasPermission(permissions, "quotes.view");
  return true;
}

export function requiredApiPermission(
  pathname: string,
  method: string
): PermissionKey | null {
  const verb = method.toUpperCase();

  if (pathname.startsWith("/api/admin/users")) {
    if (verb === "GET") return "users.view";
    if (verb === "DELETE") return "users.delete";
    return "users.manage";
  }

  if (pathname === "/api/users" || pathname.startsWith("/api/users?")) {
    return "leads.edit";
  }

  if (pathname === "/api/leads") {
    return verb === "GET" ? "leads.view" : "leads.create";
  }

  if (pathname.startsWith("/api/leads/")) {
    return verb === "GET" ? "leads.view" : "leads.edit";
  }

  if (pathname === "/api/quotes") {
    return verb === "GET" ? "quotes.view" : "quotes.create";
  }

  if (pathname.startsWith("/api/quotes/pdf")) {
    return "quotes.pdf";
  }

  if (pathname.startsWith("/api/quotes/")) {
    return verb === "GET" ? "quotes.view" : "quotes.edit";
  }

  if (pathname.startsWith("/api/catalog")) {
    return verb === "GET" ? "catalog.view" : "catalog.edit";
  }

  if (pathname.startsWith("/api/projects")) {
    return verb === "GET" ? "projects.view" : "projects.edit";
  }

  if (pathname.startsWith("/api/warranties")) {
    return verb === "GET" ? "warranties.view" : "warranties.edit";
  }

  if (pathname.startsWith("/api/whatsapp/baileys/connect")) return "whatsapp.manage";
  if (pathname.startsWith("/api/whatsapp/baileys/disconnect")) return "whatsapp.manage";
  if (pathname.startsWith("/api/whatsapp/baileys/reset")) return "whatsapp.manage";
  if (pathname.startsWith("/api/whatsapp")) return "whatsapp.view";

  if (pathname.startsWith("/api/conversations")) return "leads.edit";
  if (pathname.startsWith("/api/auth")) return null;

  return null;
}

export function canAccessApi(
  permissions: PermissionKey[],
  pathname: string,
  method: string
) {
  const required = requiredApiPermission(pathname, method);
  return required ? hasPermission(permissions, required) : true;
}
