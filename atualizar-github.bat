@echo off
chcp 65001 >nul
echo =========================================
echo       ATUALIZANDO O PROJETO NO GITHUB
echo =========================================
echo.

IF NOT EXIST .git (
    echo [!] Configurando repositorio local pela primeira vez...
    git init
)

git add .

set /p msg="Digite a mensagem do commit (ou de enter para o padrao 'Atualizacao automatica'): "
if "%msg%"=="" set msg=Atualizacao automatica

git commit -m "%msg%"

:: Garante que a branch principal se chama main
git branch -M main

:: Adiciona o link do seu GitHub (ignora erro se ja estiver adicionado)
git remote add origin https://github.com/vespermusicstudio028-spec/Reportar-Problema-Tecnico.git 2>nul

:: Envia os arquivos para o GitHub
git pull origin main --rebase
git push -u origin main

echo.
echo =========================================
echo       PRONTO! PROJETO ATUALIZADO
echo =========================================
pause
