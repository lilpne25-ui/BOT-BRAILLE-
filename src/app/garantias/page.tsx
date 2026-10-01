import { PageShell } from "@/components/layout/page-shell";
import { WarrantyTable } from "@/components/garantias/warranty-table";
import { Badge } from "@/components/ui/badge";

type GarantiasPageProps = {
  searchParams?: Record<
    string,
    string | string[] | undefined
  >;
};

function getParam(
  value: string | string[] | undefined
) {
  return typeof value === "string"
    ? value
    : undefined;
}

export default function GarantiasPage({
  searchParams
}: GarantiasPageProps) {
  const initialSearch =
    getParam(
      searchParams?.client
    ) ?? "";

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Postventa</p>
              <h1 className="ui-page-title">Garantías y mantenimiento</h1>
              <p className="ui-page-description">
                Control operativo de cobertura, vencimientos, mantenimientos,
                responsables, incidencias e historial postventa.
              </p>
            </div>

            <div className="ui-page-actions">
              <Badge variant="success" className="px-3 py-2">
                Módulo operativo
              </Badge>
            </div>
          </div>
        </section>

        <WarrantyTable
          initialSearch={
            initialSearch
          }
        />
      </div>
    </PageShell>
  );
}
