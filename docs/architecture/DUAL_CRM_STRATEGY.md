# Estrategia de dos CRM - BI DESIGN y Braille International

## Decisión

El proyecto tendrá **dos instancias independientes**.

### Instancia 1 - BI DESIGN CRM

Propósito:
- prospectos y oportunidades de BI DESIGN;
- cotización;
- proyectos;
- garantías/postventa;
- integración con el sitio BI DESIGN/Sitejet;
- dashboard y usuarios de BI DESIGN.

Identidad:
- `CRM_INSTANCE_CODE=BIDESIGN`
- `NEXT_PUBLIC_CRM_INSTANCE_CODE=BIDESIGN`

Dominio propuesto:
- `crm.bidesign.mx`

Folio comercial actual:
- `BI-XXX`

### Instancia 2 - BI DESIGN CRM

Será un despliegue independiente para Braille International.

Identidad:
- `CRM_INSTANCE_CODE=BRAILLE`
- `NEXT_PUBLIC_CRM_INSTANCE_CODE=BRAILLE`

Dominio propuesto:
- `crm.bidesign.local`

Antes de producción deberá definirse un prefijo de folio propio para evitar confundir expedientes de ambas empresas.

## Qué pueden compartir

- repositorio/base de código;
- módulos comunes;
- pruebas;
- arquitectura;
- componentes de seguridad;
- metodología de despliegue.

## Qué NO deben compartir

Cada instancia debe tener de manera independiente:

- SQLite/base de datos;
- `AUTH_SECRET`;
- claves de webhook;
- sesiones;
- usuarios;
- respaldos;
- logs;
- almacenamiento de evidencias;
- dominio y certificados TLS;
- variables `.env`;
- tareas de inicio automático;
- integración WhatsApp/Meta;
- cualquier API key de producción.

## Regla de aislamiento

```text
Código común
   ├── despliegue BI DESIGN
   │      ├── DB BI DESIGN
   │      ├── secretos BI DESIGN
   │      ├── dominio BI DESIGN
   │      └── backups BI DESIGN
   │
   └── despliegue Braille International
          ├── DB Braille
          ├── secretos Braille
          ├── dominio Braille
          └── backups Braille
```

Nunca se debe apuntar a las dos empresas con el mismo archivo SQLite.

## Estado actual del servidor

El directorio de desarrollo actual sigue siendo:

```text
C:\BrailleCRM\BI-DESIGN-CRM
```

Ese nombre se considera **ruta legacy de desarrollo**. No se renombra en este upgrade para evitar romper scripts existentes.

Al preparar producción se recomienda separar físicamente:

```text
C:\CRM\BIDesign
C:\CRM\BrailleInternational
```

con servicios/puertos internos propios.

## Branding por variable de entorno

La aplicación ahora contiene un catálogo de marcas y el tema se elige por instancia.

BI DESIGN:

```env
CRM_INSTANCE_CODE="BIDESIGN"
NEXT_PUBLIC_CRM_INSTANCE_CODE="BIDESIGN"
```

Braille International:

```env
CRM_INSTANCE_CODE="BRAILLE"
NEXT_PUBLIC_CRM_INSTANCE_CODE="BRAILLE"
```

El servidor actual queda configurado como BI DESIGN.

## Integraciones Web

El endpoint actualmente instalado:

```text
/api/integrations/web/leads
```

pertenece a BI DESIGN y conserva metadata:

```text
BI_DESIGN_WEB_V1
```

La futura instancia de Braille International deberá tener credenciales y fuentes propias; no reutilizar la clave de BI DESIGN.

## Siguiente fase recomendada

1. Cerrar Seguridad V2.
2. Backups automáticos.
3. Autostart de Windows.
4. Separar rutas de producción.
5. Configurar reverse proxy.
6. HTTPS.
7. Dominio BI DESIGN.
8. Prueba de Sitejet.
9. Desplegar BI DESIGN.
10. Crear segunda instancia Braille International a partir de la misma base de código, con base y secretos nuevos.
