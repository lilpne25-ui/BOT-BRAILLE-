# REPORTE — BRAILE INTERNATIONAL · PRODUCTION READINESS PHASE 1

> Documento vivo. Se actualiza al cierre de cada fase, siguiendo la plantilla de la sección 7 del
> plan maestro V2.
> Estado global: **EN PROGRESO — Fases 0 y 0.5 completadas**.

| Campo | Valor |
|---|---|
| Repositorio | `lilpne25-ui/Bi-Design-CRM` |
| Rama base | `main` (`279b338`) |
| Rama de trabajo | `feat/production-readiness-phase-1` |
| Fecha de auditoría | 2026-07-27 |
| Entorno de auditoría | Windows 11 Home 10.0.26200 · Node v24.18.0 · npm 12.0.1 |
| Plan de referencia | `PLAN_MAESTRO_IMPLEMENTACION_BRAILE_PRODUCTION_READINESS_V2.md` (rev. 01) |

La numeración de fases de este reporte sigue la del plan V2: **0** auditoría, **0.5** entorno y CI,
**1** auth/RBAC, **2** PostgreSQL, **3** webhook e idempotencia, **4** Meta, **5** E2E, **6** staging.

---

# FASE 0 — AUDITORÍA EJECUTABLE

## 1. Resumen ejecutivo (Fase 0)

La línea base **compila, pasa lint y pasa las 22 pruebas existentes**. El reporte previo de 22/22 es
correcto y se reprodujo desde una instalación limpia (`npm ci`). No hay bloqueo para continuar.

Sin embargo, "verde" no significa "listo para producción". La auditoría confirma que el sistema hoy
es una **aplicación sin autenticación, con un webhook público sin verificación de firma y sin ninguna
garantía de idempotencia**. Cualquier persona con la URL puede leer y modificar el CRM, cambiar
precios del catálogo suplantando a un usuario, resetear la sesión de WhatsApp y disparar la creación
de leads, cotizaciones y envío de PDFs enviando un POST al webhook. Además, la capa de migraciones
está desalineada con el esquema real, por lo que hoy **no existe una forma reproducible de levantar
la base de datos**.

Las tres prioridades reales, en orden, son: autenticación/RBAC (Fase 1), firma + idempotencia del
webhook (Fase 3) y migraciones reproducibles sobre PostgreSQL (Fase 2).

---

## 2. Estado inicial encontrado

### 2.1 Stack y superficie

| Aspecto | Estado |
|---|---|
| Framework | Next.js 14.2.23 (App Router) + TypeScript 5.7 |
| ORM / BD | Prisma 6.16 · `datasource provider = "sqlite"` |
| Pruebas | Vitest 2.1 · 4 archivos · **22 pruebas** (todas unitarias puras) |
| Rutas API | 21 archivos `route.ts` · 26 handlers HTTP |
| Páginas | 9 rutas de UI |
| Proveedores WhatsApp | `mock` · `meta` (parcial) · `twilio` (solo texto) · `baileys` (completo) |
| CI | **No existe** (`.github/` ausente) |
| Autenticación | **No existe** (sin `middleware.ts`, sin login, sin campo de contraseña) |

### 2.2 Modelo de datos

23 modelos/enums en `prisma/schema.prisma`. El modelo `User` tiene `role` (`ADMIN`/`SALES`/`OPERATIONS`)
pero **no tiene campo de contraseña ni de sesión**: los roles existen como dato, no como control.

### 2.3 Secretos

No hay secretos versionados. `.gitignore` cubre `.env`, `.env*.local`, `prisma/dev.db`, `.wa-auth`,
`.wa-logs`. El único archivo de entorno en Git es `.env.example`, con placeholders.
Confirmado con `git ls-files | grep -Ei '(\.env|\.db$|\.pem|auth|secret|creds)'` → solo `.env.example`.

---

## 3. Resultados de la línea base ejecutable

Ejecutado sobre un árbol limpio en `main@279b338`, `node_modules` reinstalado desde cero con `npm ci`.

