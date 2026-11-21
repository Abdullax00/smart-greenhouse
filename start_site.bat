@echo off
chcp 65001 > nul
echo ========================================================
echo   Запуск сайта "Умная теплица" на локальном сервере
echo ========================================================
echo.
echo Открытие в браузере: http://localhost:8000
echo.
start "" "http://localhost:8000"
python -m http.server 8000
pause
