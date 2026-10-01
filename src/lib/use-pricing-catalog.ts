"use client";

import { useEffect, useState } from "react";
import { PricingCatalog } from "@/lib/quote-calculator";

export function usePricingCatalog(): { catalog: PricingCatalog | undefined } {
  const [catalog, setCatalog] = useState<PricingCatalog | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/catalog")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.products) && Array.isArray(data.materials)) {
          setCatalog({
            products: data.products.map((product: { solutionType: string; basePrice: number }) => ({
              solutionType: product.solutionType,
              basePrice: product.basePrice
            })),
            materials: data.materials.map((material: { name: string; multiplier: number }) => ({
              name: material.name,
              multiplier: material.multiplier
            }))
          });
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog };
}
