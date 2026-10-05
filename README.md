# BOT BRAILLE — CRM y bot de WhatsApp de Braille International

CRM comercial con un bot de WhatsApp para **Braille International**: recibe prospectos por WhatsApp, captura los datos del proyecto mediante un flujo guiado y crea el expediente en el CRM para revisión humana.

Este repositorio documenta y lleva el **fortalecimiento del bot** antes de incorporar inteligencia artificial: primero se hace fiable lo que ya existe y después se agrega IA como capacidad adicional.

> **Origen del código.** Parte de una copia del repositorio `lilpne25-ui/Bi-Design-CRM` (rama `main`, commit `59b8838`, 23/08/2026). Parte de la documentación heredada (`AGENTS.md`, `docs/`) todavía habla de "BI DESIGN" y de SQLite; ver [Contradicciones conocidas](#contradicciones-conocidas). El README original se conserva en [`docs/legacy/README_BI_DESIGN_ORIGINAL.md`](docs/legacy/README_BI_DESIGN_ORIGINAL.md).

---

## Qué es el bot (estado real, verificado en el código)

El bot **no usa un LLM para responder**. Es un motor determinístico:

- máquina de estados (`idle → collecting → completed`) con 14 pasos de captura (`src/modules/whatsapp/options.ts`);
- preguntas, opciones y respuestas predefinidas (`src/lib/conversation-engine.ts`, `src/lib/conversation-copy.ts`);
- al terminar la captura crea o actualiza un prospecto para **revisión humana**; nunca genera ni envía cotizaciones automáticamente.

OpenAI se usa **solo para transcribir notas de voz** (`whisper-1` por defecto, `src/modules/whatsapp/speech-to-text.ts`), y únicamente en el canal Baileys. El texto transcrito entra al mismo motor como si el cliente lo hubiera escrito.

### Flujo de un mensaje

```text
WhatsApp
  ├─ Meta (Cloud API) ─┐
  ├─ Twilio ───────────┼─ POST /api/whatsapp/webhook ─ payload-normalizer.ts
  └─ Baileys (socket) ─┘  messages.upsert (+ descarga y transcripción de audio)
                          │
                          ▼
              [claimInboundEvent()]  ← idempotencia (Fase 1; hoy solo Meta, con flag)
                          │
                          ▼
         processInboundWhatsAppMessage()   src/modules/whatsapp/webhook-processor.ts
           ├─ busca/crea conversación y sesión
           ├─ processConversationMessage()   (motor determinístico)
           ├─ al completar: upsertHumanReviewLead()  (prospecto para revisión humana)
           ├─ sendWhatsAppReply()            (meta | twilio | baileys | mock)
           └─ persiste mensajes y estado
```

### Stack (verificado en `package.json`)

Next.js 14.2.35 · React 18 · TypeScript 5 · Prisma 6 (cliente 6.19.3) · **PostgreSQL** · Baileys 7 (rc) · Zod · Vitest 2 · Node.js ≥ 22.

---

## Avance

### Hoja de ruta

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Instrumentación / línea base | 🟡 Parcial: la tabla `InboundEvent` ya registra recibidos, duplicados, ignorados y fallidos |
| **1** | **Idempotencia de mensajes entrantes** | 🟡 **En curso: Meta listo (detrás de flag); Twilio y Baileys pendientes** |
| 2 | Orden, concurrencia y persistencia fiable (outbox) | ⏳ Pendiente |
| 3 | Control real bot ↔ humano | ⏳ Pendiente |
| 4 | Conversation Router compatible con el motor actual | ⏳ Pendiente |
| 5 | Comandos, FAQ y respuestas determinísticas | ⏳ Pendiente |
| 6 | Consultas al CRM + plantillas | ⏳ Pendiente |
| 7 | STT local | ⏳ Pendiente |
| 8 | Clasificación / embeddings (solo si las métricas lo justifican) | ⏳ Pendiente |
| 9 | Modelo local | ⏳ Pendiente |
| 10 | LLM externo como respaldo | ⏳ Pendiente |
| 11 | Shadow mode (la IA propone, no envía) | ⏳ Pendiente |
| 12–13 | Piloto y expansión gradual | ⏳ Pendiente |

Principio rector: **la IA será una capacidad adicional, no una dependencia** para lo que el código determinístico ya resuelve bien. Nada de automatizar ChatGPT en el navegador; solo APIs oficiales o modelos locales.

### Fase 1 — Idempotencia (lo que ya está hecho)

**Problema:** WhatsApp/Meta reentrega eventos (timeouts, reintentos). Antes, cada reentrega volvía a procesar el mensaje: modificaba la sesión, respondía otra vez y podía volver a tocar el prospecto. El `providerMessageId` se guardaba como texto decorativo, sin restricción única, y si faltaba se inventaba un UUID aleatorio.

**Solución:**

- **Tabla `InboundEvent`** (`prisma/schema.prisma`, migración aditiva `prisma/migrations/20260930120000_inbound_events`). Solo metadatos: **no** guarda texto, payload, audio, teléfono ni nombre; el ID del proveedor se guarda únicamente como hash.
- **`dedupeKey` con índice `UNIQUE`** = `sha256(["inbound-event:v1", proveedor, canal, idDelProveedor, chatScope])`. La base de datos decide quién procesa: el primer `INSERT` gana; los demás reciben `P2002` y se tratan como duplicado. Sin "SELECT y luego INSERT", así que funciona con varios procesos o instancias.
- **`claimInboundEvent()`** (`src/modules/whatsapp/inbound-events.ts`) devuelve `claimed`, `duplicate` o `unverifiable` (evento sin ID: se registra, nunca se inventa una identidad).
- **Estados:** `PROCESSING → PROCESSED | IGNORED | FAILED`. `PROCESSED` se marca en la misma transacción que guarda la conversación. `FAILED` guarda solo un código corto y seguro.
- **At-most-once (temporal):** un evento fallido o atascado queda visible pero no se reprocesa solo; los reintentos seguros llegarán con la Fase 2.
- **Webhook de Meta conectado** detrás del flag `WHATSAPP_INBOUND_IDEMPOTENCY` (**apagado por defecto** = comportamiento anterior). Con el flag activo, un duplicado responde HTTP 200 y **nunca llega al procesador**: no modifica sesión, no crea mensajes ni prospecto y no responde.

**Evidencia (PostgreSQL 16 real, contenedor desechable):**

- 20 claims simultáneos de la misma identidad desde dos clientes → **1 `claimed`, 19 `duplicate`, 1 fila**.
- Mismo payload de Meta enviado dos veces → 1 evento, 1 conversación, 1 mensaje del cliente, **1 sola respuesta**.
- Mismo texto con IDs distintos → ambos procesados. Sin `message.id` → `IGNORED`, sin respuesta.
- Con el flag apagado el duplicado se reprocesa (comportamiento anterior), lo que confirma el rollback.

**Pendiente en la Fase 1:** conectar Twilio y Baileys (en Baileys, el claim irá **antes** de descargar y transcribir el audio, para no pagar dos veces la transcripción).

### Historial de cambios

| Commit | Cambio |
|---|---|
| `chore: baseline original Braille CRM source` | Código tal como se recibió |
| `feat: add inbound event idempotency foundation` | `InboundEvent`, migración, `claimInboundEvent()` y pruebas |
| `chore: protect local WhatsApp credentials and logs` | `.gitignore`: `.wa-auth/`, `.wa-logs/`, `.env.*` |
| `refactor: store inbound provider message id only as hash` | Privacidad: el ID del proveedor solo como hash |
| `feat: enforce inbound idempotency for Meta webhook` | Integración con Meta detrás del flag |
| `docs: describe project and progress in README` | Este README |

---

## Desarrollo local

```bash
npm ci
npx prisma generate
npm run lint
npm run test
npm run build
npm run dev
```

Copia `.env.example` a `.env` y usa solo valores locales. **Nunca subas `.env`, credenciales, sesiones de WhatsApp (`.wa-auth/`), claves ni bases de datos.**

### Variables relevantes para el bot

| Variable | Uso |
|---|---|
| `WHATSAPP_PROVIDER` | `mock` (por defecto), `meta`, `twilio` o `baileys` |
| `WHATSAPP_INBOUND_IDEMPOTENCY` | `1`/`true`/`on` activa la idempotencia en el webhook de Meta. Ausente o cualquier otro valor = comportamiento anterior. Requiere la migración de `InboundEvent`. |
| `OPENAI_API_KEY`, `OPENAI_STT_MODEL`, `OPENAI_STT_LANGUAGE` | Transcripción de notas de voz (solo Baileys) |

### Pruebas de integración con PostgreSQL real

Las pruebas que demuestran la concurrencia y el flujo completo de Meta se omiten si no hay base configurada. Para correrlas contra un PostgreSQL **desechable**:

```bash
docker run --rm -d --name braille-crm-inbound-test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=crm_inbound_test -p 127.0.0.1:55432:5432 postgres:16-alpine
```

```bash
INBOUND_EVENTS_TEST_DATABASE_URL="postgresql://test:test@127.0.0.1:55432/crm_inbound_test" npx vitest run
```

```bash
docker stop braille-crm-inbound-test
```

Las pruebas se niegan a correr si la URL no es local o si el nombre de la base no termina en `_test`.

---

## Reglas de trabajo

- Cambios pequeños, probados y reversibles; nada de refactors no relacionados.
- No ejecutar migraciones contra bases reales, `prisma migrate dev` sobre datos reales ni `--force-reset`.
- Nunca deduplicar por texto o teléfono: la identidad es el evento del proveedor.
- Las garantías importantes viven en la base de datos, no en memoria.
- Ninguna cotización se genera ni se envía automáticamente: requiere revisión humana.

## Riesgos conocidos (pendientes)

- La migración de `InboundEvent` aún no se aplica a ninguna base real: el historial de migraciones heredado no reproduce el esquema actual (hallazgo F-04 en `docs/`).
- El webhook todavía no verifica la firma de Meta ni la de Twilio (tarea separada).
- La respuesta se envía **antes** de guardar la conversación (se abordará en la Fase 2).
- `ATTENDED_BY_SALES` no pausa el bot: no hay traspaso real a humano (Fase 3).
- Cada duplicado deja un `prisma:error` en el log aunque esté manejado.
- Twilio y Baileys todavía inventan un UUID cuando falta el ID del mensaje.

## Contradicciones conocidas

Documentadas, pendientes de limpieza en una fase posterior:

- `AGENTS.md` y la documentación heredada dicen que el proyecto es BI DESIGN y "no Braille International"; el proyecto **es de Braille International** (el bot ya se presenta así).
- `AGENTS.md` y `docs/legacy/README_BI_DESIGN_ORIGINAL.md` dicen SQLite; el esquema real usa **PostgreSQL**.
- Algunos reportes en `docs/` describen un flujo que creaba cotizaciones y PDF desde WhatsApp; el código actual no lo hace.
