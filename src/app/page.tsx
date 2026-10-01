import {
  Prisma
} from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  HardHat,
  History,
  ListTodo,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  Wrench
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  MaintenanceByMonthChart,
  ProjectTypeChart,
  QuoteStatusChart
} from "@/components/dashboard/project-status-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
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
  formatCurrency,
  formatDate
} from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getServerBrand } from "@/lib/brand/server";
import {
  activityTypeLabel,
  ageInDays,
  daysUntil,
  isDue,
  isWithinDays,
  projectStatusLabel,
  quoteStatusLabel
} from "@/modules/dashboard/operational";

export const dynamic =
  "force-dynamic";

type AttentionTone =
  | "danger"
  | "warning"
  | "info";

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: AttentionTone;
  priority: number;
};

type ActionItem = {
  id: string;
  area: string;
  code: string;
  client: string;
  action: string;
  date: Date;
  owner: string;
  href: string;
};

type DashboardLead =
  Prisma.LeadGetPayload<{
    include: {
      owner: true;
    };
  }>;

type DashboardQuote =
  Prisma.QuoteGetPayload<{
    include: {
      lead: true;
    };
  }>;

type DashboardProject =
  Prisma.ProjectGetPayload<{}>;

type DashboardWarranty =
  Prisma.WarrantyGetPayload<{}>;

type DashboardActivity =
  Prisma.ActivityLogGetPayload<{
    include: {
      user: true;
      lead: true;
      quote: true;
      project: true;
      warranty: true;
    };
  }>;

function attentionClasses(
  tone: AttentionTone
) {
  if (tone === "danger") {
    return {
      container:
        "border-destructive/30 bg-destructive/5",
      icon:
        "text-destructive"
    };
  }

  if (tone === "warning") {
    return {
      container:
        "border-amber-300 bg-amber-50",
      icon:
        "text-amber-700"
    };
  }

  return {
    container:
      "border-primary/20 bg-primary/5",
    icon:
      "text-primary"
  };
}

function actionDateLabel(
  date: Date,
  now: Date
) {
  const remaining =
    daysUntil(
      date,
      now
    );

  if (remaining < 0) {
    return `Vencida hace ${Math.abs(
      remaining
    )} d`;
  }

  if (remaining === 0) {
    return "Hoy";
  }

  if (remaining === 1) {
    return "Mañana";
  }

  return formatDate(
    date.toISOString()
  );
}

function activityHref(
  activity: {
    leadId: string | null;
    quoteId: string | null;
    projectId: string | null;
    warrantyId: string | null;
  }
) {
  if (activity.warrantyId) {
    return "/garantias";
  }

  if (activity.projectId) {
    return "/proyectos";
  }

  if (activity.quoteId) {
    return "/cotizador";
  }

  if (activity.leadId) {
    return "/prospectos";
  }

  return "/";
}

