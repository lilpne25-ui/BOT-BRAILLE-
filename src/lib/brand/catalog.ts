export type CrmBrandCode =
  | "BIDESIGN"
  | "BRAILLE";

export type CrmBrand = {
  code: CrmBrandCode;
  themeKey:
    | "bidesign"
    | "braille";
  name: string;
  shortName: string;
  crmName: string;
  tagline: string;
  description: string;
  monogram: string;
  logoPath: string | null;
  markPath: string | null;
  proposedDomain: string;
};

export const CRM_BRANDS: Record<
  CrmBrandCode,
  CrmBrand
> = {
  BIDESIGN: {
    code: "BIDESIGN",
    themeKey:
      "bidesign",
    name: "BI DESIGN",
    shortName: "BI DESIGN",
    crmName: "BI DESIGN CRM",
    tagline:
      "Señalización y Remodelación Retail",
    description:
      "CRM comercial y operativo de BI DESIGN.",
    monogram: "BI",
    logoPath:
      "/brand/bi-design-logo-full.png",
    markPath:
      "/brand/bi-design-mark.png",
    proposedDomain:
      "crm.bidesign.mx"
  },
  BRAILLE: {
    code: "BRAILLE",
    themeKey:
      "braille",
    name:
      "Braille International",
    shortName:
      "Braille",
    crmName:
      "BI DESIGN CRM",
    tagline:
      "Soluciones de accesibilidad",
    description:
      "CRM comercial y operativo de Braille International.",
    monogram: "BR",
    logoPath: null,
    markPath: null,
    proposedDomain:
      "crm.bidesign.local"
  }
};

export function resolveBrandCode(
  value?: string | null
): CrmBrandCode {
  return (
    value
      ?.trim()
      .toUpperCase() ===
    "BRAILLE"
  )
    ? "BRAILLE"
    : "BIDESIGN";
}

export function getBrandByCode(
  code: CrmBrandCode
) {
  return CRM_BRANDS[
    code
  ];
}
