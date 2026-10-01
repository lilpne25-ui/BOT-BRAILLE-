"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import Link from "next/link";
import {
  CalendarClock,
  KanbanSquare,
  ListFilter,
  MessageSquarePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Search
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  ProjectDto,
  ProjectRisk,
  ProjectStatus,
  projectRiskValues,
  projectStatusValues
} from "@/modules/projects/contracts";
import {
  projectStatusProgress
} from "@/modules/projects/operational";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type AcceptedQuoteOption = {
  id: string;
  folio: string;
  leadCode: string;
  client: string;
  city: string;
  solutionType: string;
  projectLocation: string;
  items: string[];
};

type ProjectOptions = {
  responsibleUsers: ResponsibleUser[];
  acceptedQuotes: AcceptedQuoteOption[];
};

type ProjectFormState = {
  quoteId: string;
  leadCode: string;
  client: string;
  name: string;
  solutionType: string;
  city: string;
  status: ProjectStatus;
  responsible: string;
  estimatedInstallation: string;
  progress: number;
  risk: ProjectRisk;
  evidenceCount: number;
  nextAction: string;
  mainItemsText: string;
};

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function emptyForm(): ProjectFormState {
  return {
    quoteId: "NONE",
    leadCode: "",
    client: "",
    name: "",
    solutionType: "",
    city: "",
    status: "Diagnostico tecnico",
    responsible: "Sin asignar",
    estimatedInstallation: futureDate(14),
    progress: 5,
    risk: "Bajo",
    evidenceCount: 0,
    nextAction: "Confirmar alcance, responsable y plan de ejecucion.",
    mainItemsText: ""
  };
}

function statusBadgeVariant(status: ProjectStatus) {
  if (status === "Instalado" || status === "Cerrado") return "success";
  if (
    status === "En instalacion" ||
    status === "Programado para instalacion"
  ) {
    return "default";
  }
  if (
    status === "Cotizado" ||
    status === "Aprobado" ||
    status === "En produccion"
  ) {
    return "warning";
  }
  return "secondary";
}

function riskBadgeVariant(risk: ProjectRisk) {
  if (risk === "Alto") return "destructive";
  if (risk === "Medio") return "warning";
  return "success";
}

function projectToForm(project: ProjectDto): ProjectFormState {
  return {
    quoteId: project.quoteId ?? "NONE",
    leadCode: project.prospectCode ?? "",
    client: project.client,
    name: project.name,
    solutionType: project.solutionType,
    city: project.city,
    status: project.status,
    responsible: project.responsible,
    estimatedInstallation: project.estimatedInstallation,
    progress: project.progress,
    risk: project.risk,
    evidenceCount: project.evidenceCount,
    nextAction: project.nextAction,
    mainItemsText: project.mainItems.join("\n")
  };
}

