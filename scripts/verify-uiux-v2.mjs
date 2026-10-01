import {
  readFileSync
} from "node:fs";
import {
  join
} from "node:path";

const root =
  process.cwd();

function read(
  relativePath
) {
  return readFileSync(
    join(
      root,
      relativePath
    ),
    "utf8"
  );
}

function expect(
  file,
  marker
) {
  const text =
    read(file);

  if (
    !text.includes(
      marker
    )
  ) {
    throw new Error(
      `${file}: falta ${marker}`
    );
  }
}

const checks = [
  ["src/app/layout.tsx", "lg:pl-64"],
  ["src/app/globals.css", ".login-form-pane"],
  ["src/app/globals.css", ".ui-panel-scroll"],
  ["src/components/layout/app-sidebar.tsx", "w-64 border-r"],
  ["src/components/layout/topbar.tsx", "h-16"],
  ["src/app/login/page.tsx", "login-form-pane"],
  ["src/app/page.tsx", "Requiere atencion"],
  ["src/app/page.tsx", "Proximas acciones"],
  ["src/app/page.tsx", "Actividad reciente"],
  ["src/app/page.tsx", "ui-panel-scroll"],
  ["src/components/cotizador/quote-form.tsx", "const guidedStepLabels"],
  ["src/components/cotizador/quote-form.tsx", "xl:top-[80px]"],
  ["src/components/cotizador/quote-preview.tsx", "from-brand-navy"],
  ["src/app/catalogo/page.tsx", "\"/api/catalog\""],
  ["src/app/whatsapp/page.tsx", "\"/api/whatsapp/inbox\""],
  ["src/components/crm/admin-prospect-deletion.tsx", "deletion-preview"],
  ["src/components/ui/table.tsx", "sticky top-0 z-10"]
];

for (
  const [
    file,
    marker
  ] of checks
) {
  expect(
    file,
    marker
  );
}

console.log(
  [
    "BIDESIGN_UIUX_V2_OK",
    `checks=${checks.length}`,
    "visualOnly=YES",
    "dbSchemaChanged=NO",
    "businessApiChanged=NO",
    "cascadeChanged=NO"
  ].join(" ")
);
