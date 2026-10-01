# BI DESIGN CRM — Captura automática UI/UX V2.2

## Cambio principal

V2.2 elimina completamente el método de:

- capturar la ventana activa;
- `System.Drawing`;
- `Add-Type` gráfico;
- vigilar el proceso visual de Edge.

Ahora las capturas se generan directamente con **Edge/Chrome Headless**.

## Flujo

```text
CRM
 ↓
Perfil dedicado de captura
 ↓
Edge Headless
 ↓
00-login.png
01-dashboard.png
02-prospectos.png
03-cotizador.png
04-catalogo.png
05-proyectos.png
06-whatsapp.png
07-usuarios.png
 ↓
index.html
 ↓
MANIFEST.txt
 ↓
ZIP único
```

## Primera ejecución

El perfil de captura no conoce tu sesión del CRM.

V2.2 abrirá una ventana una sola vez:

1. Inicia sesión.
2. Espera a ver Dashboard.
3. Cierra esa ventana.
4. Presiona ENTER.

La sesión queda almacenada en:

```text
C:\BrailleCRM\BrowserProfiles\BIDesignUICapture
```

Las siguientes ejecuciones podrán ser completamente automáticas mientras esa sesión siga vigente.

No se pide ni se copia la contraseña al script.

## ZIP resultante

```text
C:\BrailleCRM\Screenshots\BIDesign_UIUX_V2_2_YYYYMMDD_HHMMSS.zip
```

El ZIP contiene todas las capturas, `index.html` y `MANIFEST.txt`.

## Seguridad

El perfil de captura es local al servidor y contiene una sesión autenticada.

Debe tratarse como información sensible:
- no compartir la carpeta `BrowserProfiles`;
- no subirla a Git;
- no copiarla a otras computadoras.

Las capturas y el ZIP no contienen la clave del webhook ni la contraseña.
