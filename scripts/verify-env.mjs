#!/usr/bin/env node
/**
 * Verificacion de entorno multiplataforma (Windows, Linux, macOS, CI).
 *
 * No usa `cmd /c` ni utilidades de shell: solo Node. Comprueba que la maquina
 * cumple las versiones fijadas y que las dependencias que necesitan binarios
 * propios (Prisma) quedaron realmente instaladas, en vez de asumir que existen
 * porque estaban en una cache local.
 *
 * Salida: exit 0 si no hay fallos duros; exit 1 si hay al menos uno.
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const OK = "OK";
const WARN = "WARN";
const FAIL = "FAIL";

const results = [];

function record(level, check, detail) {
  results.push({ level, check, detail });
}

/** Compara dos versiones semver simples (sin prerelease). -1 | 0 | 1 */
function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map(Number);
  const pb = String(b).replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

function minimumFromRange(range) {
  const match = String(range).match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

// ---------------------------------------------------------------- Node y npm

const pkg = readJson("package.json");
const engines = pkg.engines ?? {};

const nodeActual = process.versions.node;
const nodeMin = minimumFromRange(engines.node ?? "");
if (!nodeMin) {
  record(WARN, "Node", `No hay engines.node en package.json (actual ${nodeActual})`);
} else if (compareVersions(nodeActual, nodeMin) < 0) {
  record(FAIL, "Node", `${nodeActual} es menor que el minimo requerido ${nodeMin}`);
} else {
  record(OK, "Node", `${nodeActual} (minimo ${nodeMin})`);
}

// Cuando el script corre via `npm run`, npm publica su version en el user agent.
// Es mas fiable que lanzar un proceso hijo: en Windows `npm` es un .cmd y Node
// no permite ejecutarlo con execFile sin shell.
let npmActual = null;
const userAgent = process.env.npm_config_user_agent ?? "";
const uaMatch = userAgent.match(/npm\/(\d+\.\d+\.\d+)/);

if (uaMatch) {
  npmActual = uaMatch[1];
} else {
  try {
    npmActual = execSync("npm --version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    record(WARN, "npm", "No se pudo determinar la version (ejecuta el script con `npm run verify:env`)");
  }
}

if (npmActual) {
  const npmMin = minimumFromRange(engines.npm ?? "");
  if (!npmMin) {
    record(WARN, "npm", `No hay engines.npm en package.json (actual ${npmActual})`);
  } else if (compareVersions(npmActual, npmMin) < 0) {
    record(FAIL, "npm", `${npmActual} es menor que el minimo requerido ${npmMin}`);
  } else {
    record(OK, "npm", `${npmActual} (minimo ${npmMin})`);
  }
}

// ------------------------------------------------------------------- .nvmrc

if (!existsSync(join(ROOT, ".nvmrc"))) {
  record(WARN, ".nvmrc", "No existe; CI no puede fijar la version canonica de Node");
} else {
  const pinned = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
  const sameMajor = pinned.split(".")[0] === nodeActual.split(".")[0];
  record(
    sameMajor ? OK : WARN,
    ".nvmrc",
    sameMajor
      ? `Version canonica ${pinned}, ejecutando ${nodeActual}`
      : `Version canonica ${pinned} pero se ejecuta ${nodeActual} (major distinto)`
  );
}

// ------------------------------------------------------------- Variables env

const hasEnvFile = existsSync(join(ROOT, ".env"));
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  record(OK, "DATABASE_URL", `Definida (${databaseUrl.split(":")[0]}:...)`);
} else if (hasEnvFile) {
  record(WARN, "DATABASE_URL", "Existe .env pero la variable no esta en el proceso actual");
} else {
  record(WARN, "DATABASE_URL", "Sin definir y sin .env; los comandos de base de datos fallaran");
}

if (!hasEnvFile) {
  record(WARN, ".env", "No existe. Copia .env.example a .env para desarrollo local");
} else {
  record(OK, ".env", "Presente (ignorado por Git)");
}

// -------------------------------------------------- Cliente y engines Prisma

let prismaClientPath = null;
try {
  prismaClientPath = dirname(require.resolve("@prisma/client/package.json"));
  record(OK, "@prisma/client", "Instalado");
} catch {
  record(FAIL, "@prisma/client", "No resuelve; ejecuta `npm ci`");
}

if (prismaClientPath) {
  const generatedDir = join(ROOT, "node_modules", ".prisma", "client");
  if (!existsSync(generatedDir)) {
    record(FAIL, "Prisma Client generado", "Falta node_modules/.prisma/client; ejecuta `npm run prisma:generate`");
  } else {
    const entries = readdirSync(generatedDir);
    const engineBinaries = entries.filter((name) => /^(libquery_engine|query_engine)/.test(name));
    record(OK, "Prisma Client generado", `${entries.length} archivos en node_modules/.prisma/client`);

    if (engineBinaries.length === 0) {
      record(
        FAIL,
        "Prisma query engine",
        "No hay binario del motor de consultas. Ejecuta `npm run prisma:generate`; " +
          "si aun asi falta, revisa `npm install-scripts ls` (npm >=12 puede estar bloqueando el postinstall)"
      );
    } else {
      record(OK, "Prisma query engine", engineBinaries.join(", "));
    }
  }
}

// --------------------------------------------------------- Install scripts

// Paquetes cuyos install scripts SI deben ejecutarse: sin ellos Prisma se queda
// sin motor de consultas y esbuild/sharp sin binario nativo.
const REQUIRED_SCRIPTS = ["prisma", "@prisma/client", "@prisma/engines", "esbuild", "sharp"];

if (npmActual && compareVersions(npmActual, "12.0.0") >= 0) {
  // No basta con leer package.json#allowScripts: una aprobacion fijada a una
  // version (`pkg@1.2.3`) deja de cubrir al paquete en cuanto sube de version,
  // y el bloqueo pasa desapercibido porque el binario viejo sigue en disco.
  let blocked = null;
  try {
    const raw = execSync("npm install-scripts ls --json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    blocked = (JSON.parse(raw).allowScripts ?? [])
      .filter((entry) => entry.changes?.some((change) => change.change === "pending"))
      .map((entry) => entry.name);
  } catch {
    record(WARN, "allowScripts", "No se pudo consultar `npm install-scripts ls --json`");
  }

  if (blocked) {
    const blockedRequired = blocked.filter((name) => REQUIRED_SCRIPTS.includes(name));
    if (blockedRequired.length > 0) {
      record(
        FAIL,
        "allowScripts",
        `Scripts bloqueados en paquetes requeridos: ${blockedRequired.join(", ")}. ` +
          "Ejecuta `npm install-scripts approve <pkg> --no-allow-scripts-pin`"
      );
    } else {
      const approved = Object.keys(pkg.allowScripts ?? {}).length;
      const suffix = blocked.length > 0 ? `; ${blocked.length} bloqueados no requeridos` : "";
      record(OK, "allowScripts", `${approved} paquetes aprobados${suffix}`);
    }

    const pinned = Object.keys(pkg.allowScripts ?? {}).filter((key) => key.includes("@", 1));
    if (pinned.length > 0) {
      record(
        WARN,
        "allowScripts (pins)",
        `${pinned.length} aprobaciones fijadas a una version; dejaran de aplicar al actualizar: ${pinned.join(", ")}`
      );
    }
  }
} else if (npmActual) {
  record(OK, "allowScripts", `npm ${npmActual} no bloquea install scripts; el campo se ignora`);
}

// ------------------------------------------------------------------- Salida

const width = Math.max(...results.map((r) => r.check.length));
const icon = { [OK]: "  OK  ", [WARN]: " WARN ", [FAIL]: " FAIL " };

console.log("\nVerificacion de entorno — BRAILE INTERNATIONAL\n");
for (const { level, check, detail } of results) {
  console.log(`[${icon[level]}] ${check.padEnd(width)}  ${detail}`);
}

const failures = results.filter((r) => r.level === FAIL);
const warnings = results.filter((r) => r.level === WARN);

console.log(
  `\n${results.length} comprobaciones — ${results.length - failures.length - warnings.length} OK, ` +
    `${warnings.length} advertencias, ${failures.length} fallos\n`
);

if (failures.length > 0) {
  console.error("El entorno no cumple los requisitos minimos.");
  process.exit(1);
}
