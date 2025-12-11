@echo off
echo Ajout des fichiers...
git add .
git commit -m "Update: Mise a jour"
git push origin main
echo Deploiement sur GitHub Pages...
npm run deploy
echo Termine !
pause