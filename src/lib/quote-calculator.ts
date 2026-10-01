import { basePrices, materialMultipliers, Material, SolutionType } from "@/modules/quotes/contracts";

export type QuoteItem = {
  id: string;
  product: string;
  description: string;
  solutionType: SolutionType;
  material: Material;
  unit: string;
  quantity: number;
  unitPrice?: number;
  installationRequired: boolean;
  notes?: string;
};

export type QuoteTotals = {
  subtotal: number;
  installation: number;
  iva: number;
  total: number;
};

export type PricingCatalog = {
  products: Array<{ solutionType: string; basePrice: number }>;
  materials: Array<{ name: string; multiplier: number }>;
};

export function calculateUnitPrice(item: QuoteItem, catalog?: PricingCatalog) {
  if (item.unitPrice && item.unitPrice > 0) return item.unitPrice;
  const catalogProduct = catalog?.products.find((product) => product.solutionType === item.solutionType);
  const base = catalogProduct ? catalogProduct.basePrice : (basePrices[item.solutionType] ?? 0);
  const catalogMaterial = catalog?.materials.find((material) => material.name === item.material);
  const multiplier = catalogMaterial ? catalogMaterial.multiplier : (materialMultipliers[item.material] ?? 1);
  return Math.round(base * multiplier);
}

export function calculateItemSubtotal(item: QuoteItem, catalog?: PricingCatalog) {
  return Math.round(calculateUnitPrice(item, catalog) * item.quantity);
}

export function calculateInstallation(item: QuoteItem, catalog?: PricingCatalog) {
  if (!item.installationRequired) return 0;
  const subtotal = calculateItemSubtotal(item, catalog);
  return Math.max(1800, Math.round(subtotal * 0.18));
}

export function calculateQuoteTotals(items: QuoteItem[], catalog?: PricingCatalog): QuoteTotals {
  const subtotal = items.reduce((acc, item) => acc + calculateItemSubtotal(item, catalog), 0);
  const installation = items.reduce((acc, item) => acc + calculateInstallation(item, catalog), 0);
  const beforeTax = subtotal + installation;
  const iva = Math.round(beforeTax * 0.16);
  const total = beforeTax + iva;

  return { subtotal, installation, iva, total };
}
