import { describe, expect, it } from "vitest";
import {
  PricingCatalog,
  QuoteItem,
  calculateInstallation,
  calculateQuoteTotals,
  calculateUnitPrice
} from "@/lib/quote-calculator";

const baseItem: QuoteItem = {
  id: "item-1",
  product: "Guia podotactil",
  description: "Demo",
  solutionType: "Piso podotactil",
  material: "Acero inoxidable",
  unit: "metros lineales",
  quantity: 10,
  installationRequired: true
};

const catalog: PricingCatalog = {
  products: [{ solutionType: "Piso podotactil", basePrice: 2000 }],
  materials: [{ name: "Acero inoxidable", multiplier: 1.5 }]
};

describe("quote-calculator", () => {
  it("calcula totales de cotizacion con precios estaticos cuando no hay catalogo", () => {
    expect(calculateUnitPrice(baseItem)).toBe(1711);

    const totals = calculateQuoteTotals([baseItem]);
    expect(totals).toEqual({
      subtotal: 17110,
      installation: 3080,
      iva: 3230,
      total: 23420
    });
  });

  it("usa precio base y multiplicador del catalogo cuando estan disponibles", () => {
    expect(calculateUnitPrice(baseItem, catalog)).toBe(3000);

    const totals = calculateQuoteTotals([baseItem], catalog);
    expect(totals.subtotal).toBe(30000);
    expect(totals.installation).toBe(5400);
    expect(totals.iva).toBe(Math.round((30000 + 5400) * 0.16));
    expect(totals.total).toBe(totals.subtotal + totals.installation + totals.iva);
  });

  it("cae al precio estatico cuando el producto o material no existe en el catalogo", () => {
    const partialCatalog: PricingCatalog = {
      products: [{ solutionType: "Senalizacion braille", basePrice: 9999 }],
      materials: []
    };

    expect(calculateUnitPrice(baseItem, partialCatalog)).toBe(1711);
  });

  it("respeta el precio unitario manual del item por encima del catalogo", () => {
    const manualItem: QuoteItem = { ...baseItem, unitPrice: 500 };
    expect(calculateUnitPrice(manualItem, catalog)).toBe(500);
  });

  it("aplica el piso minimo de instalacion de 1800", () => {
    const smallItem: QuoteItem = { ...baseItem, quantity: 1 };
    expect(calculateInstallation(smallItem, catalog)).toBe(1800);

    const noInstallItem: QuoteItem = { ...baseItem, installationRequired: false };
    expect(calculateInstallation(noInstallItem, catalog)).toBe(0);
  });
});
