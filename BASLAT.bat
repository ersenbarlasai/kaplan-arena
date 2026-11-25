@echo off
chcp 65001 >nul
title Kaplan Arena
cd /d "%~dp0"
set "PS1=%~dp0kaplan-sunucu.ps1"
if not exist "%PS1%" (
  for %%F in ("%~dp0kaplan-sunucu*.ps1") do set "PS1=%%~fF"
)
if not exist "%PS1%" (
  echo.
  echo  HATA: kaplan-sunucu.ps1 dosyasi bu klasorde bulunamadi.
  echo  BASLAT, kaplan-sunucu.ps1 ve kaplan-arena.html AYNI klasorde olmali.
  echo  Klasor: %~dp0
  echo.
  pause
  exit /b
)
if not exist "%~dp0kaplan-arena.html" (
  for %%F in ("%~dp0kaplan-arena*.html") do copy /y "%%~fF" "%~dp0kaplan-arena.html" >nul
)
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Yonetici izni isteniyor... Cikan pencerede EVET deyin.
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  if %errorlevel% neq 0 (
    echo Izin verilmedi. Telefonlar baglanamayacak ama yarisma bu bilgisayarda acilacak.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%PS1%' -ErrorAction SilentlyContinue"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
    pause
  )
  exit /b
)
echo Eski Kaplan Arena sunucusu varsa kapatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*kaplan-sunucu*' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul
netsh advfirewall firewall delete rule name="Kaplan Arena" >nul 2>&1
netsh advfirewall firewall add rule name="Kaplan Arena" dir=in action=allow protocol=TCP localport=8080,8090-8099>nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%PS1%' -ErrorAction SilentlyContinue; Unblock-File -Path '%~dp0kaplan-arena.html' -ErrorAction SilentlyContinue"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
pause