export default async function DashboardPage() {
  const now = new Date();
  const brand =
    getServerBrand();

  let databaseUnavailable =
    false;

  let leads:
    DashboardLead[] = [];

  let quotes:
    DashboardQuote[] = [];

  let projects:
    DashboardProject[] = [];

  let warranties:
    DashboardWarranty[] = [];

  let activities:
    DashboardActivity[] = [];

  try {
    [
      leads,
      quotes,
      projects,
      warranties,
      activities
    ] =
      await Promise.all([
        prisma.lead.findMany({
          include: {
            owner: true
          },
          orderBy: {
            updatedAt: "desc"
          }
        }),
        prisma.quote.findMany({
          include: {
            lead: true
          },
          orderBy: {
            updatedAt: "desc"
          }
        }),
        prisma.project.findMany({
          orderBy: {
            updatedAt: "desc"
          }
        }),
        prisma.warranty.findMany({
          orderBy: {
            updatedAt: "desc"
          }
        }),
        prisma.activityLog.findMany({
          include: {
            user: true,
            lead: true,
            quote: true,
            project: true,
            warranty: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 12
        })
      ]);
  } catch (error) {
    databaseUnavailable =
      true;

    console.error(
      "Dashboard real: database unavailable",
      error
    );
  }

  const openLeads =
    leads.filter(
      (lead) =>
        ![
          "WON",
          "LOST"
        ].includes(
          lead.status
        )
    );

  const openQuotes =
    quotes.filter(
      (quote) =>
        [
          "DRAFT",
          "SENT"
        ].includes(
          quote.status
        )
    );

  const quotedPipeline =
    openQuotes.reduce(
      (total, quote) =>
        total +
        quote.total,
      0
    );

  const acceptedSales =
    quotes
      .filter(
        (quote) =>
          quote.status ===
          "ACCEPTED"
      )
      .reduce(
        (total, quote) =>
          total +
          quote.total,
        0
      );

  const activeProjects =
    projects.filter(
      (project) =>
        ![
          "INSTALLED",
          "CLOSED"
        ].includes(
          project.status
        )
    );

  const upcomingInstallations =
    activeProjects.filter(
      (project) =>
        isWithinDays(
          project
            .estimatedInstallation,
          14,
          now
        )
    );

  const highRiskProjects =
    activeProjects.filter(
      (project) =>
        project.risk ===
        "HIGH"
    );

  const expiringWarranties =
    warranties.filter(
      (warranty) =>
        warranty.status ===
          "EXPIRING" ||
        isWithinDays(
          warranty
            .warrantyUntil,
          30,
          now
        )
    );

  const activeWarranties =
    warranties.filter(
      (warranty) =>
        warranty.status ===
        "ACTIVE"
    );

  const maintenanceDue =
    warranties.filter(
      (warranty) =>
        warranty.status ===
          "MAINTENANCE_SCHEDULED" ||
        isWithinDays(
          warranty
            .nextMaintenance,
          30,
          now
        ) ||
        isDue(
          warranty
            .nextMaintenance,
          now
        )
    );

  const quoteStatusMap =
    new Map<
      string,
      number
    >();

  quotes.forEach(
    (quote) => {
      const key =
        quoteStatusLabel(
          quote.status
        );

      quoteStatusMap.set(
        key,
        (
          quoteStatusMap.get(
            key
          ) ?? 0
        ) + 1
      );
    }
  );

  const quoteStatusData =
    Array.from(
      quoteStatusMap.entries()
    ).map(
      ([name, value]) => ({
        name,
        value
      })
    );

  const projectTypeMap =
    new Map<
      string,
      number
    >();

  projects.forEach(
    (project) => {
      projectTypeMap.set(
        project.solutionType,
        (
          projectTypeMap.get(
            project.solutionType
          ) ?? 0
        ) + 1
      );
    }
  );

  const projectTypeData =
    Array.from(
      projectTypeMap.entries()
    )
      .map(
        ([name, value]) => ({
          name,
          value
        })
      )
      .sort(
        (a, b) =>
          b.value -
          a.value
      );

  const maintenanceMap =
    new Map<
      string,
      {
        label: string;
        value: number;
      }
    >();

  const monthFormatter =
    new Intl.DateTimeFormat(
      "es-MX",
      {
        month: "short"
      }
    );

  warranties.forEach(
    (warranty) => {
      const date =
        warranty.nextMaintenance;

      const key =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

      const current =
        maintenanceMap.get(
          key
        );

      maintenanceMap.set(
        key,
        {
          label:
            monthFormatter.format(
              date
            ),
          value:
            (
              current?.value ??
              0
            ) + 1
        }
      );
    }
  );

  const maintenanceByMonthData =
    Array.from(
      maintenanceMap.entries()
    )
      .sort(
        ([a], [b]) =>
          a.localeCompare(b)
      )
      .slice(0, 8)
      .map(
        ([, row]) => ({
          month:
            row.label,
          value:
            row.value
        })
      );

  const attention: AttentionItem[] =
    [];

  openLeads
    .filter(
      (lead) =>
        isDue(
          lead.nextActionDate,
          now
        )
    )
    .forEach(
      (lead) => {
        const lateDays =
          Math.max(
            0,
            -daysUntil(
              lead.nextActionDate,
              now
            )
          );

        attention.push({
          id:
            `lead-${lead.id}`,
          title:
            `${lead.code} · ${lead.companyName}`,
          detail:
            lateDays > 0
              ? `Proxima accion vencida hace ${lateDays} dias: ${lead.nextAction}`
              : `Proxima accion para hoy: ${lead.nextAction}`,
          href:
            "/prospectos",
          tone:
            lateDays >= 3
              ? "danger"
              : "warning",
          priority:
            lateDays >= 3
              ? 100
              : 80
        });
      }
    );

  openQuotes.forEach(
    (quote) => {
      const age =
        ageInDays(
          quote.updatedAt,
          now
        );

      const stale =
        (
          quote.status ===
            "DRAFT" &&
          age >= 3
        ) ||
        (
          quote.status ===
            "SENT" &&
          age >= 5
        );

      if (!stale) {
        return;
      }

      attention.push({
        id:
          `quote-${quote.id}`,
        title:
          `${quote.folio} · ${quote.lead.companyName}`,
        detail:
          quote.status ===
          "DRAFT"
            ? `Borrador sin cambios desde hace ${age} dias.`
            : `Cotizacion enviada sin actualizacion desde hace ${age} dias.`,
        href:
          "/cotizador",
        tone:
          age >= 7
            ? "danger"
            : "warning",
        priority:
          age >= 7
            ? 95
            : 70
      });
    }
  );

  highRiskProjects.forEach(
    (project) => {
      attention.push({
        id:
          `project-risk-${project.id}`,
        title:
          `${project.code} · ${project.clientName}`,
        detail:
          `Proyecto en riesgo alto · ${projectStatusLabel(
            project.status
          )}. ${project.nextAction}`,
        href:
          "/proyectos",
        tone:
          "danger",
        priority:
          110
      });
    }
  );

  upcomingInstallations.forEach(
    (project) => {
      const remaining =
        daysUntil(
          project
            .estimatedInstallation,
          now
        );

      attention.push({
        id:
          `project-install-${project.id}`,
        title:
          `${project.code} · Instalacion`,
        detail:
          remaining === 0
            ? `Instalacion estimada para hoy · ${project.clientName}.`
            : `Instalacion estimada en ${remaining} dias · ${project.clientName}.`,
        href:
          "/proyectos",
        tone:
          remaining <= 3
            ? "warning"
            : "info",
        priority:
          remaining <= 3
            ? 75
            : 40
      });
    }
  );

  projects
    .filter(
      (project) =>
        [
          "INSTALLED",
          "CLOSED"
        ].includes(
          project.status
        ) &&
        project.evidenceCount ===
          0
    )
    .forEach(
      (project) => {
        attention.push({
          id:
            `project-evidence-${project.id}`,
          title:
            `${project.code} · Evidencia pendiente`,
          detail:
            `El proyecto esta ${projectStatusLabel(
              project.status
            ).toLowerCase()} y no tiene evidencias registradas.`,
          href:
            "/proyectos",
          tone:
            "warning",
          priority:
            85
        });
      }
    );

  warranties.forEach(
    (warranty) => {
      const warrantyDays =
        daysUntil(
          warranty
            .warrantyUntil,
          now
        );

      if (
        warranty.status ===
          "REVIEW_REQUIRED"
      ) {
        attention.push({
          id:
            `warranty-review-${warranty.id}`,
          title:
            `${warranty.code} · ${warranty.clientName}`,
          detail:
            "La garantia requiere revision de postventa.",
          href:
            "/garantias",
          tone:
            "danger",
          priority:
            105
        });
      }

      if (
        warrantyDays >= 0 &&
        warrantyDays <= 30
      ) {
        attention.push({
          id:
            `warranty-expire-${warranty.id}`,
          title:
            `${warranty.code} · Por vencer`,
          detail:
            warrantyDays === 0
              ? "La garantia vence hoy."
              : `La garantia vence en ${warrantyDays} dias.`,
          href:
            "/garantias",
          tone:
            warrantyDays <= 7
              ? "danger"
              : "warning",
          priority:
            warrantyDays <= 7
              ? 100
              : 65
        });
      }

      const maintenanceDays =
        daysUntil(
          warranty
            .nextMaintenance,
          now
        );

      if (
        maintenanceDays >=
          0 &&
        maintenanceDays <=
          30
      ) {
        attention.push({
          id:
            `maintenance-${warranty.id}`,
          title:
            `${warranty.code} · Mantenimiento`,
          detail:
            maintenanceDays ===
            0
              ? "Mantenimiento programado para hoy."
              : `Mantenimiento programado en ${maintenanceDays} dias.`,
          href:
            "/garantias",
          tone:
            maintenanceDays <=
            7
              ? "warning"
              : "info",
          priority:
            maintenanceDays <=
            7
              ? 75
              : 35
        });
      }
    }
  );

  const attentionItems =
    attention
      .sort(
        (a, b) =>
          b.priority -
          a.priority
      )
      .slice(0, 10);

  const actionItems: ActionItem[] =
    [
      ...openLeads.map(
        (lead) => ({
          id:
            `lead-action-${lead.id}`,
          area:
            "Comercial",
          code:
            lead.code,
          client:
            lead.companyName,
          action:
            lead.nextAction,
          date:
            lead.nextActionDate,
          owner:
            lead.owner
              ?.name ??
            "Sin asignar",
          href:
            "/prospectos"
        })
      ),
      ...activeProjects.map(
        (project) => ({
          id:
            `project-action-${project.id}`,
          area:
            "Proyecto",
          code:
            project.code,
          client:
            project.clientName,
          action:
            project.nextAction,
          date:
            project
              .estimatedInstallation,
          owner:
            project.responsible,
          href:
            "/proyectos"
        })
      ),
      ...warranties.map(
        (warranty) => ({
          id:
            `warranty-action-${warranty.id}`,
          area:
            "Postventa",
          code:
            warranty.code,
          client:
            warranty.clientName,
          action:
            warranty.nextAction,
          date:
            warranty
              .nextMaintenance,
          owner:
            warranty.responsible,
          href:
            "/garantias"
        })
      )
    ]
      .sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      )
      .slice(0, 10);

  const todayLabel =
    new Intl.DateTimeFormat(
      "es-MX",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(now);

  return (
    <div className="space-y-6">
      <section className="brand-hero relative overflow-hidden rounded-3xl border border-white/10 p-6 text-white shadow-[0_24px_60px_-38px_hsl(var(--brand-navy)/0.9)] md:p-7">
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-28 left-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />

        {brand.markPath ? (
          <Image
            src={brand.markPath}
            alt=""
            width={280}
            height={240}
            className="pointer-events-none absolute right-8 top-1/2 hidden w-44 -translate-y-1/2 object-contain opacity-[0.12] xl:block"
            aria-hidden="true"
          />
        ) : null}

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Badge
              className="mb-4 border border-white/15 bg-white/10 text-white hover:bg-white/10"
            >
              <span className="mr-2 h-2 w-2 rounded-full bg-[#EB5B28]" />
              Datos reales · Operación BI DESIGN
            </Badge>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Centro de mando{" "}
              <span className="text-[#1B9CD9]">
                {brand.shortName}
              </span>
            </h1>

            <p className="mt-4 text-base leading-7 text-white/70 md:text-lg">
              Prospectos, cotizaciones, proyectos, instalaciones y postventa en un solo tablero operativo.
            </p>

            <p className="mt-2 text-sm capitalize text-white/50">
              {todayLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-[#EB5B28] text-white hover:bg-[#EB5B28]/90"
            >
              <Link href="/prospectos">
                <UsersRound
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Prospectos
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/cotizador">
                <FileText
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Cotizador
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {databaseUnavailable ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            No fue posible leer SQLite. El dashboard no mostrara datos simulados; revisa la base y vuelve a cargar.
          </CardContent>
        </Card>
      ) : null}

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores operativos"
      >
        <Link
          href="/prospectos"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Prospectos abiertos"
            value={String(
              openLeads.length
            )}
            detail={`${leads.filter(
              (lead) =>
                lead.status ===
                "NEW"
            ).length} nuevos por atender.`}
            icon={UsersRound}
            tone="blue"
          />
        </Link>

        <Link
          href="/cotizador"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Cotizaciones abiertas"
            value={String(
              openQuotes.length
            )}
            detail={`${quotes.filter(
              (quote) =>
                quote.status ===
                "SENT"
            ).length} enviadas esperando seguimiento.`}
            icon={FileText}
            tone="green"
          />
        </Link>

        <Link
          href="/cotizador"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Valor cotizado activo"
            value={formatCurrency(
              quotedPipeline
            )}
            detail="Borradores y cotizaciones enviadas."
            icon={TrendingUp}
            tone="blue"
          />
        </Link>

        <Link
          href="/cotizador"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Ventas aceptadas"
            value={formatCurrency(
              acceptedSales
            )}
            detail={`${quotes.filter(
              (quote) =>
                quote.status ===
                "ACCEPTED"
            ).length} cotizaciones aceptadas.`}
            icon={CircleDollarSign}
            tone="green"
          />
        </Link>

        <Link
          href="/proyectos"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Proyectos activos"
            value={String(
              activeProjects.length
            )}
            detail={`${projects.filter(
              (project) =>
                project.status ===
                "IN_PRODUCTION"
            ).length} actualmente en produccion.`}
            icon={HardHat}
            tone="amber"
          />
        </Link>

        <Link
          href="/proyectos"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Instalaciones proximas"
            value={String(
              upcomingInstallations.length
            )}
            detail="Programadas dentro de los proximos 14 dias."
            icon={CalendarClock}
            tone="blue"
          />
        </Link>

        <Link
          href="/proyectos"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Proyectos en riesgo alto"
            value={String(
              highRiskProjects.length
            )}
            detail="Requieren atencion del equipo operativo."
            icon={AlertTriangle}
            tone="amber"
          />
        </Link>

        <Link
          href="/garantias"
          className="group block rounded-2xl transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          <MetricCard
            title="Garantias por vencer"
            value={String(
              expiringWarranties.length
            )}
            detail={`${activeWarranties.length} activas · ${maintenanceDue.length} mantenimientos por atender.`}
            icon={ShieldAlert}
            tone="slate"
          />
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <QuoteStatusChart
          data={quoteStatusData}
        />

        <ProjectTypeChart
          data={projectTypeData}
        />

        <MaintenanceByMonthChart
          data={
            maintenanceByMonthData
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="inline-flex items-center gap-2">
                  <AlertTriangle
                    className="h-5 w-5 text-amber-600"
                    aria-hidden="true"
                  />
                  Requiere atencion
                </CardTitle>

                <CardDescription className="mt-2">
                  Pendientes reales ordenados por prioridad.
                </CardDescription>
              </div>

              <Badge
                variant={
                  attentionItems.length >
                  0
                    ? "warning"
                    : "success"
                }
              >
                {attentionItems.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="ui-panel-scroll space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-2">
            {attentionItems.length ===
            0 ? (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
                <CheckCircle2
                  className="h-6 w-6 text-[#2a8026]"
                  aria-hidden="true"
                />
                <p className="mt-3 font-semibold text-brand-ink">
                  Sin alertas criticas
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No hay pendientes prioritarios detectados en este momento.
                </p>
              </div>
            ) : (
              attentionItems.map(
                (item) => {
                  const classes =
                    attentionClasses(
                      item.tone
                    );

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex items-start gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${classes.container}`}
                    >
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${classes.icon}`}
                        aria-hidden="true"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-brand-ink">
                          {item.title}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>

                      <ArrowRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                }
              )
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ListTodo
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              Proximas acciones
            </CardTitle>

            <CardDescription>
              Agenda combinada de Comercial, Operaciones y Postventa.
            </CardDescription>
          </CardHeader>

          <CardContent className="ui-panel-scroll space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-2">
            {actionItems.length ===
            0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aun no hay acciones programadas.
              </p>
            ) : (
              actionItems.map(
                (row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="group grid gap-2 rounded-2xl border bg-white p-4 transition hover:border-primary/40 hover:shadow-sm md:grid-cols-[0.8fr_1fr_2fr_1fr_1fr_auto] md:items-center"
                  >
                    <Badge
                      variant="secondary"
                      className="w-fit"
                    >
                      {row.area}
                    </Badge>

                    <p className="text-sm font-semibold text-primary">
                      {row.code}
                    </p>

                    <div>
                      <p className="font-semibold text-brand-ink">
                        {row.client}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {row.action}
                      </p>
                    </div>

                    <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock3
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {actionDateLabel(
                        row.date,
                        now
                      )}
                    </p>

                    <Badge
                      variant="outline"
                      className="w-fit"
                    >
                      {row.owner}
                    </Badge>

                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                )
              )
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <History
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              Actividad reciente
            </CardTitle>

            <CardDescription>
              Ultimos eventos registrados en la auditoria del CRM.
            </CardDescription>
          </CardHeader>

          <CardContent className="ui-panel-scroll space-y-3 xl:max-h-[520px] xl:overflow-y-auto xl:pr-2">
            {activities.length ===
            0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aun no hay actividad registrada.
              </p>
            ) : (
              activities.map(
                (activity) => {
                  const relatedCode =
                    activity
                      .warranty
                      ?.code ??
                    activity
                      .project
                      ?.code ??
                    activity
                      .quote
                      ?.folio ??
                    activity
                      .lead
                      ?.code ??
                    "CRM";

                  return (
                    <Link
                      key={activity.id}
                      href={activityHref(
                        activity
                      )}
                      className="group flex items-start gap-3 rounded-2xl border bg-white p-4 transition hover:border-primary/40"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <History
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                          >
                            {activityTypeLabel(
                              activity.type
                            )}
                          </Badge>

                          <span className="text-xs font-semibold text-primary">
                            {relatedCode}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-brand-ink">
                          {activity.message}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.user
                            ?.name ??
                            "Sistema"}{" "}
                          ·{" "}
                          {formatDate(
                            activity.createdAt.toISOString()
                          )}
                        </p>
                      </div>

                      <ArrowRight
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                }
              )
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              Estado operativo
            </CardTitle>

            <CardDescription>
              Vista rapida de las cuatro etapas principales.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Link
              href="/prospectos"
              className="flex items-center justify-between rounded-2xl border bg-white p-4 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <UsersRound
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-brand-ink">
                    Comercial
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {openLeads.length} oportunidades abiertas
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/cotizador"
              className="flex items-center justify-between rounded-2xl border bg-white p-4 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <FileText
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-brand-ink">
                    Cotizaciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {openQuotes.length} abiertas ·{" "}
                    {formatCurrency(
                      quotedPipeline
                    )}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/proyectos"
              className="flex items-center justify-between rounded-2xl border bg-white p-4 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <HardHat
                  className="h-5 w-5 text-amber-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-brand-ink">
                    Operaciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeProjects.length} proyectos activos
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/garantias"
              className="flex items-center justify-between rounded-2xl border bg-white p-4 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className="h-5 w-5 text-[#2a8026]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-brand-ink">
                    Postventa
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeWarranties.length} garantias activas ·{" "}
                    {maintenanceDue.length} mantenimientos
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="rounded-2xl border bg-brand-background p-4">
              <div className="flex items-start gap-3">
                <Wrench
                  className="mt-0.5 h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-brand-ink">
                    Datos reales de {brand.shortName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Todos los indicadores se calculan desde la base real de esta instancia de {brand.crmName}.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
