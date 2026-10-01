# Entorno de desarrollo e integración continua

> Fase 0.5 del plan maestro de production readiness.
> Última actualización: 2026-07-27.

Este documento describe cómo se reproduce el entorno de BRAILE INTERNATIONAL en una máquina
de desarrollo y en CI, y clasifica el estado de las vulnerabilidades de dependencias.

---

## 1. Versiones fijadas

| Elemento | Valor | Dónde se define |
|---|---|---|
| Node canónico | `24.18.0` | [`.nvmrc`](../.nvmrc) — lo consume `actions/setup-node` vía `node-version-file` |
| Node mínimo | `>=22.11.0` | `engines.node` en `package.json` |
| npm mínimo | `>=10.9.0` | `engines.npm` en `package.json` |
| npm en CI | `12.0.1` | `PINNED_NPM_VERSION` en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |

**Por qué dos niveles.** `.nvmrc` fija la versión exacta que usa CI, de modo que el resultado del
quality gate sea reproducible. `engines` define un piso mínimo para que una máquina de desarrollo con
otra versión LTS no quede bloqueada innecesariamente.

**Por qué se fija npm en CI.** npm 12 bloquea los *install scripts* por defecto; npm 11 y anteriores
los ejecutan todos. Sin fijar la versión, CI aplicaría una política de instalación distinta a la
local y un script bloqueado en tu máquina podría pasar inadvertido en el runner.

### Instalación de Node

| Sistema | Comando |
|---|---|
| Windows (nvm-windows) | `nvm install 24.18.0 && nvm use 24.18.0` |
| Windows (winget) | `winget install OpenJS.NodeJS.LTS` |
| Linux / macOS (nvm) | `nvm install` (lee `.nvmrc` automáticamente) |
| CI | `actions/setup-node@v4` con `node-version-file: .nvmrc` |

---

## 2. Install scripts (`allowScripts`)

npm 12 no ejecuta los scripts de ciclo de vida de las dependencias salvo aprobación explícita. En
este proyecto había **9 paquetes bloqueados**, entre ellos los que instalan los binarios de Prisma.
El build seguía pasando únicamente porque esos binarios ya estaban en la caché local de la máquina
— exactamente el tipo de dependencia oculta que esta fase debe eliminar.

### Aprobados

| Paquete | Script | Por qué es necesario |
|---|---|---|
| `prisma` | `preinstall` | Preparación del CLI |
| `@prisma/client` | `postinstall` | Genera el cliente |
| `@prisma/engines` | `postinstall` | **Descarga el motor de consultas**; sin él la app no habla con la base |
| `esbuild` | `postinstall` | Binario nativo que usa Vitest para transpilar |
| `sharp` | `install` | Binario nativo de optimización de imágenes de Next |
| `protobufjs` | `postinstall` | Requerido por Baileys |
| `@whiskeysockets/baileys` | `preinstall` | Comprobación de versión de Node |

### Denegados (se dejan bloqueados a propósito)

| Paquete | Script | Por qué no hace falta |
|---|---|---|
| `core-js` | `postinstall` | Solo imprime un mensaje de patrocinio, envuelto en `try/catch` |
| `unrs-resolver` | `postinstall` | Resolución opcional de bindings de ESLint; lint pasa sin él |

### Aprobaciones sin fijar versión

Las aprobaciones se escribieron con `--no-allow-scripts-pin`, es decir `"prisma": true` en vez de
`"prisma@6.16.0": true`.

Esto no es cosmético. Durante esta fase, `npm audit fix` subió Prisma de `6.16.0` a `6.19.3` y la
aprobación fijada **dejó de aplicar**: los scripts volvieron a bloquearse en silencio. El fallo pasó
inadvertido porque el motor de consultas de la instalación anterior seguía en disco. Con aprobación
por nombre, una subida de parche no reabre el problema.

`npm run verify:env` detecta este caso: avisa si encuentra aprobaciones fijadas a una versión.

### Cuando se agrega una dependencia con install script

```bash
npm install-scripts ls
```

Si el paquete necesita ejecutar su script, apruébalo y documenta el motivo en la tabla de arriba:

```bash
npm install-scripts approve <paquete> --no-allow-scripts-pin
```

---

## 3. Verificación de entorno

```bash
npm run verify:env
```

Script en Node puro ([`scripts/verify-env.mjs`](../scripts/verify-env.mjs)), sin `cmd /c`, que corre
igual en Windows, Linux, macOS y CI. Comprueba:

1. Versión de Node contra `engines`.
2. Versión de npm contra `engines`.
3. Coherencia con `.nvmrc`.
4. `DATABASE_URL` y presencia de `.env`.
5. `@prisma/client` resuelto.
6. Cliente Prisma generado.
7. **Presencia real del binario del motor de consultas** (no basta con que la carpeta exista).
8. Install scripts bloqueados entre los paquetes requeridos, consultando
   `npm install-scripts ls --json` en vez de confiar en el campo `allowScripts`.
9. Aprobaciones fijadas a una versión.

Sale con código 1 si hay algún fallo duro. **Debe ejecutarse después de `prisma:generate`**: antes de
ese paso el motor de consultas todavía no existe y el script lo reporta como fallo (comportamiento
correcto y verificado).

