@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-task.ps1"
echo.
echo =========================================================
echo   Tarefa agendada com sucesso para as 08:00 da manha!
echo =========================================================
pause
