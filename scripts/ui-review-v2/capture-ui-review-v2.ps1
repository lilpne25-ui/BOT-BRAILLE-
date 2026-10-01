Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$AppPath = "C:\BrailleCRM\BI-DESIGN-CRM"
$Port = 3010
$BaseUrl = "http://127.0.0.1:$Port"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeScript = Join-Path $ScriptRoot "capture-ui-review-v2.mjs"
$RoutesPath = Join-Path $ScriptRoot "routes.json"

$SecretsDir = "C:\BrailleCRM\secrets"
$CredentialPath = Join-Path $SecretsDir "BIDesign_UI_Capture_Credential.xml"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ScreensRoot = "C:\BrailleCRM\Screenshots"
$OutputRoot = Join-Path $ScreensRoot "BIDesign_UIUX_V2_3_1_$Timestamp"
$OutputZip = Join-Path $ScreensRoot "BIDesign_UIUX_V2_3_1_$Timestamp.zip"
$TempRoot = "C:\BrailleCRM\Temp"

$LogDir = "C:\BrailleCRM\logs"
$LogPath = Join-Path $LogDir "bidesign-ui-capture-v2_3_1_$Timestamp.log"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Get-EnvironmentPath([string]$Name) {
    return [Environment]::GetEnvironmentVariable($Name)
}

function Get-BrowserFromRegistry([string]$ExeName) {
    $registryCandidates = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$ExeName",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\$ExeName",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$ExeName"
    )

    foreach ($key in $registryCandidates) {
        try {
            if (Test-Path -LiteralPath $key) {
                $value =
                    (Get-ItemProperty `
                        -LiteralPath $key `
                        -ErrorAction Stop).'(default)'

                if (
                    $value -and
                    (Test-Path -LiteralPath $value)
                ) {
                    return $value
                }
            }
        }
        catch {}
    }

    return $null
}

function Get-BrowserPath {
    $programFiles = Get-EnvironmentPath "ProgramFiles"
    $programFilesX86 = Get-EnvironmentPath "ProgramFiles(x86)"
    $localAppData = Get-EnvironmentPath "LOCALAPPDATA"

    $candidates = @()

    if ($programFilesX86) {
        $candidates +=
            (Join-Path $programFilesX86 "Microsoft\Edge\Application\msedge.exe")
        $candidates +=
            (Join-Path $programFilesX86 "Google\Chrome\Application\chrome.exe")
    }

    if ($programFiles) {
        $candidates +=
            (Join-Path $programFiles "Microsoft\Edge\Application\msedge.exe")
        $candidates +=
            (Join-Path $programFiles "Google\Chrome\Application\chrome.exe")
    }

    if ($localAppData) {
        $candidates +=
            (Join-Path $localAppData "Microsoft\Edge\Application\msedge.exe")
        $candidates +=
            (Join-Path $localAppData "Google\Chrome\Application\chrome.exe")
    }

    foreach ($path in $candidates) {
        if (
            $path -and
            (Test-Path -LiteralPath $path)
        ) {
            return $path
        }
    }

    foreach ($exe in @("msedge.exe", "chrome.exe")) {
        $registryPath =
            Get-BrowserFromRegistry $exe

        if ($registryPath) {
            return $registryPath
        }

        $command =
            Get-Command `
                $exe `
                -ErrorAction SilentlyContinue

        if (
            $command -and
            $command.Source -and
            (Test-Path -LiteralPath $command.Source)
        ) {
            return $command.Source
        }
    }

    throw "No se encontro Microsoft Edge ni Google Chrome."
}

function Test-CrmOnline {
    try {
        $response =
            Invoke-WebRequest `
                -Uri "$BaseUrl/login" `
                -UseBasicParsing `
                -TimeoutSec 5 `
                -ErrorAction Stop

        return (
            $response.StatusCode -eq 200
        )
    }
    catch {
        return $false
    }
}

function Ensure-CrmRunning {
    if (Test-CrmOnline) {
        return
    }

    Write-Host "CRM apagado. Intentando encender..." -ForegroundColor Yellow

    $stdOut =
        Join-Path $LogDir "braille-crm-stdout.log"
    $stdErr =
        Join-Path $LogDir "braille-crm-stderr.log"

    Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList "/d","/s","/c","set PORT=$Port&&npm run start" `
        -WorkingDirectory $AppPath `
        -RedirectStandardOutput $stdOut `
        -RedirectStandardError $stdErr |
        Out-Null

    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 2

        if (Test-CrmOnline) {
            Write-Host "CRM: ENCENDIDO" -ForegroundColor Green
            return
        }
    }

    throw "No se pudo encender el CRM."
}

function New-CaptureCredentialInteractive {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "BI DESIGN CRM - CREDENCIAL LOCAL DE CAPTURA" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "No se abrira ninguna ventana emergente." -ForegroundColor Yellow
    Write-Host "La contrasena se escribira oculta en esta consola." -ForegroundColor Yellow
    Write-Host "Windows la cifra con DPAPI para este usuario." -ForegroundColor Green
    Write-Host ""

    $email = Read-Host "Correo del CRM"

    if ([string]::IsNullOrWhiteSpace($email)) {
        throw "El correo no puede estar vacio."
    }

    $securePassword =
        Read-Host `
            "Contrasena del CRM" `
            -AsSecureString

    if (
        -not $securePassword -or
        $securePassword.Length -le 0
    ) {
        throw "La contrasena no puede estar vacia."
    }

    $credential =
        New-Object `
            System.Management.Automation.PSCredential(
                $email.Trim(),
                $securePassword
            )

    New-Item `
        -ItemType Directory `
        -Path $SecretsDir `
        -Force |
        Out-Null

    $credential |
        Export-Clixml `
            -LiteralPath $CredentialPath `
            -Force

    if (-not (Test-Path -LiteralPath $CredentialPath)) {
        throw "No se pudo guardar la credencial cifrada."
    }

    Write-Host ""
    Write-Host "Credencial cifrada: CONFIGURADA" -ForegroundColor Green
    Write-Host $CredentialPath -ForegroundColor Gray
    Write-Host ""

    return $credential
}

function Get-OrCreateCaptureCredential {
    if (Test-Path -LiteralPath $CredentialPath) {
        try {
            $credential =
                Import-Clixml `
                    -LiteralPath $CredentialPath

            if (
                $credential -and
                $credential -is [System.Management.Automation.PSCredential]
            ) {
                Write-Host "Credencial cifrada: CARGADA" -ForegroundColor Green
                return $credential
            }
        }
        catch {
            Write-Host "La credencial existente no pudo descifrarse. Se configurara nuevamente." -ForegroundColor Yellow
        }
    }

    return New-CaptureCredentialInteractive
}

