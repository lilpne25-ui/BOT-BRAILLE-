import {
  PricingCatalog,
  QuoteItem,
  calculateInstallation,
  calculateItemSubtotal,
  calculateQuoteTotals,
  calculateUnitPrice
} from "@/lib/quote-calculator";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getPublicBrand } from "@/lib/brand/public";

export type QuoteMeta = {
  client: string;
  contact: string;
  city: string;
  projectLocation: string;
  spaceType: string;
  urgency: string;
  solutionType: string;
  material: string;
  usage: string;
  installationMethod: string;
  estimatedDelivery: string;
};

type QuotePreviewProps = {
  folio?: string | null;
  quoteMeta: QuoteMeta;
  observations?: string;
  items: QuoteItem[];
  catalog?: PricingCatalog;
};

export function QuotePreview({
  folio,
  quoteMeta,
  observations,
  items,
  catalog
}: QuotePreviewProps) {
  const totals = calculateQuoteTotals(items, catalog);
  const brand =
    getPublicBrand();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b-4 border-brand-accent bg-gradient-to-r from-brand-navy via-brand-ink to-primary text-primary-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">
              Cotización comercial
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              {brand.shortName} · {brand.tagline}
            </CardDescription>
          </div>
          <Badge className="w-fit bg-white text-primary">
            {folio || "Folio al guardar"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cliente
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-ink">
              {quoteMeta.client || "Cliente"}
            </p>
            <p className="text-sm text-muted-foreground">{quoteMeta.contact}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Proyecto
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {quoteMeta.projectLocation || "Ubicación pendiente"}
            </p>
            <p className="text-sm text-muted-foreground">{quoteMeta.city}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Solución
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {quoteMeta.solutionType} · {quoteMeta.material}
            </p>
            <p className="text-sm text-muted-foreground">Uso: {quoteMeta.usage}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Condiciones
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Método: {quoteMeta.installationMethod}
            </p>
            <p className="text-sm text-muted-foreground">
              Entrega estimada: {quoteMeta.estimatedDelivery}
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-2">
          <div className="hidden grid-cols-[2fr_2fr_0.8fr_0.8fr_1fr_1fr] gap-3 rounded-xl border bg-brand-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <p>Concepto</p>
            <p>Descripción</p>
            <p>Unidad</p>
            <p>Cantidad</p>
            <p>Precio unitario</p>
            <p>Subtotal</p>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-[2fr_2fr_0.8fr_0.8fr_1fr_1fr] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-brand-ink">{item.product}</p>
                <p className="text-xs text-muted-foreground">{item.solutionType}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.description || item.notes || "Sin descripción"}
              </p>
              <p className="text-sm text-muted-foreground">{item.unit}</p>
              <p className="text-sm text-muted-foreground">{item.quantity}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(calculateUnitPrice(item, catalog))}
              </p>
              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  {formatCurrency(calculateItemSubtotal(item, catalog))}
                </p>
                {item.installationRequired ? (
                  <p className="text-xs text-muted-foreground">
                    Instalación{" "}
                    {formatCurrency(calculateInstallation(item, catalog))}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {observations ? (
          <div className="mt-6 rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold text-brand-ink">
              Condiciones comerciales
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{observations}</p>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <div className="ml-auto max-w-sm space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Instalación</span>
              <strong>{formatCurrency(totals.installation)}</strong>
            </div>
            <div className="flex justify-between">
              <span>IVA 16%</span>
              <strong>{formatCurrency(totals.iva)}</strong>
            </div>
            <Separator />
            <div className="flex justify-between text-lg text-primary">
              <span>Total</span>
              <strong>{formatCurrency(totals.total)}</strong>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Precios y alcance sujetos a validación técnica y condiciones comerciales vigentes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
