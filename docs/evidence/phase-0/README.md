# Evidencia — Fase 0 (línea base ejecutable)

Salida cruda de los comandos de la línea base, ejecutados sobre `main@279b338` con `node_modules`
reinstalado desde cero.

- Entorno: Windows 11 Home 10.0.26200 · Node v24.18.0 · npm 12.0.1
- Fecha: 2026-07-27

| Archivo | Comando | Exit | Duración |
|---|---|---|---|
| `01-npm-ci.log` | `npm ci` | 0 | 50 s |
| `02-prisma-generate.log` | `npm run prisma:generate` | 0 | 3 s |
| `03-lint.log` | `npm run lint` | 0 | 3 s |
| `04-test.log` | `npm run test` | 0 (22/22) | 5 s |
| `05-build.log` | `npm run build` | 0 | 60 s |

El análisis de estos resultados está en
[`docs/REPORT_BRAILE_PRODUCTION_READINESS_PHASE_1.md`](../../REPORT_BRAILE_PRODUCTION_READINESS_PHASE_1.md).
