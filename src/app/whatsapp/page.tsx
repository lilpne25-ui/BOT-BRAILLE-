"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Activity,
  Bug,
  CheckCircle2,
  MessageCircle,
  QrCode,
  Radio,
  Terminal,
  TriangleAlert,
  UserRoundCheck
} from "lucide-react";
import {
  PageShell
} from "@/components/layout/page-shell";
import {
  Badge
} from "@/components/ui/badge";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type InboxRow = {
  id: string;
  phone: string;
  name: string;
  status:
    | "Capturando datos"
    | "Requiere vendedor"
    | "Cotizacion preliminar creada"
    | "Error de envio"
    | "Atendido por vendedor";
  updatedAt: string;
  lastMessage: string;
  lastError:
    | string
    | null;
  folio:
    | string
    | null;
};

type BaileysStatus = {
  status:
    | "disconnected"
    | "connecting"
    | "qr_pending"
    | "connected"
    | "error";
  qrDataUrl:
    | string
    | null;
  qr?:
    | string
    | null;
  hasQr: boolean;
  connected: boolean;
  lastError:
    | string
    | null;
  diagnostics?: {
    pid: number;
    connectAttempts: number;
    qrGenerations: number;
    credsUpdateCount: number;
    reconnectAttempt: number;
    lastDisconnectCode:
      | number
      | null;
    lastDisconnectReason:
      | string
      | null;
    authDir: string;
    authDirExists: boolean;
    authFiles: string[];
  };
};

type BaileysLogEntry = {
  at: string;
  level:
    | "info"
    | "warn"
    | "error";
  event: string;
  pid?: number;
  details?: Record<
    string,
    unknown
  >;
};

function statusVariant(
  status:
    InboxRow["status"]
) {
  if (
    status ===
    "Cotizacion preliminar creada"
  ) {
    return "success";
  }

  if (
    status ===
    "Atendido por vendedor"
  ) {
    return "secondary";
  }

  if (
    status ===
    "Requiere vendedor"
  ) {
    return "warning";
  }

  if (
    status ===
    "Error de envio"
  ) {
    return "destructive";
  }

  return "default";
}

function connectionCopy(
  status:
    BaileysStatus["status"]
) {
  switch (status) {
    case "connected":
      return {
        label:
          "Conectado",
        detail:
          "La sesión web está enlazada.",
        variant:
          "success" as const
      };
    case "connecting":
      return {
        label:
          "Conectando",
        detail:
          "Preparando la sesión...",
        variant:
          "warning" as const
      };
    case "qr_pending":
      return {
        label:
          "Esperando QR",
        detail:
          "Escanea el código para continuar.",
        variant:
          "warning" as const
      };
    case "error":
      return {
        label:
          "Error",
        detail:
          "Revisa el diagnóstico técnico.",
        variant:
          "destructive" as const
      };
    default:
      return {
        label:
          "Desconectado",
        detail:
          "No hay una sesión web activa.",
        variant:
          "secondary" as const
      };
  }
}

