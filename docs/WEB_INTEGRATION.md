# BI DESIGN Web → CRM

## Regla

Formulario BI DESIGN → webhook autenticado → validación/normalización/deduplicación → prospecto WEB → revisión humana.

Nunca crear ni enviar cotización automáticamente desde recepción web.

## Campos esperados

Requeridos:
- nombre
- empresa
- telefono
- correo
- ciudad
- productoServicio

Opcionales:
- requestId
- medidasAproximadas
- materialAcabado
- cantidad
- fechaRequerida
- usoLugarColocacion
- logoAplicacion
- referenciaDiseno
- comentarios
- urlPaginaOrigen
- consentimientoPrivacidad

## Seguridad

- clave solo servidor;
- `application/json`;
- validación backend;
- límite de payload;
- Prisma/queries parametrizadas;
- idempotencia;
- auditoría;
- HTTPS en publicación.