| # | Comando | Resultado | Duración | Advertencias | Errores | Acción requerida |
|---|---|---|---|---|---|---|
| 1 | `node --version` | `v24.18.0` | — | El README declara Node 18+; se auditó con 24 | — | Fijar versión de Node (`.nvmrc` / `engines`) para reproducibilidad |
| 2 | `npm --version` | `12.0.1` | — | npm 12 **bloquea install scripts** por defecto | — | Declarar `allowScripts` o fijar npm en CI (ver F-11) |
| 3 | `npm ci` | ✅ exit 0 · 676 paquetes | 50 s | 9 paquetes deprecados · **19 vulnerabilidades (3 críticas, 11 altas, 5 moderadas)** · 9 install scripts bloqueados | — | Remediar vulnerabilidades; `next@14.2.23` tiene aviso de seguridad publicado |
| 4 | `npm run prisma:generate` | ✅ exit 0 | 3 s | `package.json#prisma` deprecado (se elimina en Prisma 7) | — | Migrar a `prisma.config.ts` |
| 5 | `npm run lint` | ✅ exit 0 · sin hallazgos | 3 s | — | — | Ninguna |
| 6 | `npm run test` | ✅ exit 0 · **22/22 pasadas** (4 archivos) | 5 s | API CJS de Vite deprecada | — | Cobertura insuficiente (ver F-09) |
| 7 | `npm run build` | ✅ exit 0 · 12 páginas · 21 rutas API | 60 s | — | — | Ninguna |

**Comandos adicionales de verificación (fuera del guion, ejecutados como evidencia):**

| Comando | Resultado | Lectura |
|---|---|---|
| `npx prisma migrate status` (sin `.env`) | ❌ `P1012 — Environment variable not found: DATABASE_URL` | No existe `.env` local; un clon limpio no arranca sin pasos no documentados |
| `DATABASE_URL="file:./dev.db" npx prisma migrate status` | ❌ `P1003 — Database dev.db does not exist` | La base local no está inicializada y no se crea con los comandos del guion |
| `npm audit` | 19 vulnerabilidades (3 críticas) | Ver F-10 |

**Conclusión de la Fase 0:** la línea base **no falla**. Se continúa a las fases siguientes sin bloqueo.

---

## 4. Hallazgos de la auditoría

Severidad: **C** crítico · **A** alto · **M** medio · **B** bajo.

### F-01 · **C** — Ausencia total de autenticación y autorización

No existe `src/middleware.ts`, ni página de login, ni sesión, ni campo de contraseña en `User`.
Las 26 rutas API y las 9 páginas son públicas.

Caso concreto en [`src/app/api/catalog/route.ts:29`](../src/app/api/catalog/route.ts): el `POST` que
cambia precios toma el `userId` **del cuerpo de la petición** y lo usa para firmar el registro de
auditoría. Cualquiera puede modificar el precio base de un producto y atribuir el cambio a otro
usuario. La "auditoría de precios" que muestra el catálogo es, por diseño actual, falsificable.

Igual de expuestos están `POST /api/whatsapp/baileys/reset`, `/connect` y `/disconnect`: un tercero
puede tumbar o reiniciar la sesión de WhatsApp de la empresa sin credencial alguna.

→ Fase 1.

### F-02 · **C** — Webhook de WhatsApp sin verificación de firma

`POST /api/whatsapp/webhook` ([`route.ts:31`](../src/app/api/whatsapp/webhook/route.ts)) no valida
`X-Hub-Signature-256`. Búsqueda de `x-hub-signature|createHmac|APP_SECRET|timingSafeEqual` en `src/`:
**cero coincidencias**. El endpoint acepta cualquier JSON con forma de payload de Meta y ejecuta el
flujo comercial completo: crea lead, crea cotización, genera PDF y lo envía por WhatsApp.

Además el `GET` de verificación compara el token con `===` (comparación no constante) y el `catch`
del `POST` hace `console.error` del error completo, que puede arrastrar contenido del mensaje.

→ Fase 3.

### F-03 · **C** — Sin idempotencia y sin separación recepción/procesamiento

No existe tabla de mensajes entrantes. El `providerMessageId` solo se guarda como texto decorativo
en `ConversationMessage.stepId` (`provider:<id>`, [`webhook-processor.ts:517`](../src/modules/whatsapp/webhook-processor.ts))
y **no tiene restricción única**. No hay ninguna consulta previa que verifique si el mensaje ya se
procesó.

