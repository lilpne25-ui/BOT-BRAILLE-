Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Port = 3010
$BaseUrl = "http://127.0.0.1:$Port"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestPath = Join-Path $ScriptRoot "routes.json"

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
                $value = (Get-ItemProperty -LiteralPath $key -ErrorAction Stop).'(default)'

                if ($value -and (Test-Path -LiteralPath $value)) {
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
        $candidates += (Join-Path $programFilesX86 "Microsoft\Edge\Application\msedge.exe")
        $candidates += (Join-Path $programFilesX86 "Google\Chrome\Application\chrome.exe")
    }

    if ($programFiles) {
        $candidates += (Join-Path $programFiles "Microsoft\Edge\Application\msedge.exe")
        $candidates += (Join-Path $programFiles "Google\Chrome\Application\chrome.exe")
    }

    if ($localAppData) {
        $candidates += (Join-Path $localAppData "Microsoft\Edge\Application\msedge.exe")
        $candidates += (Join-Path $localAppData "Google\Chrome\Application\chrome.exe")
    }

    foreach ($path in $candidates) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            return $path
        }
    }

    foreach ($exe in @("msedge.exe", "chrome.exe")) {
        $registryPath = Get-BrowserFromRegistry $exe

        if ($registryPath) {
            return $registryPath
        }

        $command = Get-Command $exe -ErrorAction SilentlyContinue

        if ($command -and $command.Source -and (Test-Path -LiteralPath $command.Source)) {
            return $command.Source
        }
    }

    try {
        $httpCommand = (Get-ItemProperty `
            -LiteralPath "Registry::HKEY_CLASSES_ROOT\http\shell\open\command" `
            -ErrorAction Stop).'(default)'

        if ($httpCommand) {
            $match = [regex]::Match($httpCommand, '"([^"]+\.exe)"')

            if ($match.Success -and (Test-Path -LiteralPath $match.Groups[1].Value)) {
                return $match.Groups[1].Value
            }
        }
    }
    catch {}

    throw "No se encontro Microsoft Edge, Google Chrome ni un navegador HTTP registrado."
}

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "No existe routes.json."
}

$browserPath = Get-BrowserPath
$routes = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

Write-Host ""
Write-Host "Navegador detectado:" -ForegroundColor Green
Write-Host $browserPath -ForegroundColor Gray
Write-Host ""

Start-Process `
    -FilePath $browserPath `
    -ArgumentList @("--new-window","--window-size=1600,1200","$BaseUrl/login") |
    Out-Null

Start-Sleep -Seconds 1

foreach ($route in $routes) {
    Start-Process `
        -FilePath $browserPath `
        -ArgumentList @("--new-window","--window-size=1600,1200","$BaseUrl$($route.path)") |
        Out-Null

    Start-Sleep -Milliseconds 700
}

Write-Host ""
Write-Host "Se abrieron Login y las pantallas principales del CRM." -ForegroundColor Green
Write-Host ""
