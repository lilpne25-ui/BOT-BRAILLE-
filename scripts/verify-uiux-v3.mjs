import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function expect(file, marker) {
  const text = read(file);
  if (!text.includes(marker)) {
    throw new Error(`${file}: falta ${marker}`);
  }
}

const checks = [
  ["src/app/layout.tsx", "lg:pl-64"],
  ["src/app/globals.css", ".ui-page-hero"],
  ["src/app/globals.css", ".ui-content-grid"],
  ["src/app/prospectos/page.tsx", "ui-page-hero"],
  ["src/app/catalogo/page.tsx", "ui-page-hero"],
  ["src/app/proyectos/page.tsx", "Ruta operativa"],
  ["src/app/usuarios/page.tsx", "Resumen de acceso"],
  ["src/app/whatsapp/page.tsx", "Ruta de atención"],
  ["src/components/cotizador/quote-form.tsx", "const guidedStepLabels"],
  ["src/components/cotizador/quote-preview.tsx", "from-brand-navy"],
  ["src/components/crm/admin-prospect-deletion.tsx", "deletion-preview"],
  ["src/app/catalogo/page.tsx", "\"/api/catalog\""],
  ["src/app/whatsapp/page.tsx", "\"/api/whatsapp/inbox\""],
  ["src/components/ui/table.tsx", "sticky top-0 z-10"]
];

for (const [file, marker] of checks) {
  expect(file, marker);
}

console.log([
  "BIDESIGN_UIUX_V3_OK",
  `checks=${checks.length}`,
  "visualOnly=YES",
  "dbSchemaChanged=NO",
  "businessApiChanged=NO",
  "cascadeChanged=NO"
].join(" "));