Consecuencia: un reintento de Meta (que reintenta ante timeout o ante respuesta ≠ 2xx) vuelve a
ejecutar todo el flujo. En el peor caso genera lead duplicado, cotización duplicada con folio nuevo,
PDF regenerado y **un segundo PDF enviado al cliente**.

Agravante: el webhook procesa de forma **síncrona dentro del request** (`for … await processInboundWhatsAppMessage`),
y ese procesamiento incluye generación de PDF y llamadas de red al proveedor. Es exactamente el
patrón que provoca los timeouts que disparan los reintentos.

→ Fase 3.

### F-04 · **A** — Migraciones desalineadas con el esquema; no hay camino reproducible

Tres problemas encadenados:

1. `prisma/migrations/migration_lock.toml` declara `provider = "postgresql"`, pero
   `prisma/schema.prisma:6` declara `provider = "sqlite"`. Prisma no puede operar así.
2. Las dos migraciones existentes están escritas en SQL de PostgreSQL (`CREATE SCHEMA`, `CREATE TYPE … AS ENUM`)
   y `20260601114906_init_backend/migration.sql` está **codificada en UTF-16LE** (artefacto de haber
   sido generada con una redirección de PowerShell).
3. Ninguna de las dos migraciones contiene el valor `CATALOG_UPDATED` del enum `ActivityType`, que sí
   existe en `schema.prisma` y sí se usa en el código. Las migraciones no reproducen el esquema real.

En paralelo existe `prisma/sqlite-init.sql` (289 líneas, generado con `migrate diff`), que es el
camino que realmente usa `npm run db:setup`. Es decir: hay **dos fuentes de verdad divergentes** y la
que funciona no está versionada como migración.

→ Fase 2.

### F-05 · **A** — Dinero almacenado en `Float`

13 campos `Float` en el esquema, incluidos `Quote.subtotal`, `Quote.installation`, `Quote.tax`,
`Quote.total`, `QuoteItem.unitPrice`, `QuoteItem.installationCost` y `Lead.estimatedValue`. En
PostgreSQL esto mapea a `DOUBLE PRECISION`: acumulación de error en sumas de partidas y totales que
no cuadran contra el PDF emitido al cliente.

→ Fase 2 (migrar a `Decimal`; revisar el redondeo en `quote-calculator.ts`).

### F-06 · **A** — Proveedor Meta incompleto y sin manejo de errores

En [`src/modules/whatsapp/provider.ts`](../src/modules/whatsapp/provider.ts):

- `sendWhatsAppDocument` **lanza excepción** para `meta` y `twilio` (`"Document send is not implemented
  for provider mode: meta"`). No existe carga de medios ni envío por `media id`. El envío de PDF hoy
  funciona **solo con Baileys**, que es una biblioteca no oficial.
- `sendWithMeta` no distingue `401` (token expirado), `429` (rate limit) ni `5xx`. Cualquier fallo es
  un `Error` genérico, sin reintento ni backoff.
- El mensaje de error incluye `await response.text()` **completo**. Ese texto termina persistido en
  `ConversationSession.lastError` y en `ActivityLog.metadata` ([`webhook-processor.ts:536`](../src/modules/whatsapp/webhook-processor.ts)),
  sin redacción.

→ Fase 4.

### F-07 · **M** — Scripts de base de datos atados a Windows

`prisma:init-sqlite` y `prisma:reset-sqlite` en `package.json` invocan `cmd /c` con `if exist` y `del /f /q`.
No corren en Linux ni macOS, y por tanto **no corren en GitHub Actions**. `npm run db:setup` depende de ambos.

→ Fase 2.

### F-08 · **M** — Sin integración continua

No existe `.github/`. Nada impide fusionar un PR que rompa lint, pruebas o build.

→ Fase 0.5.

### F-09 · **M** — Cobertura de pruebas insuficiente para el riesgo del sistema

Las 22 pruebas cubren funciones puras: motor de conversación (10), calculadora de cotizaciones (5),
transcripción de voz (6), mappers (1). **Cero** pruebas de rutas API, del webhook, de persistencia,
de autorización o E2E. Los tres riesgos críticos (F-01, F-02, F-03) están completamente sin cubrir.

→ Fase 5.

### F-10 · **M/A** — Vulnerabilidades en dependencias