### Orden canónico desde un clon limpio

```bash
npm ci
npm run prisma:generate
npm run verify:env
npm run lint
npm run test
npm run build
```

---

## 4. Integración continua

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

### Job `quality-gate` — bloqueante

Se ejecuta en pull requests hacia `main` y en push a ramas `feat/**`, `chore/**`, `fix/**` y `test/**`.
Corre los seis comandos del orden canónico. Cualquier exit code distinto de cero detiene el workflow.

Detalles relevantes:

- `shell: bash -euo pipefail` — sin `pipefail`, el `tee` de captura de logs enmascararía el exit code
  real del comando.
- `concurrency` con `cancel-in-progress` — una ejecución viva por rama.
- `permissions: contents: read` — el workflow no necesita escribir en el repositorio.
- Los logs de cada paso se publican como artefacto (`ci-logs-<run>-<attempt>`) durante 14 días.

### Job `dependency-audit` — informativo

Publica un resumen de `npm audit` en el sumario del run y emite una anotación de aviso si hay
vulnerabilidades críticas. **Nunca falla**, porque hoy existen vulnerabilidades sin parche disponible
fuera de un salto de versión mayor (ver sección 5) y un check permanentemente en rojo es la forma más
rápida de que un CI deje de leerse.

> **Nota sobre `continue-on-error`.** La primera versión de este job usaba `continue-on-error: true` a
> nivel de job. Eso evita que el workflow falle, pero **el check sigue apareciendo en rojo en el pull
> request** — que era justo lo que se quería evitar. Se comprobó en el run
> [30331897343](https://github.com/lilpne25-ui/Bi-Design-CRM/actions/runs/30331897343). La
> versión actual no depende de ese mecanismo: los comandos no devuelven código de error.

El resumen lo genera [`scripts/audit-summary.mjs`](../scripts/audit-summary.mjs), que también se puede
ejecutar en local:

```bash
npm run audit:summary
```

Agrupa las vulnerabilidades por paquete raíz en lugar de listar cada dependencia transitiva: las 23
entradas que reporta `npm audit` hoy son en realidad cinco problemas y sus árboles.

Cuando se cierren las dependencias con salto mayor pendientes, este job debe pasar a bloqueante.

---

## 5. Clasificación de vulnerabilidades

Estado al cierre de la Fase 0.5.

| Momento | Total | Críticas | Altas | Moderadas |
|---|---:|---:|---:|---:|
| Línea base (`main@279b338`) | 19 | 3 | 11 | 5 |
| Tras `next@14.2.35` | 29 | 2 | 22 | 5 |
| Tras `npm audit fix` | **23** | **2** | **17** | **4** |

> El total sube de 19 a 29 entre la primera y la segunda medición porque al reinstalar, npm resolvió y
> reportó individualmente el árbol de ESLint, que antes se agregaba bajo menos entradas. No son
> vulnerabilidades nuevas: son las mismas contadas con otro nivel de detalle.

### Resueltas en esta fase

`prisma`, `@prisma/config`, `effect`, `js-yaml`, `protobufjs`, `sharp` — todas mediante
`npm audit fix` sin breaking changes.

De `next`, la actualización 14.2.23 → 14.2.35 cerró 8 advisories:

| Severidad | Advisory |
|---|---|
| **CRITICAL** | **Authorization Bypass in Next.js Middleware** |
| HIGH | Denial of Service with Server Components |
| HIGH | Denial of Service with Server Components — Incomplete Fix Follow-Up |
| MODERATE | Improper Middleware Redirect Handling Leads to SSRF |
| MODERATE | Cache Key Confusion for Image Optimization API Routes |
| MODERATE | Content Injection Vulnerability for Image Optimization |
| LOW | Race Condition to Cache Poisoning |
| LOW | Information exposure in dev server due to lack of origin verification |

El bypass de autorización en middleware es directamente relevante: la Fase 1 introduce middleware de
autenticación. Construir RBAC sobre 14.2.23 habría significado edificar sobre esa falla.

### Pendientes — cuatro causas raíz

Las 23 entradas restantes se reducen a cuatro paquetes. El resto son sus dependencias transitivas.

#### 5.1 `jspdf@2.5.2` — CRÍTICA — **la más explotable del proyecto**

- **Advisories:** 12, encabezadas por *jsPDF Bypass Regular Expression Denial of Service (ReDoS)*.
- **Corrección:** `jspdf@4.2.1` (salto mayor).
- **Explotabilidad real: ALTA, y no es teórica.**
  [`pdf-brand.ts:115`](../src/lib/pdf-brand.ts) llama `doc.splitTextToSize(cell.value, ...)` —
  la función donde vive el ReDoS— y `cell.value` recibe `client`, `contact`, `city` y `evidence`,
  que son **texto que el cliente escribe por WhatsApp**
  ([`quote-pdf.ts:35-48`](../src/modules/whatsapp/quote-pdf.ts)).
  Además el PDF se genera **de forma síncrona dentro del request del webhook**, que hoy es público y
  sin firma (hallazgos F-02 y F-03). Una sola cadena maliciosa bloquea el hilo del servidor.
- **Riesgo de actualizar:** medio. jsPDF 4 cambia la API y hay que verificar visualmente la plantilla
  con identidad de marca.
- **Decisión:** no se actualiza en la Fase 0.5 porque requiere revisión visual del PDF. El riesgo
  queda **mitigado en gran parte por las Fases 3 y 4**, que sacan la generación del PDF del request
  del webhook y cierran el endpoint tras validación de firma. **La actualización a jsPDF 4 debe
  hacerse antes de exponer staging a internet.**

#### 5.2 `next@14.2.35` — ALTA

- **Advisories:** 21 (8 altas, 11 moderadas, 2 bajas) + `postcss` como transitiva.
- **Corrección:** `next@16.2.12` (dos saltos mayores). **La línea 14.2 no tiene parche.**
- **Explotabilidad real: media, y depende del despliegue.** Predominan DoS del Image Optimizer,
  envenenamiento de caché de React Server Components, SSRF en rewrites y contrabando de peticiones
  HTTP. Varias aplican solo a instalaciones self-hosted; en Vercel algunas están mitigadas por la
  plataforma.
- **Riesgo de actualizar:** alto hoy. Next 15 vuelve asíncronos `params`/`searchParams` y cambia los
  valores por defecto de caché; Next 16 añade más. Son cambios que tocan casi todas las rutas
  dinámicas **sin que exista todavía una sola prueba de API o E2E que detecte la regresión**.
- **Decisión pendiente del responsable del proyecto.** La recomendación técnica es actualizar a
  Next 16 **después de la Fase 5**, cuando la suite E2E pueda demostrar que nada se rompió, y antes
  de la Fase 6 (staging).

#### 5.3 `eslint@8.57.1` — ALTA — sin impacto en producción

- **Advisories:** DoS en `minimatch`, `brace-expansion`, `glob`, `rimraf`, `flat-cache`.
- **Corrección:** `eslint@10` (salto mayor).
- **Explotabilidad real: nula en producción.** Son dependencias de desarrollo; no se empaquetan en el
  build. El vector requiere ejecutar el linter sobre patrones controlados por un atacante.
- **Decisión:** diferido. ESLint 8 está fuera de soporte, así que la actualización es deseable por
  mantenimiento, pero se coordina con la de Next porque `eslint-config-next` las acopla.

#### 5.4 `vitest@2.1.9` — CRÍTICA nominal — sin impacto en producción

- **Advisories:** lectura y ejecución arbitraria de archivos **cuando el servidor de Vitest UI está
  escuchando**, más path traversal en `vite` y el fallo de `esbuild` en su dev server.
- **Corrección:** `vitest@4` (salto mayor).
- **Explotabilidad real: nula aquí.** Este proyecto nunca levanta Vitest UI: `npm run test` es
  `vitest run`, que ejecuta y termina. Ni el dev server de Vite ni el de esbuild se exponen.
- **Decisión:** diferido a la Fase 5, donde la suite de pruebas se reestructura de todos modos.

### Resumen de decisiones

| Paquete | Severidad | Riesgo real aquí | Acción | Cuándo |
|---|---|---|---|---|
| `jspdf` | Crítica | **Alto — entrada de usuario alcanza el ReDoS** | Actualizar a v4 | Antes de exponer staging |
| `next` | Alta | Medio — depende del despliegue | Decidir salto a 16 | Después de la Fase 5 |
| `eslint` | Alta | Nulo — solo desarrollo | Actualizar a v10 | Con el salto de Next |
| `vitest` | Crítica | Nulo — no se usa Vitest UI | Actualizar a v4 | Fase 5 |

No se ejecutó `npm audit fix --force` en ningún momento.

---

## 6. Reproducibilidad verificada

La instalación se validó en dos entornos independientes:

**1. Clon limpio en Windows con caché de npm vacía.** Descarta que algo funcionara solo por binarios
ya presentes en la máquina. Los seis comandos del orden canónico terminaron con exit code 0 y
`verify:env` confirmó el motor de consultas de Prisma presente tras la descarga. Log en
[`docs/evidence/phase-0.5/01-cleanroom-install.log`](evidence/phase-0.5/01-cleanroom-install.log).

**2. Runner de GitHub Actions (`ubuntu-latest`).** Segunda plataforma, instalación desde cero.

| Paso | Resultado |
|---|---|
| Configurar Node desde `.nvmrc` | ✅ |
| Fijar versión de npm | ✅ |
| `npm ci` | ✅ |
| `npm run prisma:generate` | ✅ |
| `npm run verify:env` | ✅ |
| `npm run lint` | ✅ |
| `npm run test` | ✅ |
| `npm run build` | ✅ |

Job `Lint, test y build` → **success** en 94 s
([run 30331897343](https://github.com/lilpne25-ui/Bi-Design-CRM/actions/runs/30331897343)).

Que `verify:env` pase en Linux además de Windows confirma que la detección del motor de Prisma
funciona con ambos nombres de binario (`query_engine-windows.dll.node` y `libquery_engine-*.so.node`).
