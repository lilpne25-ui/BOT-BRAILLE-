# Reparación UI Review V2.1

## Errores corregidos

### 1. `System.Drawing.Imaging` no encontrado

La V2 compilaba un bloque C# que incluía:

```text
using System.Drawing.Imaging;
```

En Windows PowerShell 5.1 eso puede fallar porque `Add-Type` no agrega automáticamente la referencia que el compilador necesita.

V2.1 cambia el diseño:

- `Add-Type -AssemblyName System.Drawing`
- el C# embebido solo declara llamadas Win32;
- `Bitmap`, `Graphics` e `ImageFormat.Png` se usan directamente desde PowerShell.

### 2. Edge/Chrome no detectado

V2.1 busca navegador mediante:

1. `ProgramFiles(x86)`
2. `ProgramFiles`
3. `LOCALAPPDATA`
4. Registro de Windows `App Paths`
5. `Get-Command`
6. Navegador HTTP predeterminado del sistema

Esto es mucho más compatible con Windows Server.

## Qué NO cambia

- CRM.
- Prisma.
- SQLite.
- APIs.
- UI/UX V1.
- Autenticación.
- Cascada.
- Catálogo.
- Proyectos.
- WhatsApp.

Solo se sustituyen los scripts de revisión/captura.
