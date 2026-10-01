import { QuoteForm } from "@/components/cotizador/quote-form";
import { PageShell } from "@/components/layout/page-shell";

type CotizadorPageProps = {
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

export default function CotizadorPage({
  searchParams
}: CotizadorPageProps) {
  const initialLead = {
    leadCode: getParam(searchParams?.leadCode),
    client: getParam(searchParams?.client),
    contact: getParam(searchParams?.contact),
    email: getParam(searchParams?.email),
    phone: getParam(searchParams?.phone),
    city: getParam(searchParams?.city),
    projectType: getParam(searchParams?.projectType)
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Cotizador</p>
              <h1 className="ui-page-title">
                Cotizador operativo de soluciones y proyectos
              </h1>
              <p className="ui-page-description">
                Prepara, guarda y controla cotizaciones creadas por el equipo
                comercial. Ninguna integración genera cotizaciones finales sin
                revisión humana.
              </p>
            </div>
          </div>
        </section>

        <QuoteForm initialLead={initialLead} />
      </div>
    </PageShell>
  );
}