function Convert-SecureStringToPlainText(
    [Security.SecureString]$SecureString
) {
    $bstr =
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $SecureString
        )

    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
            $bstr
        )
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
            $bstr
        )
    }
}

$plainPassword = $null

try {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    New-Item -ItemType Directory -Path $ScreensRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null

    Start-Transcript -Path $LogPath -Force | Out-Null

    Step "BI DESIGN CRM - CAPTURA AUTOMATICA UI/UX V2.3.1"

    if (-not (Test-Path -LiteralPath $NodeScript)) {
        throw "No existe capture-ui-review-v2.mjs."
    }

    if (-not (Test-Path -LiteralPath $RoutesPath)) {
        throw "No existe routes.json."
    }

    Ensure-CrmRunning

    $browserPath =
        Get-BrowserPath

    $credential =
        Get-OrCreateCaptureCredential

    $plainPassword =
        Convert-SecureStringToPlainText `
            $credential.Password

    $env:UI_CAPTURE_BROWSER = $browserPath
    $env:UI_CAPTURE_BASE_URL = $BaseUrl
    $env:UI_CAPTURE_EMAIL = $credential.UserName
    $env:UI_CAPTURE_PASSWORD = $plainPassword
    $env:UI_CAPTURE_OUTPUT = $OutputRoot
    $env:UI_CAPTURE_ROUTES = $RoutesPath
    $env:UI_CAPTURE_TEMP_ROOT = $TempRoot
    $env:UI_CAPTURE_DEBUG_PORT = "9333"

    Write-Host "Browser: $browserPath" -ForegroundColor Green
    Write-Host "Capturas: $OutputRoot" -ForegroundColor Green
    Write-Host "Credencial: DPAPI / cargada en memoria" -ForegroundColor Green
    Write-Host ""

    Set-Location $AppPath

    node $NodeScript

    if ($LASTEXITCODE -ne 0) {
        throw "El motor de captura Node/CDP termino con codigo $LASTEXITCODE."
    }

    Step "Generando ZIP unico"

    if (Test-Path -LiteralPath $OutputZip) {
        Remove-Item -LiteralPath $OutputZip -Force
    }

    Compress-Archive `
        -Path (Join-Path $OutputRoot "*") `
        -DestinationPath $OutputZip `
        -CompressionLevel Optimal `
        -Force

    if (
        -not (Test-Path -LiteralPath $OutputZip) -or
        (Get-Item -LiteralPath $OutputZip).Length -lt 10000
    ) {
        throw "El ZIP final no fue generado correctamente."
    }

    $pngCount =
        @(
            Get-ChildItem `
                -LiteralPath $OutputRoot `
                -Filter "*.png" `
                -File `
                -ErrorAction Stop
        ).Count

    if ($pngCount -lt 8) {
        throw "Solo se generaron $pngCount capturas. Se esperaban al menos 8."
    }

    Step "CAPTURA COMPLETADA"

    Write-Host "Capturas PNG: $pngCount" -ForegroundColor Green
    Write-Host "ZIP final:" -ForegroundColor Green
    Write-Host $OutputZip -ForegroundColor Cyan
    Write-Host ""
    Write-Host "No fue necesario abrir Edge ni tomar capturas manualmente." -ForegroundColor Green

    Stop-Transcript | Out-Null

    Start-Process explorer.exe $ScreensRoot
    exit 0
}
catch {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "ERROR EN CAPTURA AUTOMATICA V2.3.1" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Log: $LogPath" -ForegroundColor Yellow

    try {
        Stop-Transcript | Out-Null
    }
    catch {}

    exit 1
}
finally {
    $plainPassword = $null

    Remove-Item Env:UI_CAPTURE_BROWSER -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_BASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_OUTPUT -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_ROUTES -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_TEMP_ROOT -ErrorAction SilentlyContinue
    Remove-Item Env:UI_CAPTURE_DEBUG_PORT -ErrorAction SilentlyContinue
}