`npm audit`: 19 vulnerabilidades — **3 críticas, 11 altas, 5 moderadas**. `npm ci` reporta además que
`next@14.2.23` tiene un aviso de seguridad publicado y recomienda actualizar.

→ Atender antes de exponer staging a internet.

### F-11 · **M** — Reproducibilidad del entorno de instalación

npm 12 bloqueó 9 install scripts, incluidos los de `@prisma/client`, `@prisma/engines`, `esbuild` y
`sharp`. En esta máquina el build funcionó igual (los engines ya estaban en caché), pero en un runner
de CI limpio ese bloqueo puede dejar a Prisma sin motor de query. El proyecto no fija versión de Node
ni de npm.

→ Fase 0.5.

### F-12 · **M** — Logs sin redacción de datos sensibles

`console.error("WhatsApp webhook error", error)` en el webhook, y respuestas completas de proveedor
persistidas en base de datos (ver F-06). `pino` está instalado como dependencia pero no se usa como
logger estructurado con redacción.

→ Fases 3 y 4.

### F-13 · **B/M** — Un clon limpio no arranca

No hay `.env` (correctamente ignorado) y `prisma/dev.db` no existe. El primer `prisma migrate status`
falla por `DATABASE_URL` ausente. El README indica `cp .env.example .env`, pero ese comando no existe
en PowerShell, que es el shell documentado para este proyecto (`INICIAR_DEMO_WINDOWS.bat`).

→ Fase 6.

### F-14 · **B** — README desalineado con el estado real

Declara Node 18+/npm 9+ (se audita con 24/12), presenta Meta Cloud API como alternativa equivalente a
Baileys cuando no puede enviar documentos, y no menciona en ningún punto que el sistema no tiene
autenticación. La sección "Despliegue en Vercel" da por hecho un flujo de migraciones que hoy no
funciona (F-04).

→ Fase 6.

---

## 5. Matriz de riesgo → fase

| Hallazgo | Sev. | Fase que lo resuelve | Criterio de aceptación asociado |
|---|---|---|---|
| F-01 Sin auth/RBAC | C | 1 | "Las APIs están protegidas" · "Los roles se validan en servidor" |
| F-02 Webhook sin firma | C | 3 | "Una firma inválida es rechazada" |
| F-03 Sin idempotencia | C | 3 | "Un webhook duplicado genera un solo efecto" |
| F-04 Migraciones rotas | A | 2 | "Existe una migración reproducible" · "PostgreSQL funciona en staging" |
| F-05 Dinero en `Float` | A | 2 | "Cálculos monetarios sin pérdida de precisión" |
| F-06 Meta incompleto | A | 4 | "Meta puede enviar texto y PDF" · "Los errores se reintentan sin duplicar" |
| F-07 Scripts Windows-only | M | 2 | — (habilita el CI de la Fase 0.5) |
| F-08 Sin CI | M | 0.5 | ✅ Cerrado — quality gate en cada PR |
| F-09 Cobertura | M | 5 | "Todas las pruebas están en verde" |
| F-10 Vulnerabilidades | M/A | 0.5 | 🟡 Parcial — clasificadas y remediadas las no-breaking |
| F-11 Entorno no fijado | M | 0.5 | ✅ Cerrado — "El build se ejecuta desde un entorno limpio" |
| F-12 Logs sin redacción | M | 3/4 | "Existen logs con datos sensibles redactados" |
| F-13 Clon limpio no arranca | B/M | 6 | "README y `.env.example` reflejan el estado real" |
| F-14 README desalineado | B | 6 | idem |

---

## 6. Revisión del plan maestro V2 — huecos detectados

Al revisar el plan V2 antes de ejecutarlo aparecieron cinco huecos. No son defectos del código: son
puntos donde el plan, tal como está escrito, permitiría marcar una fase como aceptada dejando el
riesgo abierto. Se registran aquí para que se cierren en la fase correspondiente.

### G-1 · **C** — Twilio es un bypass completo de la Fase 3

La Fase 3 valida únicamente `X-Hub-Signature-256`. Pero el webhook bifurca por `content-type`: si
llega `application/x-www-form-urlencoded` entra por `fromTwilioForm()`
([`payload-normalizer.ts:69`](../src/modules/whatsapp/payload-normalizer.ts)) y **nunca pasa por la
ruta de Meta**. Un atacante envía un POST form-urlencoded y esquiva la validación entera, con el
criterio "una firma inválida no genera efectos" marcado en verde.

