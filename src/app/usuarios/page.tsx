"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRoundCog
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AppRole,
  PermissionKey,
  SessionUser
} from "@/lib/auth/types";
import {
  permissionCatalog,
  roleDefaultPermissions
} from "@/lib/auth/permissions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  permissions: PermissionKey[];
  usesRoleDefaults: boolean;
  passwordConfigured: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  assignedLeads: number;
  auditEntries: number;
};

const roleLabels: Record<AppRole, string> = {
  ADMIN: "Administrador",
  SALES: "Ventas",
  OPERATIONS: "Operaciones"
};

function samePermissions(first: PermissionKey[], second: PermissionKey[]) {
  if (first.length !== second.length) return false;

  const set = new Set(first);
  return second.every((permission) => set.has(permission));
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("SALES");
  const [active, setActive] = useState("true");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>(
    roleDefaultPermissions.SALES
  );
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canManage = session?.permissions.includes("users.manage") ?? false;
  const canDelete = session?.permissions.includes("users.delete") ?? false;

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, typeof permissionCatalog>();

    for (const permission of permissionCatalog) {
      const rows = groups.get(permission.group) ?? [];
      rows.push(permission);
      groups.set(permission.group, rows);
    }

    return Array.from(groups.entries());
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, meResponse] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" })
      ]);

      const usersData = (await usersResponse.json()) as
        | UserRow[]
        | { error?: string };
      const meData = (await meResponse.json()) as
        | { user: SessionUser }
        | { error?: string };

      if (!usersResponse.ok || !Array.isArray(usersData)) {
        throw new Error(
          !Array.isArray(usersData)
            ? usersData.error ?? "No se pudieron cargar los usuarios."
            : "No se pudieron cargar los usuarios."
        );
      }

      if (!meResponse.ok || !("user" in meData)) {
        throw new Error("No se pudo leer la sesión actual.");
      }

      setUsers(usersData);
      setSession(meData.user);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudieron cargar los usuarios."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function applyRolePreset(nextRole: AppRole) {
    setRole(nextRole);
    setPermissions([...roleDefaultPermissions[nextRole]]);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("SALES");
    setActive("true");
    setPassword("");
    setPermissions([...roleDefaultPermissions.SALES]);
    setError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setActive(user.isActive ? "true" : "false");
    setPassword("");
    setPermissions([...user.permissions]);
    setError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function togglePermission(permission: PermissionKey) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  async function save() {
    if (!canManage) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const originalRole = editing?.role;
    const originalPermissions = editing?.permissions ?? [];
    const permissionChanged =
      Boolean(editing) && !samePermissions(originalPermissions, permissions);
    const roleChanged = Boolean(editing) && originalRole !== role;

    try {
      const response = await fetch(
        editing ? `/api/admin/users/${editing.id}` : "/api/admin/users",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing
              ? {
                  name,
                  role,
                  isActive: active === "true",
                  permissions,
                  ...(password ? { password } : {})
                }
              : {
                  name,
                  email,
                  role,
                  password,
                  permissions
                }
          )
        }
      );

      const data = (await response.json()) as {
        error?: string;
        reloginRecommended?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el usuario.");
      }

      setDialogOpen(false);

      if (
        editing &&
        session &&
        editing.id === session.id &&
        (permissionChanged || roleChanged)
      ) {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/login");
        return;
      }

      setMessage(
        editing
          ? "Usuario actualizado. Los cambios de permisos se aplicarán por completo cuando esa persona vuelva a iniciar sesión."
          : "Usuario creado correctamente."
      );

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo guardar el usuario."
      );
    } finally {
      setSaving(false);
    }
  }

  function askDelete(user: UserRow) {
    setDialogOpen(false);
    setDeleteTarget(user);
    setDeleteConfirm("");
    setError(null);
    setMessage(null);
  }

  async function deleteUser() {
    if (!deleteTarget || !canDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE"
      });

      const data = (await response.json()) as {
        error?: string;
        deletedUser?: { name: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el usuario.");
      }

      setDeleteTarget(null);
      setDeleteConfirm("");
      setMessage(
        `${data.deletedUser?.name ?? "Usuario"} eliminado. Sus prospectos quedaron sin asignar y la auditoría histórica se conserva.`
      );
      await loadData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      );
    } finally {
      setDeleting(false);
    }
  }

  const activeUsers = users.filter((user) => user.isActive).length;
  const adminUsers = users.filter((user) => user.role === "ADMIN").length;
  const salesUsers = users.filter((user) => user.role === "SALES").length;
  const operationsUsers = users.filter((user) => user.role === "OPERATIONS").length;

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Seguridad</p>
              <h1 className="ui-page-title">Usuarios y permisos</h1>
              <p className="ui-page-description">
                Usa el rol como plantilla y ajusta permisos individuales para cada cuenta.
              </p>
            </div>

            {canManage ? (
              <div className="ui-page-actions">
                <Button type="button" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nuevo usuario
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {message ? (
          <div className="rounded-xl border border-[#3aaa35] bg-[#f2fbf1] p-3 text-sm text-[#1d5f1a]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="ui-content-grid">
          <div className="space-y-6 min-w-0">
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="ui-kpi-card ui-surface-hover">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Administrador</p>
                  <p className="mt-2 font-semibold">Plantilla con todos los permisos</p>
                </CardContent>
              </Card>
              <Card className="ui-kpi-card ui-surface-hover">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Ventas</p>
                  <p className="mt-2 font-semibold">Prospectos, cotizaciones y catálogo en lectura</p>
                </CardContent>
              </Card>
              <Card className="ui-kpi-card ui-surface-hover">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Operaciones</p>
                  <p className="mt-2 font-semibold">Proyectos y garantías</p>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Cuentas del sistema</CardTitle>
                <CardDescription>
                  Eliminar una cuenta no elimina prospectos ni registros históricos.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay usuarios.</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="ui-surface-hover flex flex-col gap-4 rounded-2xl border bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-brand-ink">{user.name}</p>
                      <Badge variant={user.isActive ? "success" : "secondary"}>
                        {user.isActive ? "Activo" : "Desactivado"}
                      </Badge>
                      <Badge variant="outline">{roleLabels[user.role]}</Badge>
                      {session?.id === user.id ? (
                        <Badge variant="secondary">Tu cuenta</Badge>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.email}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{user.permissions.length} permisos</span>
                      <span>{user.assignedLeads} prospectos asignados</span>
                      <span>{user.auditEntries} registros de auditoría</span>
                      <span>
                        Último acceso:{" "}
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString("es-MX")
                          : "Nunca"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openEdit(user)}
                    >
                      <UserRoundCog className="mr-2 h-4 w-4" aria-hidden="true" />
                      {canManage ? "Administrar" : "Ver permisos"}
                    </Button>

                    {canDelete && session?.id !== user.id ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => askDelete(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
              </CardContent>
            </Card>
          </div>

          <aside className="ui-sticky-aside space-y-4">
            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Resumen de acceso</CardTitle>
                <CardDescription>Vista rápida del estado actual de cuentas.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="ui-info-grid">
                  <div className="ui-info-tile">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Usuarios activos</p>
                    <p className="mt-2 text-2xl font-black text-brand-ink">{activeUsers}</p>
                  </div>
                  <div className="ui-info-tile">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Perfiles admin</p>
                    <p className="mt-2 text-2xl font-black text-primary">{adminUsers}</p>
                  </div>
                  <div className="ui-info-tile">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Ventas</p>
                    <p className="mt-2 text-2xl font-black text-brand-ink">{salesUsers}</p>
                  </div>
                  <div className="ui-info-tile">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Operaciones</p>
                    <p className="mt-2 text-2xl font-black text-brand-ink">{operationsUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Buenas prácticas</CardTitle>
                <CardDescription>Recomendaciones para cuidar el acceso y la trazabilidad.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="ui-aside-list">
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Asigna el rol base correcto antes de personalizar permisos individuales.</p></li>
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Cuando cambies permisos críticos, pide reingreso para refrescar la sesión.</p></li>
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Evita eliminar cuentas si basta con desactivarlas para preservar historial.</p></li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </section>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Administrar ${editing.name}` : "Nuevo usuario"}
              </DialogTitle>
              <DialogDescription>
                El rol carga una plantilla de permisos. Después puedes ajustar cada permiso individualmente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="user-name">Nombre</Label>
                  <Input
                    id="user-name"
                    className="mt-2"
                    value={name}
                    disabled={!canManage}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="user-email">Correo</Label>
                  <Input
                    id="user-email"
                    className="mt-2"
                    type="email"
                    value={email}
                    disabled={Boolean(editing) || !canManage}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div>
                  <Label>Rol / plantilla</Label>
                  <Select
                    value={role}
                    disabled={!canManage}
                    onValueChange={(value) => applyRolePreset(value as AppRole)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="SALES">Ventas</SelectItem>
                      <SelectItem value="OPERATIONS">Operaciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editing ? (
                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={active}
                      disabled={!canManage}
                      onValueChange={setActive}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Desactivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="user-password">Contraseña inicial</Label>
                    <Input
                      id="user-password"
                      className="mt-2"
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      value={password}
                      disabled={!canManage}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mínimo 10 caracteres"
                    />
                  </div>
                )}

                {editing ? (
                  <div className="sm:col-span-2">
                    <Label htmlFor="user-password">
                      Nueva contraseña (opcional)
                    </Label>
                    <Input
                      id="user-password"
                      className="mt-2"
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      value={password}
                      disabled={!canManage}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Déjalo vacío para conservar la contraseña actual"
                    />
                  </div>
                ) : null}
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-ink">
                      Permisos individuales
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {permissions.length} de {permissionCatalog.length} permisos activos.
                    </p>
                  </div>

                  {canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setPermissions([...roleDefaultPermissions[role]])
                      }
                    >
                      <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                      Restaurar plantilla del rol
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {permissionGroups.map(([group, rows]) => (
                    <Card key={group}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{group}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {rows.map((permission) => {
                          const checked = permissions.includes(permission.key);

                          return (
                            <label
                              key={permission.key}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4"
                                checked={checked}
                                disabled={!canManage}
                                onChange={() => togglePermission(permission.key)}
                              />
                              <span>
                                <span className="block text-sm font-semibold text-brand-ink">
                                  {permission.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                  {permission.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {canManage ? (
                <Button
                  className="w-full"
                  type="button"
                  disabled={
                    saving ||
                    !name.trim() ||
                    (!editing && (!email.trim() || password.length < 10))
                  }
                  onClick={() => void save()}
                >
                  {editing ? (
                    <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {saving
                    ? "Guardando..."
                    : editing
                      ? "Guardar cambios y permisos"
                      : "Crear usuario"}
                </Button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setDeleteConfirm("");
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Eliminar usuario definitivamente</DialogTitle>
              <DialogDescription>
                Esta acción elimina la cuenta de acceso. Los prospectos y el historial del CRM no se eliminan.
              </DialogDescription>
            </DialogHeader>

            {deleteTarget ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">{deleteTarget.name}</p>
                  <p className="mt-1">{deleteTarget.email}</p>
                  <p className="mt-3">
                    {deleteTarget.assignedLeads} prospectos asignados pasarán a
                    <strong> Sin asignar</strong>.
                  </p>
                  <p>
                    {deleteTarget.auditEntries} registros históricos conservarán la actividad,
                    pero ya no estarán vinculados a una cuenta existente.
                  </p>
                </div>

                <div>
                  <Label htmlFor="delete-confirm">
                    Escribe <strong>ELIMINAR</strong> para confirmar
                  </Label>
                  <Input
                    id="delete-confirm"
                    className="mt-2"
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    autoComplete="off"
                  />
                </div>

                <Button
                  className="w-full"
                  type="button"
                  variant="destructive"
                  disabled={deleting || deleteConfirm !== "ELIMINAR"}
                  onClick={() => void deleteUser()}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {deleting ? "Eliminando..." : "Eliminar usuario definitivamente"}
                </Button>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
