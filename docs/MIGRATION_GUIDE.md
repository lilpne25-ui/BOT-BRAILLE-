# Migración segura al repositorio BI DESIGN CRM

## Principio

No cambiar simplemente el `origin` del repositorio heredado.

Se debe crear un snapshot limpio del código y subirlo al repositorio independiente.

## Pasos

1. Validar la instancia actual.
2. Crear backup.
3. Clonar `Bi-Design-CRM` en una carpeta temporal.
4. Copiar código excluyendo `.git`, secretos, bases, runtime y backups.
5. Reaplicar documentación BI DESIGN.
6. Copiar evidencia visual.
7. Reemplazar referencias de infraestructura heredada.
8. Escanear referencias prohibidas.
9. Revisar `git status`.
10. Commit y push.
11. Clonar de nuevo y validar.

## Cutover

La migración del repositorio no cambia automáticamente el runtime del servidor.

Primero se consolida el repo. El cambio de carpeta productiva se hace después, en una ventana controlada.
