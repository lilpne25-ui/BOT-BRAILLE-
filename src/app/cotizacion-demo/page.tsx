import Link from "next/link";
import { QuoteMeta, QuotePreview } from "@/components/cotizador/quote-preview";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { PricingCatalog, QuoteItem } from "@/lib/quote-calculator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const demoItems: QuoteItem[] = [
  {
    id: "item-1",
    product: "Guia podotactil principal",
    description: "Ruta direccional en accesos, elevadores y cruces internos.",
    solutionType: "Piso podotactil",
    material: "Acero inoxidable",
    unit: "metros lineales",
    quantity: 120,
    installationRequired: true,
    notes: "Incluye trazado por zonas de alto transito."
  },
  {
    id: "item-2",
    product: "Senalizacion braille de servicios",
    description: "Senales tactiles para sanitarios, elevadores y rutas de evacuacion.",
    solutionType: "Senalizacion braille",
    material: "Acrilico",
    unit: "piezas",
    quantity: 48,
    installationRequired: true,
    notes: "Incluye instalacion y evidencia fotografica."
  },
  {
    id: "item-3",
    product: "Mapa haptico de orientacion",
    description: "Mapa accesible en acceso principal para orientacion de visitantes.",
    solutionType: "Mapas hapticos",
    material: "Aluminio",
    unit: "piezas",
    quantity: 3,
    installationRequired: true,
    notes: "Formato de alto contraste y relieve tactil."
  }
];

const quoteMeta: QuoteMeta = {
  client: "Plaza Norte Queretaro",
  contact: "Lic. Beatriz Nunez",
  city: "Queretaro, Queretaro",
  projectLocation: "Accesos principales y zona de elevadores",
  spaceType: "Plaza",
  urgency: "Prioritario",
  solutionType: "Piso podotactil",
  material: "Acero inoxidable",
  usage: "Alto transito",
  installationMethod: "Instalacion especializada",
  estimatedDelivery: "3 a 4 semanas"
};

async function loadPricingCatalog(): Promise<PricingCatalog | undefined> {
  try {
    const [products, materials] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true } }),
      prisma.material.findMany({ where: { isActive: true } })
    ]);

    return {
      products: products.map((product) => ({ solutionType: product.solutionType, basePrice: product.basePrice })),
      materials: materials.map((material) => ({ name: material.name, multiplier: material.multiplier }))
    };
  } catch {
    return undefined;
  }
}

export default async function CotizacionDemoPage() {
  const catalog = await loadPricingCatalog();

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Documento demo</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">Vista previa de cotizacion PDF</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">Ejemplo de propuesta comercial para presentar el alcance de accesibilidad al cliente.</p>
          </div>
          <Button asChild variant="outline"><Link href="/cotizador">Volver al cotizador</Link></Button>
        </div>

        <QuotePreview
          quoteMeta={quoteMeta}
          observations="Vigencia de cotizacion: 15 dias. Incluye suministro, instalacion y reporte fotografico de cierre. Precios simulados para demo."
          items={demoItems}
          catalog={catalog}
        />
      </div>
    </PageShell>
  );
}
