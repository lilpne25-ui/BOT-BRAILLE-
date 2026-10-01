"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  MessageSquarePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  WarrantyDto,
  WarrantyStatus,
  warrantyStatusValues,
  warrantyTypeValues
} from "@/modules/warranties/contracts";
import {
  SessionUser
} from "@/lib/auth/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ResponsibleUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type EligibleProject = {
  code: string;
  client: string;
  project: string;
  city: string;
  solutionInstalled: string;
  responsible: string;
  evidenceCount: number;
  leadCode?: string;
  estimatedInstallation: string;
};

type WarrantyOptions = {
  responsibleUsers: ResponsibleUser[];
  eligibleProjects: EligibleProject[];
};

type WarrantyFormState = {
  projectCode: string;
  client: string;
  project: string;
  city: string;
  solutionInstalled: string;
  installDate: string;
  warrantyUntil: string;
  nextMaintenance: string;
  warrantyType: string;
  coverage: string;
  nextAction: string;
  status: WarrantyStatus;
  evidence: string;
  evidenceCount: number;
  responsible: string;
  observations: string;
};

function dateAfter(
  source: string,
  days: number
) {
  const base = source
    ? new Date(
        `${source}T12:00:00`
      )
    : new Date();

  base.setDate(
    base.getDate() + days
  );

  return base
    .toISOString()
    .slice(0, 10);
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function emptyForm(): WarrantyFormState {
  const installDate = today();

  return {
    projectCode: "NONE",
    client: "",
    project: "",
    city: "",
    solutionInstalled: "",
    installDate,
    warrantyUntil:
      dateAfter(
        installDate,
        365
      ),
    nextMaintenance:
      dateAfter(
        installDate,
        180
      ),
    warrantyType:
      "Estandar",
    coverage:
      "Cobertura general de la instalacion y materiales conforme a las condiciones comerciales acordadas.",
    nextAction:
      "Programar revision postventa y mantenimiento preventivo.",
    status:
      "Activa",
    evidence:
      "Evidencia pendiente de registro.",
    evidenceCount: 0,
    responsible:
      "Sin asignar",
    observations:
      "Sin observaciones adicionales."
  };
}

function warrantyToForm(
  warranty: WarrantyDto
): WarrantyFormState {
  return {
    projectCode:
      warranty.projectCode ??
      "NONE",
    client:
      warranty.client,
    project:
      warranty.project,
    city:
      warranty.city,
    solutionInstalled:
      warranty.solutionInstalled,
    installDate:
      warranty.installDate,
    warrantyUntil:
      warranty.warrantyUntil,
    nextMaintenance:
      warranty.nextMaintenance,
    warrantyType:
      warranty.warrantyType,
    coverage:
      warranty.coverage,
    nextAction:
      warranty.nextAction,
    status:
      warranty.status,
    evidence:
      warranty.evidence,
    evidenceCount:
      warranty.evidenceCount,
    responsible:
      warranty.responsible,
    observations:
      warranty.observations
  };
}

function badgeVariant(
  status: WarrantyStatus
) {
  if (status === "Activa") {
    return "success";
  }

  if (
    status === "Por vencer" ||
    status ===
      "Mantenimiento agendado"
  ) {
    return "warning";
  }

  if (
    status ===
    "Requiere revision"
  ) {
    return "destructive";
  }

  return "secondary";
}

function daysUntil(
  isoDate: string
) {
  const target = new Date(
    `${isoDate}T12:00:00`
  ).getTime();
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  return Math.ceil(
    (target - now.getTime()) /
      86_400_000
  );
}

function WarrantyDetail({
  warranty,
  canEdit,
  onEdit,
  onActivity
}: {
  warranty: WarrantyDto;
  canEdit: boolean;
  onEdit: () => void;
  onActivity: () => void;
}) {
  const days =
    daysUntil(
      warranty.warrantyUntil
    );

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Garantía
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {warranty.id}
          </p>
          <p className="text-sm text-muted-foreground">
            {warranty.client}
          </p>
          <p className="text-sm text-muted-foreground">
            {warranty.project}
          </p>
          {warranty.projectCode ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Proyecto: {warranty.projectCode}
            </p>
          ) : null}
          {warranty.cascadeSource ? (
            <p className="mt-2 text-xs font-medium text-primary">
              Origen: {warranty.cascadeSource}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contacto heredado
          </p>
          <p className="mt-1 text-sm text-brand-ink">
            {warranty.contact || "Sin contacto"}
          </p>
          <p className="text-sm text-muted-foreground">
            {warranty.email || "Sin correo"}
          </p>
          <p className="text-sm text-muted-foreground">
            {warranty.phone || "Sin telefono"}
          </p>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cobertura
          </p>
          <p className="mt-1 text-sm font-medium text-brand-ink">
            {warranty.warrantyType}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {warranty.coverage}
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Estado
          </p>
          <div className="mt-2">
            <Badge
              variant={
                badgeVariant(
                  warranty.status
                )
              }
            >
              {warranty.status}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Instalación
          </p>
          <p className="mt-2 text-sm text-brand-ink">
            {formatDate(
              warranty.installDate
            )}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Vencimiento
          </p>
          <p className="mt-2 text-sm text-brand-ink">
            {formatDate(
              warranty.warrantyUntil
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {days >= 0
              ? `${days} días restantes`
              : `${Math.abs(days)} días vencida`}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Mantenimiento
          </p>
          <p className="mt-2 text-sm text-brand-ink">
            {formatDate(
              warranty.nextMaintenance
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Responsable
          </p>
          <p className="mt-2 text-sm text-brand-ink">
            {warranty.responsible}
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Próxima acción
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {warranty.nextAction}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Evidencia
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {warranty.evidence}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total registrado: {warranty.evidenceCount}
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Observaciones
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {warranty.observations}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Historial postventa
        </p>

        <div className="mt-3 space-y-3">
          {warranty.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay eventos registrados.
            </p>
          ) : (
            warranty.timeline.map(
              (event) => (
                <div
                  key={event.id}
                  className="rounded-xl border bg-brand-background p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDate(
                      event.date
                    )}
                  </p>
                  <p className="text-sm font-semibold text-brand-ink">
                    {event.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.note}
                  </p>
                </div>
              )
            )
          )}
        </div>
      </section>

      {canEdit ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onActivity}
          >
            <MessageSquarePlus
              className="mr-2 h-4 w-4"
              aria-hidden="true"
            />
            Agregar atención
          </Button>

          <Button
            type="button"
            onClick={onEdit}
          >
            <Pencil
              className="mr-2 h-4 w-4"
              aria-hidden="true"
            />
            Editar garantía
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function WarrantyTable({
  initialSearch = ""
}: {
  initialSearch?: string;
}) {
  const [
    warranties,
    setWarranties
  ] = useState<WarrantyDto[]>([]);
  const [
    options,
    setOptions
  ] = useState<WarrantyOptions>({
    responsibleUsers: [],
    eligibleProjects: []
  });
  const [
    session,
    setSession
  ] = useState<SessionUser | null>(
    null
  );

  const [
    search,
    setSearch
  ] = useState(
    initialSearch
  );
  const [
    status,
    setStatus
  ] = useState<
    WarrantyStatus | "Todos"
  >("Todos");
  const [
    loading,
    setLoading
  ] = useState(true);
  const [
    loadError,
    setLoadError
  ] = useState<string | null>(
    null
  );

  const [
    selectedWarranty,
    setSelectedWarranty
  ] = useState<WarrantyDto | null>(
    null
  );
  const [
    detailOpen,
    setDetailOpen
  ] = useState(false);
  const [
    formOpen,
    setFormOpen
  ] = useState(false);
  const [
    editingWarranty,
    setEditingWarranty
  ] = useState<WarrantyDto | null>(
    null
  );
  const [
    form,
    setForm
  ] = useState<WarrantyFormState>(
    emptyForm
  );
  const [
    formError,
    setFormError
  ] = useState<string | null>(
    null
  );
  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    activityOpen,
    setActivityOpen
  ] = useState(false);
  const [
    activityTitle,
    setActivityTitle
  ] = useState("");
  const [
    activityNote,
    setActivityNote
  ] = useState("");
  const [
    activitySaving,
    setActivitySaving
  ] = useState(false);

  const canEdit =
    session?.permissions.includes(
      "warranties.edit"
    ) ?? false;
  const warrantyInherited =
    form.projectCode !==
    "NONE";

  useEffect(() => {
    setSearch(
      initialSearch
    );
  }, [initialSearch]);

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setLoadError(null);

        try {
          const [
            warrantiesResponse,
            optionsResponse,
            sessionResponse
          ] =
            await Promise.all([
              fetch(
                "/api/warranties",
                {
                  cache:
                    "no-store"
                }
              ),
              fetch(
                "/api/warranties/options",
                {
                  cache:
                    "no-store"
                }
              ),
              fetch(
                "/api/auth/me",
                {
                  cache:
                    "no-store"
                }
              )
            ]);

          const warrantiesData =
            (await warrantiesResponse.json()) as
              | WarrantyDto[]
              | {
                  error?: string;
                };
          const optionsData =
            (await optionsResponse.json()) as
              | WarrantyOptions
              | {
                  error?: string;
                };
          const sessionData =
            (await sessionResponse.json()) as
              | {
                  user:
                    SessionUser;
                }
              | {
                  error?: string;
                };

          if (
            !warrantiesResponse.ok ||
            !Array.isArray(
              warrantiesData
            )
          ) {
            throw new Error(
              !Array.isArray(
                warrantiesData
              )
                ? warrantiesData.error ??
                    "No se pudieron cargar las garantias."
                : "No se pudieron cargar las garantias."
            );
          }

          if (
            !optionsResponse.ok ||
            !(
              "responsibleUsers" in
              optionsData
            )
          ) {
            throw new Error(
              "No se pudieron cargar las opciones de postventa."
            );
          }

          if (
            !sessionResponse.ok ||
            !("user" in sessionData)
          ) {
            throw new Error(
              "No se pudo leer la sesion actual."
            );
          }

          setWarranties(
            warrantiesData
          );
          setOptions(
            optionsData
          );
          setSession(
            sessionData.user
          );

        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las garantias."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return warranties.filter(
        (warranty) => {
          const matchesQuery =
            query.length === 0 ||
            warranty.id
              .toLowerCase()
              .includes(query) ||
            warranty.client
              .toLowerCase()
              .includes(query) ||
            warranty.project
              .toLowerCase()
              .includes(query) ||
            warranty.city
              .toLowerCase()
              .includes(query) ||
            warranty.responsible
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            status === "Todos" ||
            warranty.status ===
              status;

          return (
            matchesQuery &&
            matchesStatus
          );
        }
      );
    }, [
      search,
      status,
      warranties
    ]);

  const summary =
    useMemo(
      () => ({
        active:
          warranties.filter(
            (row) =>
              row.status ===
              "Activa"
          ).length,
        expiring:
          warranties.filter(
            (row) =>
              row.status ===
                "Por vencer" ||
              (
                daysUntil(
                  row.warrantyUntil
                ) >= 0 &&
                daysUntil(
                  row.warrantyUntil
                ) <= 30
              )
          ).length,
        maintenance:
          warranties.filter(
            (row) =>
              row.status ===
                "Mantenimiento agendado" ||
              (
                daysUntil(
                  row.nextMaintenance
                ) >= 0 &&
                daysUntil(
                  row.nextMaintenance
                ) <= 30
              )
          ).length,
        review:
          warranties.filter(
            (row) =>
              row.status ===
              "Requiere revision"
          ).length
      }),
      [warranties]
    );

  function openDetail(
    warranty: WarrantyDto
  ) {
    setSelectedWarranty(
      warranty
    );
    setDetailOpen(true);
  }

  function openCreate() {
    setEditingWarranty(
      null
    );
    setForm(
      emptyForm()
    );
    setFormError(
      null
    );
    setFormOpen(true);
  }

  function openEdit(
    warranty: WarrantyDto
  ) {
    setDetailOpen(false);
    setEditingWarranty(
      warranty
    );
    setForm(
      warrantyToForm(
        warranty
      )
    );
    setFormError(null);
    setFormOpen(true);
  }

  function applyProject(
    code: string
  ) {
    if (
      code === "NONE"
    ) {
      setForm(
        (current) => ({
          ...current,
          projectCode:
            "NONE"
        })
      );
      return;
    }

    const project =
      options.eligibleProjects.find(
        (row) =>
          row.code === code
      );

    if (!project) return;

    const installDate =
      today();

    setForm(
      (current) => ({
        ...current,
        projectCode:
          project.code,
        client:
          project.client,
        project:
          project.project,
        city:
          project.city,
        solutionInstalled:
          project.solutionInstalled,
        responsible:
          project.responsible ||
          current.responsible,
        evidenceCount:
          project.evidenceCount,
        evidence:
          `Evidencias heredadas del proyecto ${project.code}: ${project.evidenceCount} registradas.`,
        installDate,
        warrantyUntil:
          dateAfter(
            installDate,
            365
          ),
        nextMaintenance:
          dateAfter(
            installDate,
            180
          ),
        observations:
          `Garantia vinculada al proyecto ${project.code}.`
      })
    );
  }

  function updateInstallDate(
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        installDate:
          value,
        warrantyUntil:
          dateAfter(
            value,
            365
          ),
        nextMaintenance:
          dateAfter(
            value,
            180
          )
      })
    );
  }

  async function saveWarranty() {
    if (!canEdit) return;

    setSaving(true);
    setFormError(null);

    try {
      const response =
        await fetch(
          editingWarranty
            ? `/api/warranties/${encodeURIComponent(
                editingWarranty.id
              )}`
            : "/api/warranties",
          {
            method:
              editingWarranty
                ? "PATCH"
                : "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify(
                editingWarranty
                  ? {
                      ...(!warrantyInherited
                        ? {
                            project:
                              form.project,
                            city:
                              form.city,
                            solutionInstalled:
                              form.solutionInstalled
                          }
                        : {}),
                      installDate:
                        form.installDate,
                      warrantyUntil:
                        form.warrantyUntil,
                      nextMaintenance:
                        form.nextMaintenance,
                      warrantyType:
                        form.warrantyType,
                      coverage:
                        form.coverage,
                      nextAction:
                        form.nextAction,
                      status:
                        form.status,
                      evidence:
                        form.evidence,
                      evidenceCount:
                        form.evidenceCount,
                      responsible:
                        form.responsible,
                      observations:
                        form.observations
                    }
                  : {
                      ...(form.projectCode !==
                      "NONE"
                        ? {
                            projectCode:
                              form.projectCode
                          }
                        : {}),
                      client:
                        form.client,
                      project:
                        form.project,
                      city:
                        form.city,
                      solutionInstalled:
                        form.solutionInstalled,
                      installDate:
                        form.installDate,
                      warrantyUntil:
                        form.warrantyUntil,
                      nextMaintenance:
                        form.nextMaintenance,
                      warrantyType:
                        form.warrantyType,
                      coverage:
                        form.coverage,
                      nextAction:
                        form.nextAction,
                      status:
                        form.status,
                      evidence:
                        form.evidence,
                      evidenceCount:
                        form.evidenceCount,
                      responsible:
                        form.responsible,
                      observations:
                        form.observations
                    }
              )
          }
        );

      const data =
        (await response.json()) as
          | WarrantyDto
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error ??
                "No se pudo guardar la garantia."
            : "No se pudo guardar la garantia."
        );
      }

      setFormOpen(false);
      setEditingWarranty(
        null
      );

      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la garantia."
      );
    } finally {
      setSaving(false);
    }
  }

  function openActivity(
    warranty: WarrantyDto
  ) {
    setSelectedWarranty(
      warranty
    );
    setActivityTitle("");
    setActivityNote("");
    setFormError(null);
    setActivityOpen(true);
  }

  async function saveActivity() {
    if (
      !selectedWarranty ||
      !canEdit
    ) {
      return;
    }

    setActivitySaving(true);
    setFormError(null);

    try {
      const response =
        await fetch(
          `/api/warranties/${encodeURIComponent(
            selectedWarranty.id
          )}/activity`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                title:
                  activityTitle,
                note:
                  activityNote
              })
          }
        );

      const data =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo registrar la atencion."
        );
      }

      setActivityOpen(
        false
      );
      await loadData();

      const response2 =
        await fetch(
          "/api/warranties",
          {
            cache:
              "no-store"
          }
        );
      const rows =
        (await response2.json()) as WarrantyDto[];

      const current =
        rows.find(
          (row) =>
            row.id ===
            selectedWarranty.id
        );

      if (current) {
        setSelectedWarranty(
          current
        );
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la atencion."
      );
    } finally {
      setActivitySaving(false);
    }
  }

  const responsibleNames =
    useMemo(() => {
      const names =
        options.responsibleUsers.map(
          (user) =>
            user.name
        );

      if (
        form.responsible &&
        !names.includes(
          form.responsible
        )
      ) {
        names.push(
          form.responsible
        );
      }

      if (
        !names.includes(
          "Sin asignar"
        )
      ) {
        names.unshift(
          "Sin asignar"
        );
      }

      return names;
    }, [
      form.responsible,
      options.responsibleUsers
    ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <ShieldCheck
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              Panel operativo postventa
            </CardTitle>
            <CardDescription className="mt-2">
              Garantías, mantenimientos, incidencias y trazabilidad por instalación.
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadData()
              }
              disabled={loading}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
                aria-hidden="true"
              />
              Actualizar
            </Button>

            {canEdit ? (
              <Button
                type="button"
                onClick={
                  openCreate
                }
              >
                <Plus
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Nueva garantía
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              Garantías activas
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              Por vencer ≤ 30 días
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {summary.expiring}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              Mantenimiento ≤ 30 días
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {summary.maintenance}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              Requieren revisión
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {summary.review}
            </p>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div>
            <Label htmlFor="warranty-search">
              Buscar
            </Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3">
              <Search
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="warranty-search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder="Folio, cliente, proyecto, ciudad o responsable"
              />
            </div>
          </div>

          <div>
            <Label>
              Estado
            </Label>
            <Select
              value={status}
              onValueChange={(
                value
              ) =>
                setStatus(
                  value as
                    | WarrantyStatus
                    | "Todos"
                )
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">
                  Todos
                </SelectItem>
                {warrantyStatusValues.map(
                  (
                    statusOption
                  ) => (
                    <SelectItem
                      key={
                        statusOption
                      }
                      value={
                        statusOption
                      }
                    >
                      {
                        statusOption
                      }
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border bg-white p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 text-amber-600"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Revisa vencimientos y cambia el estado a Por vencer cuando requiera seguimiento comercial.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border bg-white p-3">
            <Wrench
              className="mt-0.5 h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Programa el siguiente mantenimiento y documenta cada atención en el historial.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border bg-white p-3">
            <Camera
              className="mt-0.5 h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              El contador de evidencias registra cantidad; la carga real de archivos será un módulo posterior.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Garantía
                </TableHead>
                <TableHead>
                  Cliente / proyecto
                </TableHead>
                <TableHead>
                  Responsable
                </TableHead>
                <TableHead>
                  Vigencia
                </TableHead>
                <TableHead>
                  Próximo mantenimiento
                </TableHead>
                <TableHead>
                  Estado
                </TableHead>
                <TableHead>
                  Evidencias
                </TableHead>
                <TableHead className="text-right">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length ===
              0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay garantías que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(
                  (
                    warranty
                  ) => (
                    <TableRow
                      key={
                        warranty.id
                      }
                    >
                      <TableCell>
                        <p className="font-semibold text-brand-ink">
                          {
                            warranty.id
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {
                            warranty.warrantyType
                          }
                        </p>
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-brand-ink">
                          {
                            warranty.client
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {
                            warranty.project
                          }
                        </p>
                      </TableCell>

                      <TableCell>
                        {
                          warranty.responsible
                        }
                      </TableCell>

                      <TableCell>
                        <p className="text-sm">
                          {formatDate(
                            warranty.warrantyUntil
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysUntil(
                            warranty.warrantyUntil
                          )}{" "}
                          días
                        </p>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1">
                          <CalendarClock
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {formatDate(
                            warranty.nextMaintenance
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={badgeVariant(
                            warranty.status
                          )}
                        >
                          {
                            warranty.status
                          }
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {
                          warranty.evidenceCount
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openDetail(
                              warranty
                            )
                          }
                        >
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={detailOpen}
        onOpenChange={
          setDetailOpen
        }
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {
                selectedWarranty?.client
              }
            </DialogTitle>
            <DialogDescription>
              Expediente de garantía, mantenimiento y atención postventa.
            </DialogDescription>
          </DialogHeader>

          {selectedWarranty ? (
            <WarrantyDetail
              warranty={
                selectedWarranty
              }
              canEdit={
                canEdit
              }
              onEdit={() =>
                openEdit(
                  selectedWarranty
                )
              }
              onActivity={() =>
                openActivity(
                  selectedWarranty
                )
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={
          setFormOpen
        }
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWarranty
                ? `Editar ${editingWarranty.id}`
                : "Nueva garantía"}
            </DialogTitle>
            <DialogDescription>
              Define vigencia, cobertura, mantenimiento, responsable y seguimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {!editingWarranty &&
            options
              .eligibleProjects
              .length > 0 ? (
              <div className="rounded-2xl border bg-brand-background p-4">
                <Label>
                  Crear desde proyecto instalado/cerrado pendiente
                </Label>
                <Select
                  value={
                    form.projectCode
                  }
                  onValueChange={
                    applyProject
                  }
                >
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      Garantía manual sin proyecto
                    </SelectItem>
                    {options.eligibleProjects.map(
                      (
                        project
                      ) => (
                        <SelectItem
                          key={
                            project.code
                          }
                          value={
                            project.code
                          }
                        >
                          {
                            project.code
                          }{" "}
                          ·{" "}
                          {
                            project.client
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {warrantyInherited ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-semibold text-brand-ink">
                  Datos heredados del proyecto
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cliente, proyecto, ciudad, solución instalada y evidencias vienen
                  del proyecto. Postventa administra vigencia, cobertura, responsable,
                  mantenimiento, estado, próximas acciones y atenciones.
                </p>
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="w-client">
                  Cliente
                </Label>
                <Input
                  id="w-client"
                  className="mt-2"
                  value={
                    form.client
                  }
                  disabled={
                    Boolean(
                      editingWarranty
                    ) ||
                    warrantyInherited
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        client:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-project">
                  Proyecto
                </Label>
                <Input
                  id="w-project"
                  className="mt-2"
                  disabled={warrantyInherited}
                  value={
                    form.project
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        project:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-city">
                  Ciudad
                </Label>
                <Input
                  id="w-city"
                  className="mt-2"
                  disabled={warrantyInherited}
                  value={
                    form.city
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        city:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-solution">
                  Solución instalada
                </Label>
                <Input
                  id="w-solution"
                  className="mt-2"
                  disabled={warrantyInherited}
                  value={
                    form.solutionInstalled
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        solutionInstalled:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-install">
                  Fecha de instalación
                </Label>
                <Input
                  id="w-install"
                  type="date"
                  className="mt-2"
                  value={
                    form.installDate
                  }
                  onChange={(
                    event
                  ) =>
                    updateInstallDate(
                      event
                        .target
                        .value
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-until">
                  Garantía hasta
                </Label>
                <Input
                  id="w-until"
                  type="date"
                  className="mt-2"
                  value={
                    form.warrantyUntil
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        warrantyUntil:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="w-maintenance">
                  Próximo mantenimiento
                </Label>
                <Input
                  id="w-maintenance"
                  type="date"
                  className="mt-2"
                  value={
                    form.nextMaintenance
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        nextMaintenance:
                          event
                            .target
                            .value
                      })
                    )
                  }
                />
              </div>

              <div>
                <Label>
                  Tipo de garantía
                </Label>
                <Select
                  value={
                    form.warrantyType
                  }
                  onValueChange={(
                    value
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        warrantyType:
                          value
                      })
                    )
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyTypeValues.map(
                      (
                        type
                      ) => (
                        <SelectItem
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {
                            type
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  Estado
                </Label>
                <Select
                  value={
                    form.status
                  }
                  onValueChange={(
                    value
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        status:
                          value as WarrantyStatus
                      })
                    )
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyStatusValues.map(
                      (
                        statusOption
                      ) => (
                        <SelectItem
                          key={
                            statusOption
                          }
                          value={
                            statusOption
                          }
                        >
                          {
                            statusOption
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  Responsable
                </Label>
                <Select
                  value={
                    form.responsible
                  }
                  onValueChange={(
                    value
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        responsible:
                          value
                      })
                    )
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {responsibleNames.map(
                      (
                        name
                      ) => (
                        <SelectItem
                          key={
                            name
                          }
                          value={
                            name
                          }
                        >
                          {
                            name
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="w-evidence-count">
                  Evidencias registradas
                </Label>
                <Input
                  id="w-evidence-count"
                  type="number"
                  min={0}
                  className="mt-2"
                  value={
                    form.evidenceCount
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        evidenceCount:
                          Math.max(
                            0,
                            Math.floor(
                              Number(
                                event
                                  .target
                                  .value
                              ) ||
                                0
                            )
                          )
                      })
                    )
                  }
                />
              </div>
            </section>

            <div>
              <Label htmlFor="w-coverage">
                Cobertura
              </Label>
              <Textarea
                id="w-coverage"
                className="mt-2"
                value={
                  form.coverage
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      coverage:
                        event
                          .target
                          .value
                    })
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="w-next-action">
                Próxima acción
              </Label>
              <Textarea
                id="w-next-action"
                className="mt-2"
                value={
                  form.nextAction
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      nextAction:
                        event
                          .target
                          .value
                    })
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="w-evidence">
                Descripción de evidencia
              </Label>
              <Textarea
                id="w-evidence"
                className="mt-2"
                value={
                  form.evidence
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      evidence:
                        event
                          .target
                          .value
                    })
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="w-observations">
                Observaciones
              </Label>
              <Textarea
                id="w-observations"
                className="mt-2"
                value={
                  form.observations
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      observations:
                        event
                          .target
                          .value
                    })
                  )
                }
              />
            </div>

            {formError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={
                saving ||
                !form.client.trim() ||
                !form.project.trim() ||
                !form.city.trim() ||
                !form.solutionInstalled.trim() ||
                !form.installDate ||
                !form.warrantyUntil ||
                !form.nextMaintenance ||
                !form.warrantyType.trim() ||
                !form.coverage.trim() ||
                !form.nextAction.trim() ||
                !form.evidence.trim() ||
                !form.responsible.trim() ||
                !form.observations.trim()
              }
              onClick={() =>
                void saveWarranty()
              }
            >
              {saving
                ? "Guardando..."
                : editingWarranty
                  ? "Guardar cambios"
                  : "Crear garantía"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activityOpen}
        onOpenChange={
          setActivityOpen
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Registrar atención postventa
            </DialogTitle>
            <DialogDescription>
              La atención quedará guardada en el historial y en la auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="w-activity-title">
                Título
              </Label>
              <Input
                id="w-activity-title"
                className="mt-2"
                value={
                  activityTitle
                }
                onChange={(
                  event
                ) =>
                  setActivityTitle(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Ej. Mantenimiento preventivo realizado"
              />
            </div>

            <div>
              <Label htmlFor="w-activity-note">
                Detalle
              </Label>
              <Textarea
                id="w-activity-note"
                className="mt-2 min-h-28"
                value={
                  activityNote
                }
                onChange={(
                  event
                ) =>
                  setActivityNote(
                    event
                      .target
                      .value
                  )
                }
              />
            </div>

            {formError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={
                activitySaving ||
                !activityTitle.trim() ||
                !activityNote.trim()
              }
              onClick={() =>
                void saveActivity()
              }
            >
              {activitySaving
                ? "Guardando..."
                : "Agregar al historial"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
