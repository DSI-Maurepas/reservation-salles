@echo off
REM ========================================
REM Script de deploiement - Reservation Salles
REM Mairie de MAUREPAS - DSI
REM ========================================

echo.
echo ========================================
echo    DEPLOIEMENT RESERVATION SALLES
echo ========================================
echo.

REM Verification de l'emplacement
if not exist "package.json" (
    echo ERREUR: Fichier package.json non trouve
    echo Veuillez executer ce script depuis le dossier du projet
    echo.
    pause
    exit /b 1
)

echo [1/5] Compilation du projet...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: La compilation a echoue
    echo Verifiez les erreurs ci-dessus
    pause
    exit /b 1
)

echo.
echo [2/5] Nettoyage du dossier docs...
echo.
if exist "docs" (
    rmdir /s /q docs
)
mkdir docs

echo.
echo [3/5] Copie des fichiers compiles...
echo.
xcopy /s /e /i /y build\* docs\
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: La copie a echoue
    pause
    exit /b 1
)

echo.
echo [4/5] Ajout des fichiers a Git...
echo.
git add .
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: Git add a echoue
    pause
    exit /b 1
)

echo.
echo Entrez le message de commit (ou Entree pour message par defaut):
set /p COMMIT_MSG="Message: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update: Deploiement application

git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo.
    echo Note: Aucun changement a commiter (ou erreur)
)

echo.
echo [5/5] Envoi vers GitHub Pages...
echo.
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: Git push a echoue
    echo Verifiez votre connexion et vos droits
    pause
    exit /b 1
)

echo.
echo ========================================
echo    DEPLOIEMENT TERMINE AVEC SUCCES !
echo ========================================
echo.
echo L'application sera disponible dans 2-3 minutes sur :
echo https://dsi-maurepas.github.io/reservation-salles
echo.
echo N'oubliez pas de vider le cache (Ctrl+Shift+Delete)
echo et actualiser (Ctrl+F5) pour voir les changements.
echo.
pause
