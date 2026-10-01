# BI DESIGN CRM — Captura automática UI/UX V2.3.1

V2.3.1 elimina `Get-Credential`.

Ahora el mismo proceso pregunta en consola:

```text
Correo del CRM:
Contrasena del CRM: ********
```

La contraseña se captura con `Read-Host -AsSecureString`, se guarda cifrada mediante `Export-Clixml` + DPAPI y después continúa la captura automática.

Ejecuta:

```text
PREPARAR_Y_CAPTURAR_TODO_V2_3_1.bat
```

La primera ejecución pide credenciales; las siguientes reutilizan el archivo cifrado.

Resultado:

```text
C:\BrailleCRM\Screenshots\BIDesign_UIUX_V2_3_1_YYYYMMDD_HHMMSS.zip
```

Se conserva Node 24 + Edge Headless + Chrome DevTools Protocol + captura full-page + ZIP automático.
