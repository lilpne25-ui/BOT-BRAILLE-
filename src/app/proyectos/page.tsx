import { PageShell } from "@/components/layout/page-shell";
import { ProjectsPanel } from "@/components/proyectos/projects-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const deliverySteps = [
  "Cotización aceptada y alta del proyecto.",
  "Planeación de instalación y responsable asignado.",
  "Seguimiento de avance, riesgo y cierre técnico.",
  "Transferencia a postventa y garantía cuando aplique."
];

export default function ProjectsPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Operación</p>
              <h1 className="ui-page-title">Proyectos e instalaciones</h1>
              <p className="ui-page-description">
                Control operativo desde una cotización aceptada hasta producción,
                instalación, cierre técnico y transferencia a postventa.
              </p>
            </div>

            <div className="ui-page-actions">
              <Badge variant="success" className="px-3 py-2">Módulo operativo</Badge>
            </div>
          </div>
        </section>

        <section className="ui-content-grid">
          <div className="min-w-0">
            <ProjectsPanel />
          </div>

          <aside className="ui-sticky-aside space-y-4">
            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Ruta operativa</CardTitle>
                <CardDescription>
                  Secuencia sugerida para mantener trazabilidad y orden de ejecución.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ol className="ui-aside-list">
                  {deliverySteps.map((step, index) => (
                    <li key={step}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="ui-aside-card overflow-hidden">
              <CardHeader className="border-b border-border/70 bg-brand-background/40">
                <CardTitle>Buenas prácticas</CardTitle>
                <CardDescription>
                  Recomendaciones visuales y operativas para el equipo.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="ui-aside-list">
                  <li>
                    <span className="ui-aside-dot" aria-hidden="true" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Asigna responsable y fecha antes de pasar a instalación.
                    </p>
                  </li>
                  <li>
                    <span className="ui-aside-dot" aria-hidden="true" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Usa el porcentaje de avance como referencia visual, no como sustituto del seguimiento técnico.
                    </p>
                  </li>
                  <li>
                    <span className="ui-aside-dot" aria-hidden="true" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Mantén el riesgo actualizado para priorizar atención operativa.
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