export default function WhatsAppInboxPage() {
  const [
    rows,
    setRows
  ] =
    useState<
      InboxRow[]
    >([]);
  const [
    baileys,
    setBaileys
  ] =
    useState<BaileysStatus>({
      status:
        "disconnected",
      qrDataUrl: null,
      hasQr: false,
      connected: false,
      lastError: null
    });
  const [
    actionLoading,
    setActionLoading
  ] =
    useState(false);
  const [
    qrTick,
    setQrTick
  ] =
    useState(0);
  const [
    logs,
    setLogs
  ] =
    useState<
      BaileysLogEntry[]
    >([]);

  const runInbox =
    useCallback(() => {
      fetch(
        "/api/whatsapp/inbox"
      )
        .then(
          (
            response
          ) =>
            response.json()
        )
        .then(
          (
            data:
              InboxRow[]
          ) =>
            setRows(
              data
            )
        )
        .catch(
          () =>
            setRows(
              []
            )
        );
    }, []);

  const markAttended =
    useCallback(
      async (
        sessionId:
          string
      ) => {
        await fetch(
          `/api/whatsapp/inbox/${sessionId}`,
          {
            method:
              "PATCH"
          }
        );

        runInbox();
      },
      [
        runInbox
      ]
    );

  useEffect(() => {
    let mounted =
      true;

    const runBaileys =
      () => {
        fetch(
          "/api/whatsapp/baileys/status"
        )
          .then(
            (
              response
            ) =>
              response.json()
          )
          .then(
            (
              data:
                BaileysStatus
            ) => {
              if (
                mounted
              ) {
                setBaileys(
                  data
                );
              }
            }
          )
          .catch(
            () => {
              if (
                mounted
              ) {
                setBaileys(
                  (
                    current
                  ) => ({
                    ...current,
                    status:
                      "error",
                    lastError:
                      "No se pudo consultar estado de Baileys."
                  })
                );
              }
            }
          );
      };

    const runBaileysLogs =
      () => {
        fetch(
          "/api/whatsapp/baileys/logs?limit=200"
        )
          .then(
            (
              response
            ) =>
              response.json()
          )
          .then(
            (
              data: {
                count:
                  number;
                rows:
                  BaileysLogEntry[];
              }
            ) => {
              if (
                mounted
              ) {
                setLogs(
                  Array.isArray(
                    data?.rows
                  )
                    ? data.rows
                    : []
                );
              }
            }
          )
          .catch(
            () => {
              if (
                mounted
              ) {
                setLogs(
                  []
                );
              }
            }
          );
      };

    runInbox();
    runBaileys();
    runBaileysLogs();

    const inboxTimer =
      setInterval(
        runInbox,
        7000
      );
    const baileysTimer =
      setInterval(
        runBaileys,
        3000
      );
    const logsTimer =
      setInterval(
        runBaileysLogs,
        3000
      );

    return () => {
      mounted =
        false;
      clearInterval(
        inboxTimer
      );
      clearInterval(
        baileysTimer
      );
      clearInterval(
        logsTimer
      );
    };
  }, [
    runInbox
  ]);

  useEffect(() => {
    if (
      baileys.hasQr
    ) {
      setQrTick(
        Date.now()
      );
    }
  }, [
    baileys.hasQr,
    baileys.qr
  ]);

  const metrics =
    useMemo(
      () => ({
        capturing:
          rows.filter(
            (row) =>
              row.status ===
              "Capturando datos"
          ).length,
        requiresSales:
          rows.filter(
            (row) =>
              row.status ===
              "Requiere vendedor"
          ).length,
        quoteCreated:
          rows.filter(
            (row) =>
              row.status ===
              "Cotizacion preliminar creada"
          ).length,
        sendError:
          rows.filter(
            (row) =>
              row.status ===
              "Error de envio"
          ).length
      }),
      [
        rows
      ]
    );

  const connection =
    connectionCopy(
      baileys.status
    );

  const connectBaileys =
    async () => {
      setActionLoading(
        true
      );

      try {
        await fetch(
          "/api/whatsapp/baileys/reset",
          {
            method:
              "POST"
          }
        );

        await fetch(
          "/api/whatsapp/baileys/connect",
          {
            method:
              "POST"
          }
        );

        setQrTick(
          Date.now()
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const disconnectBaileys =
    async () => {
      setActionLoading(
        true
      );

      try {
        await fetch(
          "/api/whatsapp/baileys/disconnect",
          {
            method:
              "POST"
          }
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const resetBaileys =
    async () => {
      setActionLoading(
        true
      );

      try {
        await fetch(
          "/api/whatsapp/baileys/reset",
          {
            method:
              "POST"
          }
        );

        setQrTick(
          Date.now()
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const clearLogs =
    async () => {
      await fetch(
        "/api/whatsapp/baileys/logs",
        {
          method:
            "DELETE"
        }
      );
    };

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Canal operativo</p>
              <h1 className="ui-page-title">WhatsApp</h1>
              <p className="ui-page-description">
                Seguimiento de conversaciones, intervención comercial y estado técnico del canal.
              </p>
            </div>

            <div className="ui-page-actions">
              <Badge
                variant={connection.variant}
                className="w-fit px-3 py-2"
              >
                <span
                  className={`mr-2 h-2 w-2 rounded-full ${
                    baileys.connected ? "ui-live-dot bg-emerald-500" : "bg-current opacity-60"
                  }`}
                  aria-hidden="true"
                />
                {connection.label}
              </Badge>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Capturando datos
                </p>
                <p className="mt-1 text-2xl font-black text-brand-ink">
                  {
                    metrics.capturing
                  }
                </p>
              </div>

              <Activity
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Requiere vendedor
                </p>
                <p className="mt-1 text-2xl font-black text-amber-700">
                  {
                    metrics.requiresSales
                  }
                </p>
              </div>

              <UserRoundCheck
                className="h-5 w-5 text-amber-600"
                aria-hidden="true"
              />
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Preliminares
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {
                    metrics.quoteCreated
                  }
                </p>
              </div>

              <CheckCircle2
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Errores de envío
                </p>
                <p className="mt-1 text-2xl font-black text-destructive">
                  {
                    metrics.sendError
                  }
                </p>
              </div>

              <TriangleAlert
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
            </CardContent>
          </Card>
        </section>

        <section className="ui-content-grid">
          <div className="space-y-6 min-w-0">
            <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
              <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/80 bg-brand-background/45">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="inline-flex items-center gap-2">
                    <Radio
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    Estado del canal
                  </CardTitle>

                  <CardDescription className="mt-2">
                    {connection.detail} La conexión Baileys se conserva únicamente como entorno técnico/piloto.
                  </CardDescription>
                </div>

                <Badge
                  variant={
                    connection.variant
                  }
                >
                  {
                    connection.label
                  }
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    void connectBaileys()
                  }
                  disabled={
                    actionLoading ||
                    baileys.status ===
                      "connecting"
                  }
                >
                  <QrCode
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Conectar con QR
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void disconnectBaileys()
                  }
                  disabled={
                    actionLoading ||
                    baileys.status ===
                      "disconnected"
                  }
                >
                  Desconectar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void resetBaileys()
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Reiniciar sesión
                </Button>
              </div>

              {baileys.qrDataUrl ? (
                <div className="mx-auto w-fit rounded-3xl border bg-white p-4 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/whatsapp/baileys/qr-image?t=${qrTick}`}
                    alt="QR de conexión de WhatsApp Web"
                    className="h-[260px] w-[260px] rounded-2xl border object-contain"
                  />
                  <p className="mt-3 max-w-[260px] text-center text-xs leading-5 text-muted-foreground">
                    Abre WhatsApp en tu celular y escanea este código.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-gradient-to-b from-primary/[0.035] to-brand-background/55 p-6 text-center">
                  <QrCode
                    className="mx-auto h-7 w-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-semibold text-brand-ink">
                    Sin QR activo
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usa “Conectar con QR” para iniciar una sesión de prueba.
                  </p>
                </div>
              )}

              {baileys.lastError ? (
                <div
                  className="ui-danger rounded-2xl p-4 text-sm"
                  role="alert"
                >
                  {
                    baileys.lastError
                  }
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/80 bg-brand-background/45">
              <CardTitle className="inline-flex items-center gap-2">
                <MessageCircle
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                Conversaciones
              </CardTitle>

              <CardDescription>
                Se actualizan automáticamente cada 7 segundos.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-6">
              {rows.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-brand-background/35 p-8 text-center">
                  <MessageCircle
                    className="mx-auto h-7 w-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold text-brand-ink">
                    Sin conversaciones
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Los nuevos contactos aparecerán aquí cuando el canal reciba actividad.
                  </p>
                </div>
              ) : null}

              {rows.map(
                (row) => (
                  <article
                    key={
                      row.id
                    }
                    className="ui-surface-hover rounded-2xl border bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-ink">
                          {
                            row.name
                          }
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {
                            row.phone
                          }
                        </p>
                      </div>

                      <Badge
                        variant={
                          statusVariant(
                            row.status
                          )
                        }
                      >
                        {
                          row.status
                        }
                      </Badge>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {
                        row.lastMessage
                      }
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">
                        {new Date(
                          row.updatedAt
                        ).toLocaleString(
                          "es-MX"
                        )}
                      </Badge>

                      {row.folio ? (
                        <Badge variant="outline">
                          Folio:{" "}
                          {
                            row.folio
                          }
                        </Badge>
                      ) : null}

                      {row.lastError ? (
                        <span className="text-destructive">
                          Error:{" "}
                          {
                            row.lastError
                          }
                        </span>
                      ) : null}

                      {row.status ===
                      "Requiere vendedor" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() =>
                            void markAttended(
                              row.id
                            )
                          }
                        >
                          Marcar atendido
                        </Button>
                      ) : null}
                    </div>
                  </article>
                )
              )}
            </CardContent>
          </Card>
            </section>

            <details className="group rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
            <div>
              <p className="inline-flex items-center gap-2 font-bold text-brand-ink">
                <Bug
                  className="h-4 w-4 text-accent"
                  aria-hidden="true"
                />
                Diagnóstico técnico
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Runtime, autenticación local y logs de Baileys. Úsalo para soporte, no para operación diaria.
              </p>
            </div>

            <Badge variant="secondary">
              {
                logs.length
              }{" "}
              logs
            </Badge>
          </summary>

          <div className="border-t border-border/80 p-5">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Diagnostic
                label="Intentos"
                value={
                  baileys.diagnostics
                    ?.connectAttempts ??
                  0
                }
              />
              <Diagnostic
                label="QR generados"
                value={
                  baileys.diagnostics
                    ?.qrGenerations ??
                  0
                }
              />
              <Diagnostic
                label="Cred updates"
                value={
                  baileys.diagnostics
                    ?.credsUpdateCount ??
                  0
                }
              />
              <Diagnostic
                label="PID"
                value={
                  baileys.diagnostics
                    ?.pid ??
                  "n/a"
                }
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-ink">
                  <Terminal
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Logs Baileys
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Último código:{" "}
                  {baileys.diagnostics
                    ?.lastDisconnectCode ??
                    "n/a"}{" "}
                  · Razón:{" "}
                  {baileys.diagnostics
                    ?.lastDisconnectReason ??
                    "n/a"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void clearLogs()
                }
              >
                Limpiar logs
              </Button>
            </div>

            <div className="ui-scrollbar max-h-80 overflow-auto rounded-2xl border bg-[#101725] p-4 font-mono text-[11px] leading-5 text-slate-100">
              {logs.length ===
              0 ? (
                <p>
                  Sin logs todavía...
                </p>
              ) : null}

              {logs.map(
                (
                  log,
                  index
                ) => (
                  <p
                    key={`${log.at}-${index}`}
                    className={
                      log.level ===
                      "error"
                        ? "text-red-300"
                        : log.level ===
                            "warn"
                          ? "text-amber-300"
                          : "text-slate-100"
                    }
                  >
                    [
                    {new Date(
                      log.at
                    ).toLocaleTimeString(
                      "es-MX"
                    )}
                    ] PID:
                    {log.pid ??
                      "?"}{" "}
                    {log.level.toUpperCase()}{" "}
                    {
                      log.event
                    }
                    {log.details
                      ? ` ${JSON.stringify(
                          log.details
                        )}`
                      : ""}
                  </p>
                )
              )}
            </div>

            <p className="mt-3 break-all text-xs text-muted-foreground">
              Auth dir:{" "}
              {baileys.diagnostics
                ?.authDirExists
                ? "ok"
                : "faltante"}{" "}
              (
              {baileys.diagnostics
                ?.authDir ??
                "n/a"}
              )
            </p>
          </div>
            </details>
          </div>

          <aside className="ui-sticky-aside space-y-4">
            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Ruta de atención</CardTitle>
                <CardDescription>Guía rápida para la operación del canal.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="ui-aside-list">
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Conecta QR solo para pruebas o piloto técnico controlado.</p></li>
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Cuando una conversación marque “Requiere vendedor”, transfiérela y confirma seguimiento.</p></li>
                  <li><span className="ui-aside-dot" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">Usa el diagnóstico únicamente para soporte; evita mezclarlo con operación diaria.</p></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Resumen del canal</CardTitle>
                <CardDescription>Indicadores derivados del estado actual del módulo.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="ui-info-tile">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Estado</p>
                    <p className="mt-2 font-semibold text-brand-ink">{connection.label}</p>
                  </div>
                  <div className="ui-info-grid">
                    <div className="ui-info-tile">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Conversaciones</p>
                      <p className="mt-2 text-2xl font-black text-brand-ink">{rows.length}</p>
                    </div>
                    <div className="ui-info-tile">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Logs</p>
                      <p className="mt-2 text-2xl font-black text-primary">{logs.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}

function Diagnostic({
  label,
  value
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-xl border bg-brand-background/55 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-bold text-brand-ink">
        {value}
      </p>
    </div>
  );
}