→ Decidir en la Fase 3: eliminar la rama Twilio o validar también `X-Twilio-Signature`.

### G-2 · **C** — Baileys no pasa por el webhook

[`baileys-client.ts:410`](../src/modules/whatsapp/baileys-client.ts) llama
`processInboundWhatsAppMessage()` **directamente**, sin pasar por `/api/whatsapp/webhook`. El flujo
descrito en la Fase 3 (`recibir → validar firma → persistir → encolar`) asume que el webhook es la
única entrada. Si la idempotencia se implementa en el route handler, Baileys —que es hoy el único
proveedor que realmente envía PDFs— queda sin deduplicación.

→ La persistencia de `InboundMessage` y el encolado deben vivir en una capa de ingreso compartida por
ambos proveedores, no en la ruta HTTP.

### G-3 · **M** — Falta el secreto del worker

El guion original exigía "proteger cualquier endpoint de worker o cron mediante un secreto
independiente". El plan V2 solo menciona "panel o endpoint interno de estados, protegido". Si el
worker se dispara por HTTP necesita su propio secreto, distinto de la sesión de usuario.

→ Fase 3.

### G-4 · **M** — Sin control de fuerza bruta en el login

La Fase 1 prueba "login incorrecto" pero no define throttling ni bloqueo de cuenta. La Fase 6 mide
"logins fallidos" como métrica: se mide algo que nadie limita.

→ Fase 1.

### G-5 · **B** — Decisiones de herramienta sin tomar

La Fase 5 invoca `npm run test:e2e` y `npm run test:integration` sin definir framework de E2E ni cómo
se levanta PostgreSQL para las pruebas de integración.

→ Decidir al inicio de la Fase 2 (PostgreSQL de pruebas) y de la Fase 5 (E2E).

---

# FASE 0.5 — ESTABILIZACIÓN DEL ENTORNO Y CI MÍNIMO

## Identificación

