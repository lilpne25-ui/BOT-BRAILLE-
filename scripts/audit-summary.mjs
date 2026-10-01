#!/usr/bin/env node
/**
 * Resumen legible de `npm audit`, en Markdown.
 *
 * Agrupa las vulnerabilidades por paquete raiz en vez de listar cada
 * dependencia transitiva por separado: 23 entradas de `npm audit` suelen ser
 * cuatro problemas reales y sus arboles. Sirve tanto en local como para el
 * resumen del job de CI.
 *
 * Siempre termina con exit 0: informa, no bloquea. La clasificacion por
 * explotabilidad real vive en docs/ENVIRONMENT_AND_CI.md.
 */

import { execSync } from "node:child_process";

const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };

let report;
try {
  // npm audit sale con codigo 1 cuando encuentra algo: se captura igualmente.
  const raw = execSync("npm audit --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 32 * 1024 * 1024
  });
  report = JSON.parse(raw);
} catch (error) {
  const raw = error.stdout;
  if (!raw) {
    console.log("No se pudo ejecutar `npm audit`.");
    process.exit(0);
  }
  report = JSON.parse(raw);
}

const totals = report.metadata?.vulnerabilities ?? {};
const entries = Object.entries(report.vulnerabilities ?? {});

console.log("## Auditoría de dependencias\n");

if (entries.length === 0) {
  console.log("Sin vulnerabilidades conocidas.");
  process.exit(0);
}

const counts = ["critical", "high", "moderate", "low"]
  .filter((key) => totals[key])
  .map((key) => `${totals[key]} ${key}`)
  .join(" · ");

console.log(`**${totals.total ?? entries.length} vulnerabilidades** — ${counts}\n`);

// Un paquete es "raiz" cuando la correccion propuesta apunta a el mismo: el
// resto son dependencias suyas que se arreglan al actualizarlo.
const roots = new Map();

for (const [name, vuln] of entries) {
  const fix = vuln.fixAvailable;
  const rootName = fix && typeof fix === "object" ? fix.name : name;
  if (!roots.has(rootName)) {
    roots.set(rootName, { severity: vuln.severity, packages: [], fix, advisories: 0 });
  }
  const root = roots.get(rootName);
  root.packages.push(name);
  root.advisories += vuln.via.filter((via) => typeof via !== "string").length;
  if (SEVERITY_ORDER[vuln.severity] < SEVERITY_ORDER[root.severity]) {
    root.severity = vuln.severity;
  }
}

const sorted = [...roots.entries()].sort(
  (a, b) => SEVERITY_ORDER[a[1].severity] - SEVERITY_ORDER[b[1].severity] || a[0].localeCompare(b[0])
);

console.log("| Severidad | Corrección | Advisories | Paquetes afectados |");
console.log("|---|---|---:|---|");

for (const [rootName, root] of sorted) {
  const fix =
    root.fix === false
      ? "sin corrección disponible"
      : root.fix === true
        ? "sin breaking changes"
        : `\`${root.fix.name}@${root.fix.version}\`${root.fix.isSemVerMajor ? " **(major)**" : ""}`;

  const affected = root.packages.length === 1 ? `\`${root.packages[0]}\`` : `${root.packages.length} paquetes`;

  console.log(`| ${root.severity} | ${fix} | ${root.advisories} | ${affected} |`);
}

console.log("\nClasificación por explotabilidad real: `docs/ENVIRONMENT_AND_CI.md` §5.");
