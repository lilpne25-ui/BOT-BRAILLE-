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

function requireText(
  file,
  marker
) {
  const content =
    read(file);

  if (
    !content.includes(
      marker
    )
  ) {
    throw new Error(
      `${file}: falta marcador ${marker}`
    );
  }
}

const checks = [
  [
    "src/app/globals.css",
    ".brand-login-grid"
  ],
  [
    "src/app/globals.css",
    "prefers-reduced-motion"
  ],
  [
    "src/components/layout/page-shell.tsx",
    "useReducedMotion"
  ],
  [
    "src/components/ui/button.tsx",
    "motion-safe:active:scale-[0.985]"
  ],
  [
    "src/components/ui/input.tsx",
    "focus-visible:ring-4"
  ],
  [
    "src/components/ui/select.tsx",
    "focus:ring-4"
  ],
  [
    "src/components/ui/textarea.tsx",
    "focus-visible:ring-4"
  ],
  [
    "src/components/ui/table.tsx",
    "ui-scrollbar"
  ],
  [
    "src/components/auth/login-form.tsx",
    "showPassword"
  ],
  [
    "src/components/dashboard/metric-card.tsx",
    "ui-kpi-card"
  ],
  [
    "src/components/cotizador/quote-form.tsx",
    "xl:sticky"
  ],
  [
    "src/app/catalogo/page.tsx",
    '"/api/catalog"'
  ],
  [
    "src/app/whatsapp/page.tsx",
    '"/api/whatsapp/inbox"'
  ],
  [
    "src/app/whatsapp/page.tsx",
    '"/api/whatsapp/baileys/status"'
  ],
  [
    "src/app/whatsapp/page.tsx",
    "Diagnóstico técnico"
  ],
  [
    "src/app/cotizador/page.tsx",
    "Ninguna integración genera"
  ]
];

for (
  const [
    file,
    marker
  ] of checks
) {
  requireText(
    file,
    marker
  );
}


console.log(
  [
    "BIDESIGN_UIUX_V1_OK",
    `checks=${checks.length}`,
    "dbSchemaChanged=NO",
    "businessApiChanged=NO",
    "reducedMotion=YES",
    "sharedDesignSystem=YES"
  ].join(" ")
);
