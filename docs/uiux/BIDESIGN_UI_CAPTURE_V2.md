# BI DESIGN CRM — UI/UX Refinement V2

## Qué trae esta V2

Esta V2 no toca Prisma, SQLite ni las APIs de negocio.  
Su objetivo es mejorar el flujo de **revisión visual** del CRM.

Incluye:

1. **ABRIR_REVISION_UI_UX_V2.bat**  
   Abre las pantallas principales de BI DESIGN.

2. **ABRIR_Y_CAPTURAR_UI_UX_V2.bat**  
   Abre cada pantalla principal y **guarda una captura PNG** de cada una.

3. **Galería HTML automática**  
   Después de capturar, genera `index.html` dentro de la carpeta de salida para revisar las capturas rápidamente.

4. **Manifest de rutas (`routes.json`)**  
   Si mañana quieres agregar otra UI, solo añades otra ruta y nombre ahí.

---

## Rutas que captura

- Dashboard
- Prospectos
- Cotizador
- Catálogo
- Proyectos
- WhatsApp
- Usuarios

---

## Cómo usar la captura automática

1. Ejecuta:

```text
ABRIR_Y_CAPTURAR_UI_UX_V2.bat
```

2. El script abrirá Login.
3. Inicia sesión manualmente si hace falta.
4. Cuando ya veas el Dashboard, presiona `ENTER` en la consola.
5. El script abrirá cada pantalla y guardará una captura PNG de la ventana.

---

## Carpeta de salida

Las capturas se guardan en:

```text
C:\BrailleCRM\Screenshots\BIDesign_UIUX_V2_YYYYMMDD_HHMMSS
```

Dentro encontrarás:

- `01-dashboard.png`
- `02-prospectos.png`
- `03-cotizador.png`
- `04-catalogo.png`
- `05-proyectos.png`
- `06-whatsapp.png`
- `07-usuarios.png`
- `index.html`

---

## Buenas prácticas usadas

- No toca base de datos.
- No modifica la lógica del CRM.
- Usa rutas declaradas en JSON.
- Tiene logging.
- Tiene fallback Edge/Chrome.
- Se puede extender.
- Se integra sin romper V1.

---

## Nota importante

La captura usa la **ventana activa del navegador**.  
Por eso conviene ejecutarlo con el escritorio libre y sin otras ventanas encima.
