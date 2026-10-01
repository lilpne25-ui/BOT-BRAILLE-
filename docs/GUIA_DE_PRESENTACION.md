# GUIA DE PRESENTACION - BRAILLE INTERNATIONAL

## Objetivo de la demo
Mostrar en 10 a 15 minutos como una sola herramienta puede captar leads por WhatsApp, cotizar con precios reales de catálogo, y controlar prospectos, proyectos, garantías y mantenimiento de soluciones de accesibilidad.

## Guion de 5 minutos (flujo corto)
1. Dashboard
- Abre `/` y explica KPIs, alertas y próximas acciones.
- Menciona que el flujo es comercial + operativo + postventa, y que ahora corre sobre base de datos real.

2. WhatsApp
- Ve a `/whatsapp` y muestra el estado de la sesión (conectada vía Baileys o modo mock).
- Explica que el bot recibe mensajes, hace preguntas por menú numérico, capta nombre/email/teléfono, y genera lead + cotización + PDF automáticamente.
- Abre la bandeja de mensajes para mostrar una conversación real.

3. Prospectos
- Ve a `/prospectos`.
- Abre el detalle de un lead generado por WhatsApp (o uno de ejemplo).
- Explica dolor detectado, historial, estado y próxima acción.

4. Cotizador
- Ve a `/cotizador`.
- Recorre el wizard y muestra que los precios vienen del catálogo en base de datos, no están fijos en el código.
- Genera vista previa y descarga el PDF con el branding de Braille.

## Guion de 10-15 minutos (flujo completo)
1. Repite el flujo de 5 minutos.
2. Catálogo
- Ve a `/catalogo`.
- Muestra productos, materiales y reglas de precio.
- Abre el historial de cambios / auditoría de precios para mostrar trazabilidad.
3. Profundiza en filtros de CRM y transición de estados de lead/cotización.
4. En proyectos, destaca control por estado y riesgo (tabla, kanban, calendario).
5. En garantías, destaca renovación y mantenimiento preventivo.
6. Cierra con propuesta de piloto por fases o de puesta en producción.

## Preguntas para el cliente
1. ¿El número de WhatsApp que usarían es el mismo que ya usan hoy, o uno nuevo?
2. ¿Qué datos son obligatorios para cotizar?
3. ¿Quién da seguimiento después de que el bot genera una cotización?
4. ¿Cómo controlan hoy los cambios de precio en su catálogo?
5. ¿Cómo registran evidencia de instalación?
6. ¿Cómo controlan garantías y mantenimientos?
7. ¿Qué indicadores revisa dirección cada semana?
8. ¿Qué usuarios y permisos necesitan desde el día uno?

## Que no prometer
- No afirmar que el bot de WhatsApp ya está conectado a su número de producción (requiere configurar `WHATSAPP_PROVIDER` con sus credenciales o vincular Baileys).
- No afirmar que reemplaza ERP/sistemas actuales hoy.
- No afirmar que está listo para producción sin definir usuarios, permisos y respaldo de base de datos.
- No afirmar que los datos de ejemplo (leads, cotizaciones, montos) del ambiente de demo son de clientes reales.

## Que si prometer
- El CRM, catálogo, cotizador y PDF ya corren sobre base de datos real (Prisma), no son datos estáticos.
- El bot de WhatsApp funciona de extremo a extremo: recibe mensaje, conversa, cotiza con precios del catálogo y genera PDF.
- Se puede vincular a un número de WhatsApp real en minutos (QR con Baileys) o integrarse con Meta Cloud API.
- Se puede convertir en piloto rápido por módulo, o iniciar puesta en producción si el flujo ya calza con su operación.

## Cierre sugerido de reunión
"Este no es solo un mockup: el CRM, el catálogo de precios y el bot de WhatsApp ya funcionan de punta a punta. El siguiente paso es un diagnóstico corto para conectar su número de WhatsApp y su catálogo real, y definir el piloto enfocado en el módulo crítico para ustedes."

## Fase 1 y Fase 2 recomendadas
- Fase 1: WhatsApp bot + CRM + catálogo real + cotizador + PDF.
- Fase 2: Proyectos + garantías + mantenimiento + alertas avanzadas + usuarios/permisos.

## Nota de transparencia
El ambiente de demo usa datos de ejemplo (leads, cotizaciones, montos y contactos simulados) para no exponer información sensible real, pero la aplicación, la base de datos y el bot de WhatsApp son funcionales, no un mockup estático.
