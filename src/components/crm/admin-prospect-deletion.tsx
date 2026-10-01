"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Trash2
} from "lucide-react";
import {
  LeadDto
} from "@/modules/crm/contracts";
import {
  SessionUser
} from "@/lib/auth/types";
import {
  Badge
} from "@/components/ui/badge";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Input
} from "@/components/ui/input";
import {
  Label
} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type DeleteImpact = {
  contacts: number;
  quotes: number;
  quoteItems: number;
  projects: number;
  warranties: number;
  conversations: number;
  conversationSessions: number;
  conversationMessages: number;
  auditEventsPreserved: number;
};

type DeletePreview = {
  code: string;
  client: string;
  city: string;
  confirmationText: string;
  totalRecords: number;
  impact: DeleteImpact;
  auditPolicy: string;
};

export function AdminProspectDeletion({
  prospects,
  onDeleted
}: {
  prospects: LeadDto[];
  onDeleted: (
    code: string
  ) => void;
}) {
  const [
    session,
    setSession
  ] = useState<
    SessionUser | null
  >(null);
  const [
    sessionLoaded,
    setSessionLoaded
  ] = useState(false);
  const [
    dialogOpen,
    setDialogOpen
  ] = useState(false);
  const [
    selectedCode,
    setSelectedCode
  ] = useState("");
  const [
    preview,
    setPreview
  ] = useState<
    DeletePreview | null
  >(null);
  const [
    confirmation,
    setConfirmation
  ] = useState("");
  const [
    loadingPreview,
    setLoadingPreview
  ] = useState(false);
  const [
    deleting,
    setDeleting
  ] = useState(false);
  const [
    error,
    setError
  ] = useState<
    string | null
  >(null);
  const [
    success,
    setSuccess
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;

    fetch(
      "/api/auth/me",
      {
        cache:
          "no-store"
      }
    )
      .then(
        async (response) => {
          if (!response.ok) {
            return null;
          }

          const payload =
            (await response.json()) as {
              user:
                SessionUser;
            };

          return payload.user;
        }
      )
      .then((user) => {
        if (active) {
          setSession(
            user
          );
          setSessionLoaded(
            true
          );
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setSessionLoaded(
            true
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedProspect =
    useMemo(
      () =>
        prospects.find(
          (prospect) =>
            prospect.id ===
            selectedCode
        ) ?? null,
      [
        prospects,
        selectedCode
      ]
    );

  const isAdmin =
    session?.role ===
    "ADMIN";

  function resetDialog() {
    setSelectedCode("");
    setPreview(null);
    setConfirmation("");
    setError(null);
    setSuccess(null);
  }

  async function loadPreview(
    code: string
  ) {
    setSelectedCode(
      code
    );
    setPreview(null);
    setConfirmation("");
    setError(null);
    setSuccess(null);

    if (!code) {
      return;
    }

    setLoadingPreview(
      true
    );

    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            code
          )}/deletion-preview`,
          {
            cache:
              "no-store"
          }
        );

      const payload =
        (await response.json()) as
          | DeletePreview
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error ??
                "No se pudo calcular el impacto."
            : "No se pudo calcular el impacto."
        );
      }

      setPreview(
        payload as DeletePreview
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo calcular el impacto."
      );
    } finally {
      setLoadingPreview(
        false
      );
    }
  }

  async function deleteProspect() {
    if (
      !preview ||
      confirmation.trim() !==
        preview.confirmationText
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            preview.code
          )}`,
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                confirmation:
                  confirmation.trim()
              })
          }
        );

      const payload =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
          code?: string;
          client?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "No se pudo eliminar el prospecto."
        );
      }

      const deletedCode =
        payload.code ??
        preview.code;

      onDeleted(
        deletedCode
      );

      setSuccess(
        `${deletedCode} fue eliminado definitivamente en cascada.`
      );
      setPreview(null);
      setConfirmation("");
      setSelectedCode("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el prospecto."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (
    !sessionLoaded ||
    !isAdmin
  ) {
    return null;
  }

  return (
    <>
      <Card className="border-destructive/15 bg-destructive/[0.025]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/8 text-destructive">
              <ShieldAlert
                className="h-4 w-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-ink">
                  Zona de administrador
                </p>
                <Badge variant="destructive">
                  ADMIN
                </Badge>
              </div>

              <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground sm:text-sm">
                Elimina un prospecto y toda su cadena comercial y operativa relacionada. La accion es irreversible desde el CRM.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={
              prospects.length ===
              0
            }
            onClick={() => {
              resetDialog();
              setDialogOpen(
                true
              );
            }}
          >
            <Trash2
              className="mr-2 h-4 w-4"
              aria-hidden="true"
            />
            Eliminar prospecto
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={
          dialogOpen
        }
        onOpenChange={(
          open
        ) => {
          setDialogOpen(
            open
          );

          if (!open) {
            resetDialog();
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Eliminacion en cascada
            </DialogTitle>
            <DialogDescription>
              Esta herramienta solo esta disponible para administradores activos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />

                <div>
                  <p className="font-semibold text-destructive">
                    Eliminacion definitiva
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Se eliminaran las entidades relacionadas del flujo Prospecto → Cotizacion → Proyecto → Garantia. Los eventos de auditoria historicos se conservan sin referencias activas.
                  </p>
                </div>
              </div>
            </section>

            <div>
              <Label>
                Prospecto a eliminar
              </Label>

              <Select
                value={
                  selectedCode ||
                  undefined
                }
                onValueChange={(
                  value
                ) =>
                  void loadPreview(
                    value
                  )
                }
                disabled={
                  deleting
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un prospecto" />
                </SelectTrigger>

                <SelectContent>
                  {prospects.map(
                    (
                      prospect
                    ) => (
                      <SelectItem
                        key={
                          prospect.id
                        }
                        value={
                          prospect.id
                        }
                      >
                        {
                          prospect.id
                        }{" "}
                        ·{" "}
                        {
                          prospect.client
                        }
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {loadingPreview ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border p-6 text-sm text-muted-foreground">
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Calculando impacto real...
              </div>
            ) : null}

            {preview ? (
              <>
                <section className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Se eliminara
                  </p>

                  <p className="mt-2 text-lg font-bold text-brand-ink">
                    {preview.code} ·{" "}
                    {
                      preview.client
                    }
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {preview.city}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ImpactRow
                      label="Contactos"
                      value={
                        preview
                          .impact
                          .contacts
                      }
                    />
                    <ImpactRow
                      label="Cotizaciones"
                      value={
                        preview
                          .impact
                          .quotes
                      }
                    />
                    <ImpactRow
                      label="Partidas de cotizacion"
                      value={
                        preview
                          .impact
                          .quoteItems
                      }
                    />
                    <ImpactRow
                      label="Proyectos"
                      value={
                        preview
                          .impact
                          .projects
                      }
                    />
                    <ImpactRow
                      label="Garantias"
                      value={
                        preview
                          .impact
                          .warranties
                      }
                    />
                    <ImpactRow
                      label="Conversaciones"
                      value={
                        preview
                          .impact
                          .conversations
                      }
                    />
                    <ImpactRow
                      label="Sesiones de conversacion"
                      value={
                        preview
                          .impact
                          .conversationSessions
                      }
                    />
                    <ImpactRow
                      label="Mensajes"
                      value={
                        preview
                          .impact
                          .conversationMessages
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-brand-background p-3">
                    <p className="text-sm font-semibold text-brand-ink">
                      {
                        preview.totalRecords
                      }{" "}
                      registros operativos se eliminaran.
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        preview
                          .impact
                          .auditEventsPreserved
                      }{" "}
                      eventos de auditoria relacionados se conservaran.
                    </p>
                  </div>
                </section>

                <div>
                  <Label htmlFor="lead-delete-confirmation">
                    Para confirmar escribe exactamente:
                  </Label>

                  <code className="mt-2 block rounded-xl border bg-brand-background px-3 py-2 text-sm font-semibold text-destructive">
                    {
                      preview.confirmationText
                    }
                  </code>

                  <Input
                    id="lead-delete-confirmation"
                    className="mt-2"
                    value={
                      confirmation
                    }
                    disabled={
                      deleting
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmation(
                        event.target.value
                      )
                    }
                    placeholder={
                      preview.confirmationText
                    }
                    autoComplete="off"
                  />
                </div>
              </>
            ) : null}

            {selectedProspect &&
            !preview &&
            !loadingPreview ? (
              <p className="text-sm text-muted-foreground">
                Seleccionado:{" "}
                {
                  selectedProspect.client
                }
              </p>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-[#2a8026]">
                {success}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={
                  deleting
                }
                onClick={() =>
                  setDialogOpen(
                    false
                  )
                }
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={
                  deleting ||
                  !preview ||
                  confirmation.trim() !==
                    preview.confirmationText
                }
                onClick={() =>
                  void deleteProspect()
                }
              >
                {deleting ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2
                    className="mr-2 h-4 w-4"
                    aria-hidden="true"
                  />
                )}

                Eliminar definitivamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImpactRow({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-brand-background px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <Badge variant="secondary">
        {value}
      </Badge>
    </div>
  );
}
