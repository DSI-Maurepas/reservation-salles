#!/bin/bash
# ========================================
# Script de déploiement - Réservation Salles
# Mairie de MAUREPAS - DSI
# ========================================

echo ""
echo "========================================"
echo "   DÉPLOIEMENT RÉSERVATION SALLES"
echo "========================================"
echo ""

# Vérification de l'emplacement
if [ ! -f "package.json" ]; then
    echo "❌ ERREUR: Fichier package.json non trouvé"
    echo "Veuillez exécuter ce script depuis le dossier du projet"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Compilation
echo "[1/5] 🔨 Compilation du projet..."
echo ""
npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERREUR: La compilation a échoué"
    echo "Vérifiez les erreurs ci-dessus"
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Nettoyage
echo ""
echo "[2/5] 🧹 Nettoyage du dossier docs..."
echo ""
rm -rf docs/*

# Copie
echo ""
echo "[3/5] 📦 Copie des fichiers compilés..."
echo ""
cp -rf build/* docs/
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERREUR: La copie a échoué"
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Git add
echo ""
echo "[4/5] 📝 Ajout des fichiers à Git..."
echo ""
git add .
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERREUR: Git add a échoué"
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Commit
echo ""
read -p "Message de commit (Entrée pour message par défaut): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update: Déploiement application"
fi

git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    echo ""
    echo "ℹ️ Note: Aucun changement à commiter (ou erreur)"
fi

# Push
echo ""
echo "[5/5] 🚀 Envoi vers GitHub Pages..."
echo ""
git push origin main
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERREUR: Git push a échoué"
    echo "Vérifiez votre connexion et vos droits"
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Succès
echo ""
echo "========================================"
echo "   ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "========================================"
echo ""
echo "🌐 L'application sera disponible dans 2-3 minutes sur :"
echo "   https://dsi-maurepas.github.io/reservation-salles"
echo ""
echo "⚠️  N'oubliez pas de :"
echo "   - Vider le cache (Ctrl+Shift+Delete)"
echo "   - Actualiser (Ctrl+F5)"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
