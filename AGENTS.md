# AGENTS.md — BI DESIGN CRM

Este archivo define las reglas obligatorias para cualquier agente, asistente de código o automatización que modifique este repositorio.

## 1. Identidad

Este repositorio corresponde exclusivamente a **BI DESIGN CRM**.

No es el CRM de Braille International.

Nunca mezcles:

- bases de datos;
- secretos;
- dominios;
- logos o identidad visual;
- números de WhatsApp;
- Meta Business / Apps;
- historiales Git;
- documentación de operación;
- respaldos;
- credenciales;
- ambientes de despliegue.

## 2. Principio principal

**No romper lo que ya funciona.**

Antes de cambiar código:

1. identifica el módulo afectado;
2. revisa contratos, API y pruebas;
3. limita el cambio al menor conjunto de archivos;
4. evita refactors no relacionados;
5. conserva compatibilidad con datos existentes;
6. documenta cambios de comportamiento.

## 3. Stack esperado

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Prisma 6
- SQLite
- Vitest
- Node.js 24

No cambies framework, ORM o base de datos sin una decisión explícita de arquitectura.

## 4. Base de datos

- No ejecutar `npm run db:setup` contra datos operativos.
- No ejecutar `prisma db push --force-reset`.
- No borrar/recrear SQLite para resolver errores de esquema.
- No ejecutar seeds sobre base real salvo instrucción explícita.
- Toda modificación Prisma debe considerar migración, compatibilidad y rollback.
- Nunca versionar `.db`, `.sqlite`, `.sqlite3`.

## 5. Secretos

Nunca versionar o solicitar:

- `.env`;
- claves webhook;
- `AUTH_SECRET`;
- Meta App Secret;
- access tokens;
- contraseñas;
- cookies/sesiones;
- QR de WhatsApp;
- contenido de carpetas `secrets`;
- perfiles de navegador;
- backups operativos.

Usa placeholders como `<SECRET>`.

## 6. Regla comercial de cotizaciones

El sistema puede recibir solicitudes, validar, normalizar, deduplicar, crear/actualizar prospectos, asignar responsable, registrar actividad y confirmar recepción.

El sistema **no debe generar, aprobar ni enviar automáticamente una cotización comercial** desde captura/webhook/bot.

La cotización requiere intervención humana.

## 7. Integración Web

Conservar:

- autenticación propia;
- validación y límite de payload;
- normalización;
- idempotencia/deduplicación;
- auditoría;
- origen `WEB`;
- revisión humana;
- `quoteCreated=false`.

Nunca exponer la clave webhook en frontend, query strings o commits.

## 8. UI/UX

Prioridades:

1. legibilidad;
2. jerarquía;
3. accesibilidad;
4. consistencia;
5. responsive;
6. feedback;
7. densidad adecuada.

Toda interacción aparente debe funcionar. No dejar búsqueda, campana, botones u otros controles como falsa affordance.

## 9. Operaciones destructivas

Eliminar prospectos, usuarios u otros registros debe:

- requerir permisos;
- mostrar impacto;
- exigir confirmación explícita;
- preservar auditoría;
- mantenerse fuera del flujo principal frecuente.

## 10. Validación mínima

```bash
npm run lint
npm run test
npm run build
```

Si se modifica Prisma, autenticación, webhook o permisos, agregar pruebas específicas.

No afirmar que CI pasó si no existe evidencia real.

## 11. Git

- Trabajar en ramas descriptivas.
- Commits pequeños y coherentes.
- No mezclar BI DESIGN con otros CRM.
- No subir generados, secretos, backups ni datos locales.
- Evitar `git push --force`.

## 12. Documentación

Actualizar documentación cuando cambie arquitectura, flujo comercial, seguridad, integración o despliegue.

Las capturas actuales viven en:

```text
docs/screenshots/current/
```

## 13. Criterio de finalización

Un cambio termina cuando:

- cumple el objetivo;
- no rompe flujos existentes;
- no expone secretos;
- lint pasa;
- tests pasan;
- build pasa;
- documentación necesaria está actualizada;
- existe rollback para cambios de riesgo.
