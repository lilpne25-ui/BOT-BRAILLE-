"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  UserCheck
} from "lucide-react";
import {
  LeadDto,
  SalesUserDto,
  leadActivityTypeValues,
  leadSourceValues,
  leadStatusValues
} from "@/modules/crm/contracts";
import {
  formatCurrency,
  formatDate
} from "@/lib/utils";
import { ProspectStatusBadge } from "@/components/crm/prospect-status-badge";
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

const statusOptions = [
  "Todos",
  ...leadStatusValues
] as const;

const NO_OWNER = "__none__";

type LeadFormState = {
  client: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  status: LeadDto["status"];
  source: LeadDto["source"];
  ownerId: string;
  estimatedValue: string;
  nextAction: string;
  nextActionDate: string;
  painPoint: string;
  internalNotes: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function emptyLeadForm(): LeadFormState {
  return {
    client: "",
    contact: "",
    email: "",
    phone: "",
    city: "",
    projectType: "",
    status: "Nuevo",
    source: "Llamada",
    ownerId: NO_OWNER,
    estimatedValue: "0",
    nextAction: "Dar seguimiento",
    nextActionDate: todayIsoDate(),
    painPoint: "Por definir",
    internalNotes: "Captura manual desde CRM"
  };
}

function leadToForm(prospect: LeadDto): LeadFormState {
  return {
    client: prospect.client,
    contact: prospect.contact,
    email: prospect.email,
    phone: prospect.phone,
    city: prospect.city,
    projectType: prospect.projectType,
    status: prospect.status,
    source: prospect.source,
    ownerId: prospect.ownerId ?? NO_OWNER,
    estimatedValue: String(prospect.estimatedValue),
    nextAction: prospect.nextAction,
    nextActionDate: prospect.nextActionDate,
    painPoint: prospect.painPoint,
    internalNotes: prospect.internalNotes
  };
}

function buildLeadPayload(form: LeadFormState) {
  return {
    client: form.client.trim(),
    contact: form.contact.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
    projectType: form.projectType.trim(),
    status: form.status,
    source: form.source,
    ownerId:
      form.ownerId === NO_OWNER
        ? null
        : form.ownerId,
    estimatedValue:
      Number(form.estimatedValue) || 0,
    nextAction: form.nextAction.trim(),
    nextActionDate: form.nextActionDate,
    painPoint: form.painPoint.trim(),
    internalNotes: form.internalNotes.trim()
  };
}

function LeadForm({
  form,
  users,
  busy,
  error,
  submitLabel,
  onChange,
  onSubmit,
  onCancel
}: {
  form: LeadFormState;
  users: SalesUserDto[];
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onChange: (next: LeadFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  function update<K extends keyof LeadFormState>(
    key: K,
    value: LeadFormState[K]
  ) {
    onChange({
      ...form,
      [key]: value
    });
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-client">Empresa / cliente</Label>
          <Input
            id="lead-client"
            className="mt-2"
            value={form.client}
            onChange={(event) =>
              update("client", event.target.value)
            }
            placeholder="Nombre de la empresa"
          />
        </div>
        <div>
          <Label htmlFor="lead-contact">Contacto principal</Label>
          <Input
            id="lead-contact"
            className="mt-2"
            value={form.contact}
            onChange={(event) =>
              update("contact", event.target.value)
            }
            placeholder="Nombre del contacto"
          />
        </div>
        <div>
          <Label htmlFor="lead-email">Correo</Label>
          <Input
            id="lead-email"
            className="mt-2"
            type="email"
            value={form.email}
            onChange={(event) =>
              update("email", event.target.value)
            }
            placeholder="correo@empresa.com"
          />
        </div>
        <div>
          <Label htmlFor="lead-phone">Teléfono</Label>
          <Input
            id="lead-phone"
            className="mt-2"
            value={form.phone}
            onChange={(event) =>
              update("phone", event.target.value)
            }
            placeholder="+52..."
          />
        </div>
        <div>
          <Label htmlFor="lead-city">Ciudad</Label>
          <Input
            id="lead-city"
            className="mt-2"
            value={form.city}
            onChange={(event) =>
              update("city", event.target.value)
            }
            placeholder="Ciudad / estado"
          />
        </div>
        <div>
          <Label htmlFor="lead-project">Tipo de proyecto</Label>
          <Input
            id="lead-project"
            className="mt-2"
            value={form.projectType}
            onChange={(event) =>
              update("projectType", event.target.value)
            }
            placeholder="Señalización, braille, accesibilidad..."
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Estado</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              update(
                "status",
                value as LeadDto["status"]
              )
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Origen</Label>
          <Select
            value={form.source}
            onValueChange={(value) =>
              update(
                "source",
                value as LeadDto["source"]
              )
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadSourceValues.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsable</Label>
          <Select
            value={form.ownerId}
            onValueChange={(value) =>
              update("ownerId", value)
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OWNER}>
                Sin asignar
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="lead-value">Valor estimado MXN</Label>
          <Input
            id="lead-value"
            className="mt-2"
            type="number"
            min="0"
            step="0.01"
            value={form.estimatedValue}
            onChange={(event) =>
              update("estimatedValue", event.target.value)
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-next-action">Próxima acción</Label>
          <Input
            id="lead-next-action"
            className="mt-2"
            value={form.nextAction}
            onChange={(event) =>
              update("nextAction", event.target.value)
            }
            placeholder="Llamar, visitar, enviar información..."
          />
        </div>
        <div>
          <Label htmlFor="lead-next-date">Fecha objetivo</Label>
          <Input
            id="lead-next-date"
            className="mt-2"
            type="date"
            value={form.nextActionDate}
            onChange={(event) =>
              update("nextActionDate", event.target.value)
            }
          />
        </div>
      </section>

      <div>
        <Label htmlFor="lead-pain">Necesidad detectada</Label>
        <Textarea
          id="lead-pain"
          className="mt-2"
          value={form.painPoint}
          onChange={(event) =>
            update("painPoint", event.target.value)
          }
          placeholder="Qué necesita resolver el cliente"
        />
      </div>

      <div>
        <Label htmlFor="lead-notes">Notas internas</Label>
        <Textarea
          id="lead-notes"
          className="mt-2"
          value={form.internalNotes}
          onChange={(event) =>
            update("internalNotes", event.target.value)
          }
          placeholder="Información interna para el equipo comercial"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={onSubmit}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function ProspectDetail({
  prospect,
  busy,
  onEdit,
  onStatusChange,
  onAddActivity
}: {
  prospect: LeadDto;
  busy: boolean;
  onEdit: () => void;
  onStatusChange: (
    status: LeadDto["status"]
  ) => void;
  onAddActivity: (
    type: (typeof leadActivityTypeValues)[number],
    note: string
  ) => Promise<boolean>;
}) {
  const [activityType, setActivityType] = useState<
    (typeof leadActivityTypeValues)[number]
  >("Nota interna");
  const [activityNote, setActivityNote] = useState("");

  const quoteHref = `/cotizador?leadCode=${encodeURIComponent(
    prospect.id
  )}&client=${encodeURIComponent(
    prospect.client
  )}&contact=${encodeURIComponent(
    prospect.contact
  )}&email=${encodeURIComponent(
    prospect.email
  )}&phone=${encodeURIComponent(
    prospect.phone
  )}&city=${encodeURIComponent(
    prospect.city
  )}&projectType=${encodeURIComponent(
    prospect.projectType
  )}`;

  const pendingHumanReview =
    prospect.status === "Pendiente de revision humana";

  async function addActivity() {
    if (!activityNote.trim()) return;
    const saved = await onAddActivity(
      activityType,
      activityNote.trim()
    );
    if (saved) {
      setActivityNote("");
    }
  }

  return (
    <div className="space-y-5">
      {pendingHumanReview ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <UserCheck
              className="mt-0.5 h-5 w-5 text-amber-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-amber-900">
                Expediente pendiente de revisión humana
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Verifica los requisitos capturados antes de preparar o enviar una cotización.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ProspectStatusBadge status={prospect.status} />
          <Badge variant="outline">{prospect.source}</Badge>
          <Badge variant="secondary">{prospect.owner}</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar expediente
        </Button>
      </div>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cliente
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {prospect.client}
          </p>
          <p className="text-sm text-muted-foreground">
            {prospect.city}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contacto
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {prospect.contact}
          </p>
          <p className="text-sm text-muted-foreground">
            {prospect.phone}
          </p>
          <p className="text-sm text-muted-foreground">
            {prospect.email}
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Necesidad detectada
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {prospect.painPoint}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tipo de proyecto
          </p>
          <p className="mt-1 text-sm font-medium text-brand-ink">
            {prospect.projectType}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Valor estimado
          </p>
          <p className="mt-1 text-sm font-medium text-brand-ink">
            {prospect.estimatedValue > 0
              ? formatCurrency(prospect.estimatedValue)
              : "Por determinar"}
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Próxima acción
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {prospect.nextAction}
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-ink">
            Fecha objetivo: {formatDate(prospect.nextActionDate)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Notas internas
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {prospect.internalNotes}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-brand-background p-4">
        <p className="text-sm font-semibold text-brand-ink">
          Registrar seguimiento
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <div>
            <Label>Tipo</Label>
            <Select
              value={activityType}
              onValueChange={(value) =>
                setActivityType(
                  value as (typeof leadActivityTypeValues)[number]
                )
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadActivityTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="activity-note">Nota</Label>
            <Input
              id="activity-note"
              className="mt-2"
              value={activityNote}
              onChange={(event) =>
                setActivityNote(event.target.value)
              }
              placeholder="Ej. Cliente pidió llamada el viernes"
            />
          </div>
          <Button
            type="button"
            disabled={busy || !activityNote.trim()}
            onClick={addActivity}
          >
            Registrar
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Historial de actividad
        </p>
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {prospect.activities.length > 0 ? (
            prospect.activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border bg-brand-background p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {activity.type}
                  </Badge>
                  <span>{formatDate(activity.date)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activity.note}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay actividad registrada.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-72">
          <Label>Actualizar estado</Label>
          <Select
            value={prospect.status}
            disabled={busy}
            onValueChange={(value) =>
              onStatusChange(value as LeadDto["status"])
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button asChild>
          <Link href={quoteHref}>Preparar cotización</Link>
        </Button>
      </div>
    </div>
  );
}

export function ProspectsTable({
  baseProspects,
  onProspectsChange
}: {
  baseProspects: LeadDto[];
  onProspectsChange?: (rows: LeadDto[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusOptions)[number]>("Todos");
  const [projectFilter, setProjectFilter] = useState("Todos");
  const [ownerFilter, setOwnerFilter] = useState("Todos");
  const [prospects, setProspects] = useState<LeadDto[]>(baseProspects);
  const [users, setUsers] = useState<SalesUserDto[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"detail" | "create" | "edit">("detail");
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setProspects(baseProspects);
  }, [baseProspects]);

  useEffect(() => {
    fetch("/api/users")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load users");
        return response.json();
      })
      .then((rows: SalesUserDto[]) => setUsers(rows))
      .catch(() => setUsers([]));
  }, []);

  const selectedProspect =
    prospects.find((prospect) => prospect.id === selectedProspectId) ?? null;

  async function refreshProspects() {
    const response = await fetch("/api/leads", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("No se pudieron actualizar los prospectos.");
    }

    const rows = (await response.json()) as LeadDto[];
    setProspects(rows);
    onProspectsChange?.(rows);
    return rows;
  }

  async function readError(response: Response) {
    const payload = await response.json().catch(() => null) as
      | { error?: string }
      | null;
    return payload?.error ?? "No se pudo guardar el prospecto.";
  }

  async function handleStatusChange(status: LeadDto["status"]) {
    if (!selectedProspect) return;
    setBusy(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/leads/${selectedProspect.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await refreshProspects();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAddActivity(
    type: (typeof leadActivityTypeValues)[number],
    note: string
  ) {
    if (!selectedProspect) return false;
    setBusy(true);
    setFormError(null);

    try {
      const response = await fetch(
        `/api/leads/${selectedProspect.id}/activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ type, note })
        }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await refreshProspects();
      return true;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el seguimiento."
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveLead() {
    const payload = buildLeadPayload(form);

    if (
      !payload.client ||
      !payload.contact ||
      !payload.email ||
      !payload.phone ||
      !payload.city ||
      !payload.projectType ||
      !payload.nextAction ||
      !payload.nextActionDate ||
      !payload.painPoint ||
      !payload.internalNotes
    ) {
      setFormError("Completa todos los campos requeridos del expediente.");
      return;
    }

    setBusy(true);
    setFormError(null);

    try {
      const editing = dialogMode === "edit" && selectedProspect;
      const response = await fetch(
        editing
          ? `/api/leads/${selectedProspect.id}`
          : "/api/leads",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as { id?: string };
      const id = editing ? selectedProspect.id : result.id;
      await refreshProspects();

      if (id) {
        setSelectedProspectId(id);
        setDialogMode("detail");
      } else {
        setDialogOpen(false);
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el prospecto."
      );
    } finally {
      setBusy(false);
    }
  }

  const projectTypes = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(prospects.map((prospect) => prospect.projectType)))
    ],
    [prospects]
  );

  const owners = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(prospects.map((prospect) => prospect.owner)))
    ],
    [prospects]
  );

  const filteredProspects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return prospects.filter((prospect) => {
      const matchesQuery =
        query.length === 0 ||
        prospect.client.toLowerCase().includes(query) ||
        prospect.contact.toLowerCase().includes(query) ||
        prospect.email.toLowerCase().includes(query) ||
        prospect.phone.toLowerCase().includes(query) ||
        prospect.city.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "Todos" || prospect.status === statusFilter;
      const matchesProject =
        projectFilter === "Todos" || prospect.projectType === projectFilter;
      const matchesOwner =
        ownerFilter === "Todos" || prospect.owner === ownerFilter;

      return matchesQuery && matchesStatus && matchesProject && matchesOwner;
    });
  }, [prospects, search, statusFilter, projectFilter, ownerFilter]);

  function openDetail(prospect: LeadDto) {
    setSelectedProspectId(prospect.id);
    setDialogMode("detail");
    setFormError(null);
    setDialogOpen(true);
  }

  function openCreate() {
    setSelectedProspectId(null);
    setForm(emptyLeadForm());
    setDialogMode("create");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit() {
    if (!selectedProspect) return;
    setForm(leadToForm(selectedProspect));
    setDialogMode("edit");
    setFormError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM de prospectos</CardTitle>
        <CardDescription>
          Crea prospectos manualmente, asigna responsables, registra seguimiento y prepara cotizaciones desde un expediente único.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <Label htmlFor="prospect-search">Buscar</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="prospect-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder="Empresa, contacto, correo, teléfono o ciudad"
              />
            </div>
          </div>

          <div>
            <Label>Estado</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as (typeof statusOptions)[number])
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de proyecto</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Responsable</Label>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-brand-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredProspects.length} prospectos encontrados.
          </p>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo prospecto
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo de proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Valor estimado</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead>Próxima acción</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-semibold text-brand-ink">
                    {prospect.client}
                  </TableCell>
                  <TableCell>{prospect.city}</TableCell>
                  <TableCell>
                    <div className="font-medium">{prospect.contact}</div>
                    <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {prospect.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {prospect.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{prospect.projectType}</TableCell>
                  <TableCell>
                    <ProspectStatusBadge status={prospect.status} />
                  </TableCell>
                  <TableCell>
                    {prospect.estimatedValue > 0
                      ? formatCurrency(prospect.estimatedValue)
                      : "Por determinar"}
                  </TableCell>
                  <TableCell>{formatDate(prospect.lastActivity)}</TableCell>
                  <TableCell className="min-w-56">{prospect.nextAction}</TableCell>
                  <TableCell>{prospect.owner}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDetail(prospect)}
                    >
                      Ver detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Nuevo prospecto"
                : dialogMode === "edit"
                  ? `Editar ${selectedProspect?.client ?? "prospecto"}`
                  : selectedProspect?.client}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "detail"
                ? "Expediente comercial, seguimiento y preparación de cotización."
                : "Los cambios quedan guardados en la base del CRM y se registran en el historial."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "create" || dialogMode === "edit" ? (
            <LeadForm
              form={form}
              users={users}
              busy={busy}
              error={formError}
              submitLabel={
                dialogMode === "create"
                  ? "Crear prospecto"
                  : "Guardar cambios"
              }
              onChange={setForm}
              onSubmit={saveLead}
              onCancel={() => {
                if (dialogMode === "edit" && selectedProspect) {
                  setDialogMode("detail");
                } else {
                  setDialogOpen(false);
                }
                setFormError(null);
              }}
            />
          ) : selectedProspect ? (
            <>
              {formError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <ProspectDetail
                prospect={selectedProspect}
                busy={busy}
                onEdit={openEdit}
                onStatusChange={handleStatusChange}
                onAddActivity={handleAddActivity}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
