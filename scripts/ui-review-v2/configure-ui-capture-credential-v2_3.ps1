Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SecretsDir = "C:\BrailleCRM\secrets"
$CredentialPath = Join-Path $SecretsDir "BIDesign_UI_Capture_Credential.xml"

try {
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "BI DESIGN CRM - CREDENCIAL DE CAPTURA V2.3.1" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "La contrasena se escribe OCULTA en esta consola." -ForegroundColor Yellow
    Write-Host "Windows la cifra con DPAPI; no se guarda en texto plano." -ForegroundColor Green
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

    $credential |
        Export-Clixml `
            -LiteralPath $CredentialPath `
            -Force

    if (-not (Test-Path -LiteralPath $CredentialPath)) {
        throw "No se pudo guardar la credencial cifrada."
    }

    Write-Host ""
    Write-Host "CREDENCIAL CONFIGURADA" -ForegroundColor Green
    Write-Host $CredentialPath -ForegroundColor Gray
    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ERROR AL CONFIGURAR CREDENCIAL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
