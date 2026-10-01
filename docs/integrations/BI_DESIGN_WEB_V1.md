# BI DESIGN Web → BI DESIGN CRM — Integración V1

## Contexto correcto

Esta integración pertenece al **CRM de BI DESIGN**.

El proyecto contempla **dos CRM separados**:

1. **BI DESIGN CRM** - esta instancia actual.
2. **BI DESIGN CRM** - segunda instancia independiente que se desplegará posteriormente.

No compartirán base de datos, secretos, sesiones ni respaldos. Podrán compartir la misma base de código y arquitectura, pero serán despliegues independientes.

## Flujo BI DESIGN

```text
Formulario BI DESIGN
        ↓
Webhook HTTPS
        ↓
BI DESIGN CRM
        ↓
Prospecto WEB
        ↓
Revisión humana
        ↓
Cotizador
        ↓
Proyecto
        ↓
Garantía / Postventa
```

La web **no crea precios ni cotizaciones automáticamente**.

## Endpoint

Producción planificada para BI DESIGN:

```text
POST https://crm.bidesign.mx/api/integrations/web/leads
```

> El dominio es una propuesta de despliegue y debe confirmarse cuando se configure DNS/HTTPS.

Mientras no exista publicación HTTPS, la prueba local sigue siendo:

```text
http://127.0.0.1:3010/api/integrations/web/leads
```

**No exponer el puerto 3010 directamente a Internet.**

## Autenticación

Header preferido para BI DESIGN:

```http
X-BI-Design-Webhook-Key: <CLAVE_PRIVADA>
```

También se admite:

```http
Authorization: Bearer <CLAVE_PRIVADA>
```

Por compatibilidad con las pruebas iniciales el CRM acepta temporalmente:

```http
X-Braille-Webhook-Key: <CLAVE_PRIVADA>
```

pero para la integración final de BI DESIGN se debe usar `X-BI-Design-Webhook-Key`.

La clave:
- se genera en el servidor;
- no se incluye en esta documentación;
- no se coloca en HTML o JavaScript público;
- no se envía por query string;
- se comparte por un canal privado cuando exista staging HTTPS.

## Idempotencia

Header recomendado:

```http
X-BI-Design-Event-Id: sitejet-form-000123
```

También puede enviarse como:

```json
{
  "requestId": "sitejet-form-000123"
}
```

El mismo identificador debe conservarse si Sitejet reintenta una solicitud.

## Headers

```http
Content-Type: application/json
X-BI-Design-Webhook-Key: <CLAVE_PRIVADA>
X-BI-Design-Event-Id: sitejet-form-000123
```

## JSON

```json
{
  "requestId": "sitejet-form-000123",
  "nombre": "Carlos Lopez",
  "empresa": "Hospital ABC",
  "telefono": "+527221234567",
  "correo": "carlos@hospitalabc.mx",
  "ciudad": "Toluca, Estado de Mexico",
  "productoServicio": "Señalización / Proyecto Retail",
  "medidasAproximadas": "20 placas de 20 x 10 cm",
  "materialAcabado": "Acero inoxidable",
  "cantidad": 20,
  "fechaRequerida": "2026-09-15",
  "usoLugarColocacion": "Interior de hospital",
  "logoAplicacion": "Aplicar logotipo institucional",
  "referenciaDiseno": "Referencia proporcionada por el cliente",
  "comentarios": "Requiere visita técnica",
  "urlPaginaOrigen": "https://www.bidesign.mx/cotizacion",
  "consentimientoPrivacidad": true
}
```

## Campos obligatorios

| Campo | Tipo | CRM BI DESIGN |
|---|---|---|
| `nombre` | string | Contacto principal |
| `empresa` | string | Empresa / cliente |
| `telefono` | string | Teléfono / WhatsApp |
| `correo` | email | Correo |
| `ciudad` | string | Ciudad / estado |
| `productoServicio` | string | Tipo de proyecto / servicio |

## Campos opcionales

`requestId`, `medidasAproximadas`, `materialAcabado`, `cantidad`, `fechaRequerida`, `usoLugarColocacion`, `logoAplicacion`, `referenciaDiseno`, `comentarios`, `urlPaginaOrigen`, `consentimientoPrivacidad`.

## Resultado en BI DESIGN CRM

```text
Estado: Nuevo
Origen: WEB
Valor estimado: $0
Próxima acción: Revisar solicitud web
Cotización automática: NO
Revisión humana: SÍ
```

## Respuesta - creado

HTTP `201`

```json
{
  "ok": true,
  "action": "created",
  "leadCode": "BI-014",
  "client": "Hospital ABC",
  "message": "Solicitud recibida correctamente y prospecto creado.",
  "humanReviewRequired": true,
  "quoteCreated": false,
  "possibleDuplicateLeadCode": null
}
```

## Respuesta - expediente existente actualizado

HTTP `200`

```json
{
  "ok": true,
  "action": "updated_existing",
  "leadCode": "BI-006",
  "client": "Hospital ABC",
  "message": "Solicitud recibida y agregada al prospecto existente.",
  "humanReviewRequired": true,
  "quoteCreated": false,
  "possibleDuplicateLeadCode": null
}
```

## Respuesta - reintento detectado

HTTP `200`

```json
{
  "ok": true,
  "action": "duplicate_ignored",
  "leadCode": "BI-006",
  "message": "La solicitud ya habia sido recibida. No se genero un duplicado.",
  "humanReviewRequired": true,
  "quoteCreated": false
}
```

## Seguridad del lado de BI DESIGN CRM

- Autenticación obligatoria por secreto.
- Validación de esquema y longitudes.
- Normalización de correo y teléfono.
- Payload máximo.
- ORM Prisma / consultas parametrizadas.
- Idempotencia.
- Detección de posibles duplicados.
- ActivityLog.
- Sin acceso directo a SQLite.
- Sin cotización automática.
- HTTPS obligatorio antes de producción.
- Puerto 3010 únicamente interno.

## Seguridad solicitada en Sitejet

- Validación de campos.
- CAPTCHA.
- Webhook servidor → servidor.
- No exponer la clave en JavaScript público.
- No conectar el formulario directamente a una base de datos.
- Mantener un identificador único de envío para reintentos.

## Lo que necesitamos confirmar de Sitejet

1. Que permite configurar headers HTTP personalizados.
2. Que el webhook se ejecuta del lado servidor.
3. Que permite un `requestId` o header de Event ID estable.
4. Qué respuesta HTTP considera éxito y cómo maneja reintentos.

Cuando exista staging HTTPS se realizará una prueba conjunta antes de producción.
