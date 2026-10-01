"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  AdminProspectDeletion
} from "@/components/crm/admin-prospect-deletion";
import {
  ProspectsTable
} from "@/components/crm/prospects-table";
import {
  PageShell
} from "@/components/layout/page-shell";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  LeadDto
} from "@/modules/crm/contracts";
import {
  formatCurrency
} from "@/lib/utils";

export default function ProspectsPage() {
  const [
    baseProspects,
    setBaseProspects
  ] =
    useState<LeadDto[]>([]);
  const [
    loadError,
    setLoadError
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch(
      "/api/leads",
      {
        cache:
          "no-store"
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load leads"
          );
        }

        return response.json();
      })
      .then(
        (
          rows: LeadDto[]
        ) => {
          if (mounted) {
            setBaseProspects(
              rows
            );
            setLoadError(
              false
            );
          }
        }
      )
      .catch(() => {
        if (mounted) {
          setBaseProspects(
            []
          );
          setLoadError(
            true
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pipelineValue =
    useMemo(
      () =>
        baseProspects
          .filter(
            (prospect) =>
              prospect.status !==
              "Perdido"
          )
          .reduce(
            (
              total,
              prospect
            ) =>
              total +
              prospect.estimatedValue,
            0
          ),
      [
        baseProspects
      ]
    );

  const won =
    useMemo(
      () =>
        baseProspects.filter(
          (prospect) =>
            prospect.status ===
            "Ganado"
        ).length,
      [
        baseProspects
      ]
    );

  const pending =
    useMemo(
      () =>
        baseProspects.filter(
          (prospect) =>
            ![
              "Ganado",
              "Perdido"
            ].includes(
              prospect.status
            )
        ).length,
      [
        baseProspects
      ]
    );

  function handleDeleted(
    code: string
  ) {
    setBaseProspects(
      (current) =>
        current.filter(
          (prospect) =>
            prospect.id !==
            code
        )
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">CRM comercial</p>
              <h1 className="ui-page-title">Prospectos y oportunidades</h1>
              <p className="ui-page-description">
                Seguimiento comercial desde el primer contacto hasta la propuesta, proyecto y postventa.
              </p>
            </div>
          </div>
        </section>

        {loadError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              No se pudieron cargar los prospectos. Verifica tu conexion e intenta de nuevo.
            </CardContent>
          </Card>
        ) : null}

        <section
          className="grid gap-4 md:grid-cols-3"
          aria-label="Resumen de prospectos"
        >
          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Valor activo del pipeline
              </p>

              <p className="mt-2 text-2xl font-bold text-primary">
                {formatCurrency(
                  pipelineValue
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Prospectos pendientes
              </p>

              <p className="mt-2 text-2xl font-bold text-brand-ink">
                {pending}
              </p>
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Ganados
              </p>

              <p className="mt-2 text-2xl font-bold text-[#2a8026]">
                {won}
              </p>
            </CardContent>
          </Card>
        </section>

        <AdminProspectDeletion
          prospects={
            baseProspects
          }
          onDeleted={
            handleDeleted
          }
        />

        <ProspectsTable
          baseProspects={
            baseProspects
          }
          onProspectsChange={
            setBaseProspects
          }
        />
      </div>
    </PageShell>
  );
}