function ProjectDetail({
  project,
  canEdit,
  onEdit,
  onActivity
}: {
  project: ProjectDto;
  canEdit: boolean;
  onEdit: () => void;
  onActivity: () => void;
}) {
  const warrantyHref = `/garantias?client=${encodeURIComponent(project.client)}`;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Proyecto
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {project.id} · {project.client}
          </p>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <p className="text-sm text-muted-foreground">{project.city}</p>
          {project.prospectCode ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Prospecto: {project.prospectCode}
            </p>
          ) : null}
          {project.quoteFolio ? (
            <p className="text-xs text-muted-foreground">
              Cotización: {project.quoteFolio}
            </p>
          ) : null}
          {project.cascadeSource ? (
            <p className="mt-2 text-xs font-medium text-primary">
              Origen: {project.cascadeSource}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contacto heredado
          </p>
          <p className="mt-1 text-sm text-brand-ink">
            {project.contact || "Sin contacto"}
          </p>
          <p className="text-sm text-muted-foreground">
            {project.email || "Sin correo"}
          </p>
          <p className="text-sm text-muted-foreground">
            {project.phone || "Sin telefono"}
          </p>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Operación
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Responsable: {project.responsible}
          </p>
          <p className="text-sm text-muted-foreground">
            Instalación estimada: {formatDate(project.estimatedInstallation)}
          </p>
          <p className="text-sm text-muted-foreground">
            Próxima acción: {project.nextAction}
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Estado
          </p>
          <div className="mt-2">
            <Badge variant={statusBadgeVariant(project.status)}>
              {project.status}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Avance
          </p>
          <p className="mt-2 font-semibold text-brand-ink">
            {project.progress}%
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Riesgo
          </p>
          <div className="mt-2">
            <Badge variant={riskBadgeVariant(project.risk)}>
              {project.risk}
            </Badge>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Evidencias
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {project.evidenceCount} archivos
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Partidas principales
        </p>

        {project.mainItems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sin partidas registradas.
          </p>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {project.mainItems.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Historial operativo
        </p>

        <div className="mt-3 space-y-3">
          {project.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay eventos registrados.
            </p>
          ) : (
            project.timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border bg-brand-background p-3"
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.date)}
                </p>
                <p className="text-sm font-semibold text-brand-ink">
                  {event.title}
                </p>
                <p className="text-sm text-muted-foreground">{event.note}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        {canEdit ? (
          <>
            <Button type="button" variant="outline" onClick={onActivity}>
              <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Agregar nota
            </Button>
            <Button type="button" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editar proyecto
            </Button>
          </>
        ) : null}

        {(project.status === "Instalado" || project.status === "Cerrado") ? (
          <Button asChild variant="outline">
            <Link href={warrantyHref}>Garantía y mantenimiento</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsPanel() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [options, setOptions] = useState<ProjectOptions>({
    responsibleUsers: [],
    acceptedQuotes: []
  });
  const [session, setSession] = useState<SessionUser | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [riskFilter, setRiskFilter] = useState("Todos");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState<ProjectDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);

  const canEdit = session?.permissions.includes("projects.edit") ?? false;
  const projectInherited =
    form.quoteId !== "NONE";

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [projectsResponse, optionsResponse, sessionResponse] =
        await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/projects/options", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" })
        ]);

      const projectsData = (await projectsResponse.json()) as
        | ProjectDto[]
        | { error?: string };
      const optionsData = (await optionsResponse.json()) as
        | ProjectOptions
        | { error?: string };
      const sessionData = (await sessionResponse.json()) as
        | { user: SessionUser }
        | { error?: string };

      if (!projectsResponse.ok || !Array.isArray(projectsData)) {
        throw new Error(
          !Array.isArray(projectsData)
            ? projectsData.error ?? "No se pudieron cargar los proyectos."
            : "No se pudieron cargar los proyectos."
        );
      }

      if (
        !optionsResponse.ok ||
        !("responsibleUsers" in optionsData)
      ) {
        throw new Error("No se pudieron cargar las opciones operativas.");
      }

      if (!sessionResponse.ok || !("user" in sessionData)) {
        throw new Error("No se pudo leer la sesión actual.");
      }

      setProjects(projectsData);
      setOptions(optionsData);
      setSession(sessionData.user);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los proyectos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesQuery =
        normalized.length === 0 ||
        project.id.toLowerCase().includes(normalized) ||
        project.client.toLowerCase().includes(normalized) ||
        project.name.toLowerCase().includes(normalized) ||
        project.city.toLowerCase().includes(normalized) ||
        project.responsible.toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === "Todos" || project.status === statusFilter;
      const matchesRisk =
        riskFilter === "Todos" || project.risk === riskFilter;

      return matchesQuery && matchesStatus && matchesRisk;
    });
  }, [projects, query, riskFilter, statusFilter]);

  function openDetail(project: ProjectDto) {
    setSelectedProject(project);
    setDetailOpen(true);
  }

  function openCreate() {
    setEditingProject(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(project: ProjectDto) {
    setDetailOpen(false);
    setEditingProject(project);
    setForm(projectToForm(project));
    setFormError(null);
    setFormOpen(true);
  }

  function applyAcceptedQuote(quoteId: string) {
    if (quoteId === "NONE") {
      setForm((current) => ({
        ...current,
        quoteId: "NONE",
        leadCode: ""
      }));
      return;
    }

    const quote = options.acceptedQuotes.find((row) => row.id === quoteId);

    if (!quote) return;

    setForm((current) => ({
      ...current,
      quoteId: quote.id,
      leadCode: quote.leadCode,
      client: quote.client,
      city: quote.city,
      solutionType: quote.solutionType,
      name: quote.projectLocation
        ? `${quote.solutionType} - ${quote.projectLocation}`
        : `${quote.solutionType} - ${quote.city}`,
      status: "Aprobado",
      progress: Math.max(current.progress, 15),
      mainItemsText: quote.items.join("\n"),
      nextAction:
        "Asignar responsable operativo y confirmar plan de produccion e instalacion."
    }));
  }

  function updateStatus(status: ProjectStatus) {
    setForm((current) => ({
      ...current,
      status,
      progress: Math.max(
        current.progress,
        projectStatusProgress[status]
      )
    }));
  }

  async function saveProject() {
    if (!canEdit) return;

    setSaving(true);
    setFormError(null);

    try {
      const mainItems = form.mainItemsText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await fetch(
        editingProject
          ? `/api/projects/${encodeURIComponent(editingProject.id)}`
          : "/api/projects",
        {
          method: editingProject ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            editingProject
              ? {
                  name: form.name,
                  ...(!projectInherited
                    ? {
                        solutionType: form.solutionType,
                        city: form.city,
                        mainItems
                      }
                    : {}),
                  status: form.status,
                  responsible: form.responsible,
                  estimatedInstallation: form.estimatedInstallation,
                  progress: form.progress,
                  risk: form.risk,
                  evidenceCount: form.evidenceCount,
                  nextAction: form.nextAction
                }
              : {
                  ...(form.quoteId !== "NONE"
                    ? { quoteId: form.quoteId }
                    : {}),
                  ...(form.leadCode ? { leadCode: form.leadCode } : {}),
                  client: form.client,
                  name: form.name,
                  solutionType: form.solutionType,
                  city: form.city,
                  status: form.status,
                  responsible: form.responsible,
                  estimatedInstallation: form.estimatedInstallation,
                  progress: form.progress,
                  risk: form.risk,
                  evidenceCount: form.evidenceCount,
                  nextAction: form.nextAction,
                  mainItems
                }
          )
        }
      );

      const data = (await response.json()) as ProjectDto | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error ?? "No se pudo guardar el proyecto."
            : "No se pudo guardar el proyecto."
        );
      }

      setFormOpen(false);
      setEditingProject(null);
      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el proyecto."
      );
    } finally {
      setSaving(false);
    }
  }

  function openActivity(project: ProjectDto) {
    setSelectedProject(project);
    setActivityTitle("");
    setActivityNote("");
    setActivityOpen(true);
  }

  async function saveActivity() {
    if (!selectedProject || !canEdit) return;

    setActivitySaving(true);
    setFormError(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(selectedProject.id)}/activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: activityTitle,
            note: activityNote
          })
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo agregar la nota.");
      }

      setActivityOpen(false);
      await loadData();

      const refreshedResponse = await fetch("/api/projects", {
        cache: "no-store"
      });
      const refreshed = (await refreshedResponse.json()) as ProjectDto[];

      const current = refreshed.find(
        (project) => project.id === selectedProject.id
      );

      if (current) {
        setSelectedProject(current);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo agregar la nota."
      );
    } finally {
      setActivitySaving(false);
    }
  }

  const responsibleNames = useMemo(() => {
    const names = options.responsibleUsers.map((user) => user.name);

    if (form.responsible && !names.includes(form.responsible)) {
      names.push(form.responsible);
    }

    if (!names.includes("Sin asignar")) {
      names.unshift("Sin asignar");
    }

    return names;
  }, [form.responsible, options.responsibleUsers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-primary" aria-hidden="true" />
              Panel operativo de proyectos
            </CardTitle>
            <CardDescription className="mt-2">
              Crea, asigna y actualiza proyectos con trazabilidad de cambios.
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Actualizar
            </Button>

            {canEdit ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nuevo proyecto
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">Proyectos</p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {projects.length}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">En producción</p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {projects.filter((project) => project.status === "En produccion").length}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">En instalación</p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {
                projects.filter((project) =>
                  ["Programado para instalacion", "En instalacion"].includes(
                    project.status
                  )
                ).length
              }
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">Riesgo alto</p>
            <p className="mt-1 text-2xl font-bold text-brand-ink">
              {projects.filter((project) => project.risk === "Alto").length}
            </p>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Label htmlFor="project-search">Buscar</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="project-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder="Código, cliente, responsable o ciudad"
              />
            </div>
          </div>

          <div>
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-2" aria-label="Filtrar estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {projectStatusValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Riesgo</Label>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="mt-2" aria-label="Filtrar riesgo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {projectRiskValues.map((risk) => (
                  <SelectItem key={risk} value={risk}>
                    {risk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="tabla">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="tabla">Tabla</TabsTrigger>
            <TabsTrigger value="kanban" className="inline-flex items-center gap-1">
              <KanbanSquare className="h-4 w-4" aria-hidden="true" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendario" className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Instalaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabla">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Instalación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Avance</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No hay proyectos que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <p className="font-semibold text-brand-ink">{project.id}</p>
                          <p className="text-xs text-muted-foreground">{project.solutionType}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-brand-ink">{project.client}</p>
                          <p className="text-xs text-muted-foreground">{project.city}</p>
                        </TableCell>
                        <TableCell>{project.responsible}</TableCell>
                        <TableCell>{formatDate(project.estimatedInstallation)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(project.status)}>
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-28">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>Avance</span>
                              <span>{project.progress}%</span>
                            </div>
                            <div
                              className="h-2 rounded-full bg-secondary"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={project.progress}
                            >
                              <div
                                className="h-2 rounded-full bg-success"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={riskBadgeVariant(project.risk)}>
                            {project.risk}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openDetail(project)}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="kanban">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {projectStatusValues.map((status) => {
                const rows = filteredProjects.filter(
                  (project) => project.status === status
                );

                return (
                  <div key={status} className="rounded-2xl border bg-white p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-ink">
                        {status}
                      </p>
                      <Badge variant="secondary">{rows.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Sin proyectos.
                        </p>
                      ) : null}

                      {rows.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => openDetail(project)}
                          className="w-full rounded-xl border bg-brand-background p-3 text-left hover:border-primary"
                        >
                          <p className="text-xs font-semibold text-primary">
                            {project.id}
                          </p>
                          <p className="text-sm font-semibold text-brand-ink">
                            {project.client}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {project.responsible} · {project.progress}%
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="calendario">
            <div className="space-y-3">
              {filteredProjects
                .slice()
                .sort((a, b) =>
                  a.estimatedInstallation.localeCompare(b.estimatedInstallation)
                )
                .map((project) => (
                  <div
                    key={project.id}
                    className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_2fr_1fr_auto] md:items-center"
                  >
                    <p className="text-sm font-semibold text-primary">
                      {formatDate(project.estimatedInstallation)}
                    </p>
                    <div>
                      <p className="font-semibold text-brand-ink">
                        {project.client}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.id} · {project.name}
                      </p>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(project.status)}
                      className="w-fit"
                    >
                      {project.status}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(project)}
                    >
                      Detalle
                    </Button>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProject?.client}</DialogTitle>
            <DialogDescription>
              Expediente operativo, avance y trazabilidad del proyecto.
            </DialogDescription>
          </DialogHeader>

          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              canEdit={canEdit}
              onEdit={() => openEdit(selectedProject)}
              onActivity={() => openActivity(selectedProject)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject
                ? `Editar ${editingProject.id}`
                : "Nuevo proyecto"}
            </DialogTitle>
            <DialogDescription>
              Registra responsable, avance, fechas, riesgo y próximas acciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {!editingProject && options.acceptedQuotes.length > 0 ? (
              <div className="rounded-2xl border bg-brand-background p-4">
                <Label>Crear desde cotización aceptada pendiente</Label>
                <Select value={form.quoteId} onValueChange={applyAcceptedQuote}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="Selecciona cotización" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      Proyecto manual sin cotización
                    </SelectItem>
                    {options.acceptedQuotes.map((quote) => (
                      <SelectItem key={quote.id} value={quote.id}>
                        {quote.folio} · {quote.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {projectInherited ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-semibold text-brand-ink">
                  Datos heredados de la cotización
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cliente, ciudad, solución y partidas vienen de la cotización aceptada.
                  En Proyectos solo administra ejecución: responsable, fechas, estado,
                  avance, riesgo, evidencias y próxima acción.
                </p>
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2">

              <div>
                <Label htmlFor="project-client">Cliente</Label>
                <Input
                  id="project-client"
                  className="mt-2"
                  value={form.client}
                  disabled={Boolean(editingProject) || projectInherited}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      client: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="project-name">Nombre del proyecto</Label>
                <Input
                  id="project-name"
                  className="mt-2"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="project-solution">Solución</Label>
                <Input
                  id="project-solution"
                  className="mt-2"
                  disabled={projectInherited}
                  value={form.solutionType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      solutionType: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="project-city">Ciudad</Label>
                <Input
                  id="project-city"
                  className="mt-2"
                  disabled={projectInherited}
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <Label>Responsable</Label>
                <Select
                  value={form.responsible}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      responsible: value
                    }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {responsibleNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(value) => updateStatus(value as ProjectStatus)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-date">Instalación estimada</Label>
                <Input
                  id="project-date"
                  type="date"
                  className="mt-2"
                  value={form.estimatedInstallation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estimatedInstallation: event.target.value
                    }))
                  }
                />
              </div>

              <div>
                <Label>Riesgo</Label>
                <Select
                  value={form.risk}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      risk: value as ProjectRisk
                    }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectRiskValues.map((risk) => (
                      <SelectItem key={risk} value={risk}>
                        {risk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project-progress">Avance %</Label>
                <Input
                  id="project-progress"
                  type="number"
                  min={0}
                  max={100}
                  className="mt-2"
                  value={form.progress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      progress: Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0)
                      )
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="project-evidence">Número de evidencias</Label>
                <Input
                  id="project-evidence"
                  type="number"
                  min={0}
                  className="mt-2"
                  value={form.evidenceCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      evidenceCount: Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0)
                      )
                    }))
                  }
                />
              </div>
            </section>

            <div>
              <Label htmlFor="project-next-action">Próxima acción</Label>
              <Textarea
                id="project-next-action"
                className="mt-2"
                value={form.nextAction}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nextAction: event.target.value
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="project-items">
                Partidas principales · una por línea
              </Label>
              <Textarea
                id="project-items"
                className="mt-2 min-h-32"
                disabled={projectInherited}
                value={form.mainItemsText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    mainItemsText: event.target.value
                  }))
                }
                placeholder={"Piso podotáctil TPU\nSeñalización braille\nInstalación especializada"}
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
                !form.name.trim() ||
                !form.solutionType.trim() ||
                !form.city.trim() ||
                !form.responsible.trim() ||
                !form.estimatedInstallation ||
                !form.nextAction.trim()
              }
              onClick={() => void saveProject()}
            >
              {saving
                ? "Guardando..."
                : editingProject
                  ? "Guardar cambios"
                  : "Crear proyecto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar nota operativa</DialogTitle>
            <DialogDescription>
              La nota quedará en el historial del proyecto y en la auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-title">Título</Label>
              <Input
                id="activity-title"
                className="mt-2"
                value={activityTitle}
                onChange={(event) => setActivityTitle(event.target.value)}
                placeholder="Ej. Visita técnica realizada"
              />
            </div>

            <div>
              <Label htmlFor="activity-note">Detalle</Label>
              <Textarea
                id="activity-note"
                className="mt-2 min-h-28"
                value={activityNote}
                onChange={(event) => setActivityNote(event.target.value)}
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
              onClick={() => void saveActivity()}
            >
              {activitySaving ? "Guardando..." : "Agregar al historial"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
