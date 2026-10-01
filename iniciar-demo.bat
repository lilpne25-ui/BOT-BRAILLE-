@echo off
chcp 65001 >nul
title Braille CRM Demo - Inicio rapido

cd /d "%~dp0"

echo.
echo ==========================================
echo   BRAILLE CRM DEMO - INICIO RAPIDO
echo ==========================================
echo.

if not exist "package.json" (
  echo [ERROR] No se encontro package.json.
  echo Este .bat debe ejecutarse desde la carpeta raiz del proyecto.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo Instala Node.js LTS desde https://nodejs.org y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm no esta instalado o no esta en el PATH.
  echo Reinstala Node.js LTS y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

echo Verificando version de Node...
node -v
echo.

if not exist "node_modules" (
  echo No se encontro node_modules.
  echo Instalando dependencias con npm install...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install fallo. Revisa el mensaje anterior.
    echo.
    pause
    exit /b 1
  )
) else (
  echo Dependencias encontradas: node_modules existe.
)

echo.
echo Iniciando la demo en http://localhost:3000
echo Cuando Next.js termine de cargar, se abrira el navegador.
echo Para detener el servidor: CTRL + C
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

call npm run dev

echo.
echo Servidor detenido.
pause
