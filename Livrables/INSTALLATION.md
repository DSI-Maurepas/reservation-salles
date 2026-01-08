# 🏛️ GUIDE D'INSTALLATION COMPLET - MODE PAR SALLE

## ✅ FICHIERS LIVRÉS (8 fichiers)

### Nouveaux composants :
1. **ViewToggle.js** + **ViewToggle.css** - Onglets Par Date / Par Salle
2. **RoomSelector.js** + **RoomSelector.css** - 9 tuiles avec photos + disponibilités
3. **SingleRoomGrid.js** + **SingleRoomGrid.css** - Grille semaine mono-salle

### Fichiers modifiés :
4. **CalendarView-AVEC-ONGLETS.js** - Intégration onglets + RoomSelector
5. **App-AVEC-ROOMVIEW.js** - Gestion route SingleRoomGrid

---

## 📦 INSTALLATION

### Étape 1 : Copier les nouveaux composants

```bash
cd /c/dev/reservation-salles/src/components

# Onglets
cp ~/Downloads/ViewToggle.js .
cp ~/Downloads/ViewToggle.css .

# Tuiles salles
cp ~/Downloads/RoomSelector.js .
cp ~/Downloads/RoomSelector.css .

# Grille mono-salle
cp ~/Downloads/SingleRoomGrid.js .
cp ~/Downloads/SingleRoomGrid.css .
```

### Étape 2 : Remplacer les fichiers modifiés

```bash
cd /c/dev/reservation-salles/src

# CalendarView avec onglets
cp ~/Downloads/CalendarView-AVEC-ONGLETS.js components/CalendarView.js

# App avec route roomview
cp ~/Downloads/App-AVEC-ROOMVIEW.js App.js
```

### Étape 3 : Tester

```bash
npm start
```

---

## ✅ CHECKLIST

- [ ] ViewToggle.js + .css copiés
- [ ] RoomSelector.js + .css copiés
- [ ] SingleRoomGrid.js + .css copiés
- [ ] CalendarView.js remplacé
- [ ] App.js remplacé
- [ ] npm start fonctionne
- [ ] Onglets s'affichent
- [ ] 9 tuiles visibles
- [ ] Clic tuile ouvre grille

**TESTEZ !** 🚀