| Campo | Valor |
|---|---|
| Fase | 0.5 — Estabilización del entorno y CI mínimo |
| Estado | ✅ **Aceptada** (con una decisión pendiente del responsable, ver Riesgos) |
| Fecha | 2026-07-27 |
| Rama | `feat/production-readiness-phase-1` |
| Commit inicial | `10cd8ce` |
| Rama publicada | `origin/feat/production-readiness-phase-1` |
| PR | [#5](https://github.com/lilpne25-ui/Bi-Design-CRM/pull/5) |
| CI | [run 30331897343](https://github.com/lilpne25-ui/Bi-Design-CRM/actions/runs/30331897343) — `Lint, test y build` **success** (94 s) |
| Responsable | Roy Lira |

## Objetivo

Dejar el entorno reproducible desde un clon limpio y con un quality gate automático, antes de tocar
autenticación, base de datos o WhatsApp.

## Actividades ejecutadas

| Actividad | Resultado | Horas |
|---|---|---:|
| 0.5.1 Fijar versiones de Node y npm | `.nvmrc` + `engines`; CI lee `.nvmrc` | 0.3 |
| 0.5.2 Corregir instalación reproducible | 7 install scripts aprobados sin pin; `verify:env` | 0.9 |
| 0.5.3 Auditoría de dependencias | `next@14.2.35` + `npm audit fix`; 23 restantes clasificadas | 1.1 |
| 0.5.4 CI mínimo | `ci.yml` con 2 jobs, validado sintácticamente en local | 0.5 |
| 0.5.5 Protección del flujo Git | Rama en uso; push y PR en borrador | 0.2 |
| Verificación en sala limpia | Clon nuevo + caché vacía, 6 comandos en verde | 0.4 |
| Documentación | `ENVIRONMENT_AND_CI.md` + actualización del reporte | 0.6 |

## Archivos creados

| Ruta | Propósito |
|---|---|
| `.nvmrc` | Versión canónica de Node (24.18.0) que consume CI |
| `scripts/verify-env.mjs` | Verificación de entorno multiplataforma, sin `cmd /c` |
| `.github/workflows/ci.yml` | Quality gate bloqueante + auditoría informativa |
| `docs/ENVIRONMENT_AND_CI.md` | Entorno, install scripts y clasificación de vulnerabilidades |
| `docs/evidence/phase-0.5/` | Logs de sala limpia, lint, test, build y comparativa de `npm audit` |

## Archivos modificados

| Ruta | Cambio |
|---|---|
| `package.json` | `engines`, `allowScripts`, script `verify:env`, `next`/`eslint-config-next` a 14.2.35, corrección del mojibake de la descripción |
| `package-lock.json` | Resolución tras la actualización y `npm audit fix` |

## Decisiones técnicas

| Decisión | Alternativas | Motivo | Impacto |
|---|---|---|---|
| Node canónico en `.nvmrc` (24.18.0) y piso mínimo en `engines` (≥22.11.0) | Fijar una única versión exacta también en `engines` | CI necesita reproducibilidad exacta; una máquina de desarrollo con otra LTS no debería quedar bloqueada | CI determinista sin fricción local |
| Fijar npm 12.0.1 en CI | Usar el npm que trae Node 24 (11.x) | npm 11 **no** bloquea install scripts; sin el pin, CI y local aplicarían políticas distintas | CI y local equivalentes |
| Aprobar install scripts **sin fijar versión** | Dejar el pin `pkg@x.y.z` que escribe npm por defecto | Se comprobó en vivo: al subir Prisma 6.16.0 → 6.19.3 la aprobación fijada dejó de aplicar y los scripts se bloquearon en silencio | Las subidas de parche no reabren el problema |
| `next` a 14.2.35, no a 15/16 | Salto mayor inmediato | Cierra el CRÍTICO de bypass de middleware sin breaking changes, sobre una base que aún no tiene pruebas de API ni E2E que detecten regresiones | Riesgo residual documentado; decisión de salto mayor diferida |
| `dependency-audit` informativo, no bloqueante | Bloquear el merge con `npm audit` | Quedan vulnerabilidades sin parche fuera de un salto mayor; bloquear dejaría el CI en rojo permanente y se dejaría de leer | Visibilidad sin ruido; pasa a bloqueante cuando se cierren los saltos mayores |
| Verificar con caché de npm vacía | Confiar en el `npm ci` local | El objetivo de la fase es eliminar dependencias de binarios cacheados | Se demostró que Prisma descarga su motor de verdad |

## Comandos ejecutados

Todos sobre `feat/production-readiness-phase-1`, salvo indicación contraria.

| Comando | Exit | Resultado | Duración |
|---|---:|---|---:|
| `npm install next@14.2.35 eslint-config-next@14.2.35` | 0 | Actualización aplicada | 34 s |
| `npm audit fix` | 1 | 6 paquetes resueltos; exit 1 esperado por vulnerabilidades restantes | 30 s |
| `npm install-scripts approve … --no-allow-scripts-pin` | 0 | 7 paquetes aprobados por nombre | — |
| `npm ci` | 0 | 675 paquetes | 34 s |
| `npm run prisma:generate` | 0 | Cliente generado | 2 s |
| `npm run verify:env` | 0 | 7 OK, 2 advertencias, 0 fallos | 3 s |
| `npm run lint` | 0 | Sin hallazgos | 2 s |
| `npm run test` | 0 | 22/22 | 2 s |
| `npm run build` | 0 | Next.js 14.2.35, 12 páginas | 51 s |

### Verificación en sala limpia

Clon nuevo del repositorio en un directorio temporal, con `npm_config_cache` apuntando a un
directorio **vacío**, para descartar que algo funcione por binarios ya presentes en la máquina.

| Comando | Exit | Duración |
|---|---:|---:|
| `git clone` (rama de trabajo) | 0 | — |
| `npm ci` | 0 | 45 s |
| `npm run prisma:generate` | 0 | 2 s |
| `npm run verify:env` | 0 | 3 s |
| `npm run lint` | 0 | 3 s |
| `npm run test` | 0 | 1 s |
| `npm run build` | 0 | 57 s |

Resultado clave: `verify:env` reportó el motor de consultas presente
(`query_engine-windows.dll.node`) **con la caché vacía**, lo que demuestra que se descargó durante la
instalación y no estaba preexistente. Log completo en
[`docs/evidence/phase-0.5/01-cleanroom-install.log`](evidence/phase-0.5/01-cleanroom-install.log).

### Ejecución en el runner de CI

Segunda plataforma, instalación desde cero en `ubuntu-latest`.

| Paso | Resultado |
|---|---|
| Configurar Node desde `.nvmrc` | ✅ success |
| Fijar versión de npm (12.0.1) | ✅ success |
| `npm ci` | ✅ success |
| `npm run prisma:generate` | ✅ success |
| `npm run verify:env` | ✅ success |
| `npm run lint` | ✅ success |
| `npm run test` | ✅ success |
| `npm run build` | ✅ success |
| Publicar logs | ✅ success |

Job `Lint, test y build` → **success en 94 s**. El gate de salida de la Fase 0.5 queda cerrado.

Que `verify:env` pase también en Linux confirma que la detección del motor de Prisma funciona con
los dos nombres de binario posibles (`query_engine-windows.dll.node` y `libquery_engine-*.so.node`).

### Defecto corregido en el workflow

El job informativo `dependency-audit` **aparecía en rojo** en el pull request. Causa: se usó
`continue-on-error: true` a nivel de job, que impide que el workflow falle pero **no evita que el
check se muestre como fallido**. El efecto era exactamente el que se quería evitar: un check
permanentemente rojo que se deja de leer.

Corregido en `c0f4a32`: el job ya no depende de ese mecanismo. Publica un resumen agrupado por
paquete raíz en el sumario del run mediante `scripts/audit-summary.mjs` (también disponible como
`npm run audit:summary`) y emite una anotación de aviso cuando hay críticas, sin devolver código de
error.

## Pruebas

| Suite | Pruebas | Aprobadas | Fallidas |
|---|---:|---:|---:|
| `src/lib/conversation-engine.test.ts` | 10 | 10 | 0 |
| `src/modules/whatsapp/speech-to-text.test.ts` | 6 | 6 | 0 |
| `src/lib/quote-calculator.test.ts` | 5 | 5 | 0 |
| `src/modules/whatsapp/mappers.test.ts` | 1 | 1 | 0 |
| **Total** | **22** | **22** | **0** |

Esta fase no agrega pruebas de Vitest: no cambia comportamiento de la aplicación. Sí agrega dos
verificaciones ejecutables nuevas — `npm run verify:env` y el propio workflow de CI.

## Evidencias

- Logs de sala limpia, lint, test y build: `docs/evidence/phase-0.5/`
- Comparativa de `npm audit` en los tres momentos: `docs/evidence/phase-0.5/05-npm-audit.md`
- Clasificación por explotabilidad: `docs/ENVIRONMENT_AND_CI.md` §5
- Workflow: `.github/workflows/ci.yml`
- Commits: `4fa539b`, `7c57a10`, `d322335`

## Riesgos

| Riesgo | Severidad | Mitigación | Estado |
|---|---|---|---|
| `jspdf@2.5.2` con ReDoS alcanzable desde texto de WhatsApp | **Alta** | Fases 3 y 4 sacan el PDF del request y cierran el webhook; actualizar a jsPDF 4 antes de exponer staging | **Abierto** |
| 21 advisories sin parche en la línea 14.2 de Next | Media | Decisión de salto a Next 16 después de la Fase 5, con E2E que respalde la migración | **Requiere decisión** |
| `eslint@8` y `vitest@2` con advisories | Baja | Solo desarrollo, no se empaquetan; Vitest UI nunca se levanta | Diferido |
| CI verificado solo sintácticamente en local | Media | Ejecutado en `ubuntu-latest`: gate en verde en 94 s | ✅ **Cerrado** |
| El repositorio es público y este reporte documenta un vector explotable (`jspdf`) sobre un endpoint sin autenticación | Media | Decisión del responsable: mantener el repositorio público asumiendo el riesgo, o hacerlo privado hasta cerrar las Fases 1 y 3 | **Requiere decisión** |

## Bloqueadores

| Bloqueador | Responsable externo | Acción | Estado |
|---|---|---|---|
| PR en borrador: `gh` CLI no está instalado y su instalación fue denegada por la política de permisos del entorno | Roy Lira | PR [#5](https://github.com/lilpne25-ui/Bi-Design-CRM/pull/5) abierto manualmente | ✅ **Resuelto** |
| Ejecución del workflow en el runner no verificada | — | Verificada vía API pública de GitHub: job `Lint, test y build` en success | ✅ **Resuelto** |
| PostgreSQL no disponible localmente (sin Docker ni psql) | Roy Lira | Instalar PostgreSQL nativo en Windows (decisión tomada) | Pendiente para la Fase 2 |

## Horas

| Concepto | Valor |
|---|---|
| Planeadas (plan V2) | 3–5 h |
| Reales | 4.0 h |
| Variación | Dentro del rango |

## Resultado

- [x] **Aceptado** — gate verificado en verde en el runner; sin salvedades pendientes de ejecución.
- [ ] Parcial
- [ ] Rechazado
- [ ] Bloqueado

### Criterios de aceptación de la fase

- [x] Las versiones están fijadas.
- [x] `npm ci` funciona en CI — verificado en `ubuntu-latest`, run 30331897343.
- [x] Prisma genera cliente sin depender de caché — demostrado con caché vacía en Windows y en un runner limpio de Linux.
- [x] Lint, pruebas y build se ejecutan automáticamente.
- [x] Un PR no puede considerarse listo con CI rojo.
- [x] Las vulnerabilidades están clasificadas, no solo enumeradas.
- [x] El entorno puede reproducirse sin cachés locales.

## Próxima prioridad

Fase 1, actividad 1.1: inventario de las 26 operaciones HTTP y las 9 páginas en
`docs/API_AUTHORIZATION_MATRIX.md`, seguido del ADR de autenticación.

---

# SEGUIMIENTO GLOBAL

## Horas acumuladas

| Fase | Actividad | Horas reales |
|---|---|---:|
| 0 | Lectura de código y auditoría | 0.6 |
| 0 | Ejecución y registro de línea base | 0.3 |
| 0 | Redacción del reporte | 0.3 |
| — | Revisión del plan maestro V2 | 0.4 |
| 0.5 | Entorno, dependencias, CI y documentación | 4.0 |
| | **Total consumido** | **5.6** |

**Estimación revisada de horas restantes:** 61–90 h.

| Fase | Estimación restante |
|---|---|
| 1 — Autenticación y RBAC | 12–18 h |
| 2 — PostgreSQL, migraciones y dinero | 14–22 h |
| 3 — Firma, idempotencia y procesamiento | 16–24 h |
| 4 — Meta Cloud API completa | 7–11 h |
| 5 — Integración y E2E finales | 7–10 h |
| 6 — Staging, respaldo y cierre | 6–10 h |

Se adopta la estimación del plan V2, más conservadora que la de la Fase 0 (46–62 h). El alcance
adicional de V2 —correlation IDs, observabilidad, UAT, pruebas distribuidas por fase— justifica la
diferencia. Se añade la actualización de `jspdf` a la Fase 4 y el cierre de G-1 y G-2 a la Fase 3,
ambos dentro de los rangos anteriores.

## Dependencias externas pendientes

1. **Credenciales de Meta WhatsApp Cloud API** (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   app secret). Sin ellas la Fase 4 se entrega con mocks y la prueba real queda pendiente.
2. **PostgreSQL local** — decisión tomada: instalador nativo de Windows. Pendiente de instalar.
3. **PostgreSQL de staging y host de staging**, para las evidencias de la Fase 6.
4. **Usuarios para el UAT** de la Fase 6.

Conforme a la regla 14 del plan, todo lo que dependa de estas credenciales se implementa con mocks,
se documenta qué prueba real queda pendiente y el estado se marca **Parcial**.

## Estado por fase

| Fase | Estado |
|---|---|
| 0 — Auditoría ejecutable | ✅ **Aceptada** |
| 0.5 — Entorno, dependencias y CI mínimo | ✅ **Aceptada** |
| 1 — Autenticación y RBAC | ⬜ Pendiente |
| 2 — PostgreSQL, migraciones y dinero | ⬜ Pendiente |
| 3 — Firma, idempotencia y procesamiento | ⬜ Pendiente |
| 4 — Meta Cloud API completa | ⬜ Pendiente |
| 5 — Integración y E2E finales | ⬜ Pendiente |
| 6 — Staging, respaldo y cierre | ⬜ Pendiente |
