# ⚡ DÉMARRAGE RAPIDE - 10 MINUTES

Ce guide vous permet de déployer l'application en 10 minutes chrono !

---

## ⏱️ ÉTAPE 1 : Google Sheets (3 minutes)

### 1. Créer le tableur
1. Allez sur https://sheets.google.com
2. Nouveau tableur
3. Nommez-le "Réservations Salles Mairie"

### 2. Créer l'onglet "Réservations"
Ligne 1 (en-têtes) :
```
ID | Salle | Date Début | Heure Début | Date Fin | Heure Fin | Nom | Prénom | Service | Objet | Récurrence | Récurrence Jusqu'au | Email
```

### 3. Créer l'onglet "Salles"
Colonne A, listez :
```
Salle du Conseil
Salle des Mariages
Salle du 16eme A
Salle du 16eme B
Salle rdc N°1
Salle rdc N°2
Salle rdc N°3
Salle CCAS
Salle CTM
```

### 4. Créer l'onglet "Configuration"
```
A: Paramètre | B: Valeur
Heure Début | 8
Heure Fin | 22
```

### 5. Partager
- Clic sur "Partager"
- "Tous les utilisateurs disposant du lien"
- Droits : "Éditeur"
- **Notez l'ID** (dans l'URL) : `1ABC-xyz123`

			//LE LIEN DE L'URL COPIE => https://docs.google.com/spreadsheets/d/1SNkHpAXIzu3GNQxFX3csCRv_4rz9M52xO6ov0LCed7Q/edit?usp=sharing
---

## 🔑 ÉTAPE 2 : Clé API Google (3 minutes)

1. https://console.cloud.google.com/
2. Nouveau projet : "Reservation Salles"
3. Menu ☰ > API et services > Bibliothèque
4. Chercher "Google Sheets API" > ACTIVER
5. Identifiants > + CRÉER > Clé API
6. **Copier la clé** : `AIzaSy...`
7. RESTREINDRE LA CLÉ > Restreindre > Google Sheets API > Enregistrer

			//LA CLE API GENEREE => AIzaSyAfpo4O0YkzjG8AaRl9tz9JMcAdQW3b8nY

---

## 📧 ÉTAPE 3 : EmailJS (2 minutes)

1. https://www.emailjs.com/ > Sign Up (gratuit)
2. Email Services > Add New Service > Gmail (ou autre) > Connecter
3. **Notez le Service ID** : `service_xxxxxx`

			// SERVICE ID D'OUTLOOK DE EmailJS => service_xoen8ug

4. Email Templates > Create New Template
   - Nom : "Confirmation"
   - Copier-coller le template du guide
   - **Notez le Template ID** : `template_xxxxxx`

			// TEMPLATE ID => template_awkvaoh

5. Répétez pour template "Annulation"
6. Account > General > **Copier Public Key** : `xxxxxx`

			// TEMPLATE ID => template_i9aqlt9

---

## 💻 ÉTAPE 4 : Configuration du code (2 minutes)

1. Ouvrez `src/config/googleSheets.js`
2. Remplacez ces 6 valeurs :

```javascript
API_KEY: 'AIzaSyAfpo4O0YkzjG8AaRl9tz9JMcAdQW3b8nY',                    // Étape 2
SPREADSHEET_ID: '1SNkHpAXIzu3GNQxFX3csCRv_4rz9M52xO6ov0LCed7Q',           // Étape 1
SERVICE_ID: 'service_xoen8ug',            // Étape 3
TEMPLATE_ID_CONFIRMATION: 'template_awkvaoh',  // Étape 3
TEMPLATE_ID_ANNULATION: 'template_i9aqlt9',    // Étape 3
USER_ID: 'QFnQAOzHCSEtZoeVe'                        // Étape 3

// Et vos emails admin :
ADMINISTRATEURS: ['j.matrat@maurepas.fr']
```

3. Enregistrez

---

## 🚀 ÉTAPE 5 : Déploiement (5 minutes)

### En local (test)
```bash
npm install
npm start
```
→ Ouvre http://localhost:3000
→ Testez une réservation

### Sur GitHub Pages
```bash
# 1. Créez un repo sur github.com : "reservation-salles"
# 2. Dans package.json, ajoutez :
"homepage": "https://DSI-Maurepas.github.io/reservation-salles",

# 3. Publiez :
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DSI-Maurepas/reservation-salles.git
git push -u origin main
npm run deploy

# 4. Attendez 2-3 minutes
```

**✅ TERMINÉ !**
Votre app est sur : `https://VOTRE-USERNAME.github.io/reservation-salles`

---

## 🎯 Checklist finale

- [ ] Google Sheet créé avec 3 onglets
- [ ] Sheet partagé en "Éditeur"
- [ ] Clé API Google créée et restreinte
- [ ] EmailJS configuré avec 2 templates
- [ ] Fichier config édité (6 valeurs)
- [ ] Testé en local (`npm start`)
- [ ] Déployé sur GitHub Pages
- [ ] URL accessible

---

## 🔧 Si ça ne marche pas

### L'app ne charge pas
```bash
# Vérifiez que gh-pages existe :
git branch -a

# Si non, redéployez :
npm run deploy
```

### Erreur "API key not valid"
→ Vérifiez que la clé est bien restreinte à Google Sheets API UNIQUEMENT

### Pas d'email reçu
→ Vérifiez le Service ID et les Template IDs dans EmailJS

### Réservations ne s'enregistrent pas
→ Vérifiez que le Sheet est bien en "Éditeur" (pas "Lecteur" !)

---

## 📞 Besoin d'aide ?

Consultez les guides complets :
- **GUIDE_INSTALLATION.md** : Guide détaillé étape par étape
- **DEPANNAGE.md** : Solutions à tous les problèmes
- **RECAPITULATIF_DSI.md** : Vue d'ensemble complète

---

**Temps total : 10-15 minutes maximum !**

Bon déploiement ! 🚀
