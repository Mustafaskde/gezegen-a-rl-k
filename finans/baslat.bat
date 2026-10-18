@echo off
chcp 65001 >nul
title Finans Merkezi
cd /d "%~dp0"

echo.
echo  Finans Merkezi baslatiliyor...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [HATA] Node.js bulunamadi.
  echo  https://nodejs.org adresinden "LTS" surumunu kurup bu dosyayi tekrar calistirin.
  echo.
  pause
  exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
  echo  [Bilgi] Ollama bulunamadi. Asistan, model olmadan yerlesik analizle calisir.
  echo          Yapay zeka icin: https://ollama.com/download
  echo.
) else (
  ollama list | findstr /i "qwen2.5:14b" >nul
  if errorlevel 1 (
    echo  qwen2.5:14b modeli yuklu degil ^(yaklasik 9 GB^).
    choice /c EH /m " Simdi indirilsin mi? E=Evet, H=Hayir"
    if not errorlevel 2 ollama pull qwen2.5:14b
    echo.
  )
)

if not exist node_modules (
  echo  Ilk kurulum yapiliyor, bu islem birkac dakika surebilir...
  call npm install
  if errorlevel 1 (
    echo  [HATA] Kurulum basarisiz oldu.
    pause
    exit /b 1
  )
)

echo  Uygulama tarayicida aciliyor: http://localhost:5173
echo  Kapatmak icin bu pencereyi kapatin.
echo.
call npm run dev -- --open
