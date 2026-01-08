#!/bin/bash
# Script de vérification et installation des fichiers
# À exécuter dans Git Bash Windows

echo "🔍 VÉRIFICATION ET INSTALLATION AUTOMATIQUE"
echo "==========================================="
echo ""

# Vérifier qu'on est dans le bon dossier
if [ ! -d "src/components" ] || [ ! -d "src/config" ] || [ ! -d "src/services" ]; then
    echo "❌ ERREUR: Vous n'êtes pas dans le dossier reservation-salles"
    echo "   Faites: cd /c/dev/reservation-salles"
    exit 1
fi

echo "✅ Dossier correct"
echo ""

# Fonction de backup
backup_file() {
    if [ -f "$1" ]; then
        cp "$1" "$1.backup.$(date +%Y%m%d_%H%M%S)"
        echo "   📦 Backup créé: $1.backup.*"
    fi
}

# Vérifier que les 5 fichiers sont présents dans Downloads
echo "🔍 Vérification des fichiers téléchargés..."
DOWNLOADS="/c/Users/$USER/Downloads"

files=(
    "icalService.js"
    "ReservationGrid-FINAL-TESTED.js"
    "ReservationGrid-FINAL-TESTED.css"
    "MyReservations-FINAL-TESTED.css"
    "googleSheets-FINAL-TESTED.js"
)

missing=0
for file in "${files[@]}"; do
    if [ ! -f "$DOWNLOADS/$file" ]; then
        echo "   ❌ MANQUANT: $file"
        missing=$((missing + 1))
    else
        echo "   ✅ Trouvé: $file"
    fi
done

if [ $missing -gt 0 ]; then
    echo ""
    echo "❌ ERREUR: $missing fichier(s) manquant(s) dans Downloads"
    echo "   Téléchargez d'abord tous les fichiers depuis les liens fournis"
    exit 1
fi

echo ""
echo "📋 Tous les fichiers sont présents"
echo ""

# Backup des fichiers existants
echo "📦 Création des backups..."
backup_file "src/services/icalService.js"
backup_file "src/components/ReservationGrid.js"
backup_file "src/components/ReservationGrid.css"
backup_file "src/components/MyReservations.css"
backup_file "src/config/googleSheets.js"
echo ""

# Copie des nouveaux fichiers
echo "📂 Installation des nouveaux fichiers..."

cp "$DOWNLOADS/icalService.js" "src/services/icalService.js"
echo "   ✅ icalService.js → src/services/"

cp "$DOWNLOADS/ReservationGrid-FINAL-TESTED.js" "src/components/ReservationGrid.js"
echo "   ✅ ReservationGrid.js → src/components/"

cp "$DOWNLOADS/ReservationGrid-FINAL-TESTED.css" "src/components/ReservationGrid.css"
echo "   ✅ ReservationGrid.css → src/components/"

cp "$DOWNLOADS/MyReservations-FINAL-TESTED.css" "src/components/MyReservations.css"
echo "   ✅ MyReservations.css → src/components/"

cp "$DOWNLOADS/googleSheets-FINAL-TESTED.js" "src/config/googleSheets.js"
echo "   ✅ googleSheets.js → src/config/"

echo ""
echo "🧪 TEST DE COMPILATION..."
echo ""

# Test de compilation
if npm run build > build.log 2>&1; then
    if grep -q "Failed to compile" build.log; then
        echo "❌ ERREUR DE COMPILATION"
        echo ""
        grep -A 10 "Failed to compile" build.log
        echo ""
        echo "❌ NE PAS DÉPLOYER"
        echo "   Les backups sont disponibles (fichiers .backup.*)"
        exit 1
    else
        echo "✅ COMPILATION RÉUSSIE"
        echo ""
        echo "📊 Résumé:"
        tail -10 build.log
        echo ""
        echo "✅ PRÊT À DÉPLOYER"
        echo ""
        echo "🚀 Pour déployer, exécutez:"
        echo "   ./deploy.sh"
        exit 0
    fi
else
    echo "❌ ERREUR LORS DU BUILD"
    cat build.log
    exit 1
fi
