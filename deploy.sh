#!/bin/bash
# Script de déploiement
# À exécuter SEULEMENT si install-and-test.sh a réussi

echo "🚀 DÉPLOIEMENT"
echo "============="
echo ""

# Vérifier que le build existe
if [ ! -d "build" ]; then
    echo "❌ ERREUR: Dossier build/ n'existe pas"
    echo "   Exécutez d'abord: ./install-and-test.sh"
    exit 1
fi

echo "✅ Build trouvé"
echo ""

# Rebuild pour être sûr
echo "🔨 Rebuild final..."
npm run build > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ ERREUR lors du rebuild"
    exit 1
fi

echo "✅ Rebuild OK"
echo ""

# Copie vers docs/
echo "📂 Copie vers docs/..."
rm -rf docs/*
cp -rf build/* docs/

echo "✅ Fichiers copiés"
echo ""

# Git add
echo "📝 Git add..."
git add .

echo "✅ Fichiers ajoutés"
echo ""

# Git commit
echo "💾 Git commit..."
git commit -m "Fix: Application testee et fonctionnelle - 7 corrections + icalService"

echo "✅ Commit créé"
echo ""

# Git push
echo "☁️  Git push..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DÉPLOIEMENT RÉUSSI"
    echo ""
    echo "🌐 Application disponible dans 1-2 minutes à:"
    echo "   https://dsi-maurepas.github.io/reservation-salles"
    echo ""
    echo "🧪 Testez:"
    echo "   1. Ouvrir l'URL"
    echo "   2. Vérifier que l'application s'ouvre"
    echo "   3. Vérifier la scrollbar orange"
    echo "   4. Tester une réservation + télécharger iCal"
else
    echo ""
    echo "❌ ERREUR lors du push"
    echo "   Vérifiez votre connexion et réessayez"
    exit 1
fi
