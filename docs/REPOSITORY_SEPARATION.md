# Separación de repositorios — BI DESIGN / Braille International

## Objetivo

BI DESIGN CRM y BI DESIGN CRM son sistemas distintos.

Repositorio oficial BI DESIGN:

```text
https://github.com/lilpne25-ui/Bi-Design-CRM
```

## No compartir

- `.git` o historial;
- `.env`;
- `AUTH_SECRET`;
- claves webhook;
- Meta/WhatsApp;
- SQLite;
- backups;
- dominios/reverse proxies;
- sesiones/cookies;
- usuarios productivos;
- branding;
- documentación interna;
- capturas de otra instancia.

## Migración

La instancia actual vive en una carpeta heredada. La migración debe copiar un snapshot limpio y excluir:

```text
.git/
.next/
node_modules/
.env
*.db
*.sqlite
logs/
secrets/
Backups/
BrowserProfiles/
wa-auth/
```

## Finalización

La separación queda completa cuando:

1. el código BI DESIGN vive en su repo;
2. lint/tests/build pasan;
3. no hay secretos/datos operativos versionados;
4. README/documentación describen BI DESIGN;
5. un clon limpio valida correctamente;
6. futuros cambios parten de este repositorio.
