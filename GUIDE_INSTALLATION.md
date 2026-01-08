# 📖 GUIDE D'INSTALLATION COMPLET
## Système de Réservation de Salles - Mairie

---

## 🎯 Vue d'ensemble

Ce système permet aux agents de votre mairie de réserver les salles disponibles via une interface web intuitive. 

**Fonctionnalités principales :**
- ✅ Calendrier interactif avec code couleur de disponibilité
- ✅ Grille de réservation drag-and-drop
- ✅ Gestion des conflits en temps réel
- ✅ Notifications email automatiques
- ✅ Export iCal pour synchronisation agenda
- ✅ Panel d'administration complet
- ✅ Statistiques détaillées

---

## 📋 PRÉREQUIS

Avant de commencer, assurez-vous d'avoir :
- Un compte Google (Gmail ou Google Workspace)
- Node.js installé (version 14 ou supérieure) - https://nodejs.org/
- Un éditeur de code (VS Code recommandé)
- Un compte GitHub (gratuit)

---

## 🔧 ÉTAPE 1 : CONFIGURATION GOOGLE SHEETS

### 1.1 Créer le Google Sheet

1. Allez sur https://sheets.google.com
2. Créez un nouveau tableur
3. Nommez-le "Réservations Salles Mairie"

### 1.2 Créer les 3 onglets nécessaires

**Onglet 1 : "Réservations"**
Créez les colonnes suivantes (ligne 1) :
```
A: ID | B: Salle | C: Date Début | D: Heure Début | E: Date Fin | F: Heure Fin | 
G: Nom | H: Prénom | I: Service | J: Objet | K: Récurrence | L: Récurrence Jusqu'au | M: Email
```

**Onglet 2 : "Salles"**
Listez vos salles (une par ligne, colonne A) :
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

**Onglet 3 : "Configuration"**
Créez deux colonnes :
```
A: Paramètre | B: Valeur
```
Ajoutez :
```
Heure Début | 8
Heure Fin | 22
```

### 1.3 Partager le Google Sheet

1. Cliquez sur "Partager" (en haut à droite)
2. Dans "Accès général" : sélectionnez **"Tous les utilisateurs disposant du lien"**
3. Définissez les droits sur **"Éditeur"**
4. Cliquez sur "Copier le lien" et **notez l'ID du Sheet**
   - L'URL ressemble à : `https://docs.google.com/spreadsheets/d/1ABC-xyz123/edit`
   - L'ID est : `1ABC-xyz123`

---

## 🔑 ÉTAPE 2 : OBTENIR UNE CLÉ API GOOGLE

### 2.1 Créer un projet Google Cloud

1. Allez sur https://console.cloud.google.com/
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Sélectionner un projet" puis "Nouveau projet"
4. Nommez-le "Reservation Salles Mairie"
5. Cliquez sur "Créer"

### 2.2 Activer l'API Google Sheets

1. Dans le menu (☰), allez dans "API et services" > "Bibliothèque"
2. Recherchez "Google Sheets API"
3. Cliquez dessus puis sur "ACTIVER"

### 2.3 Créer une clé API

1. Dans "API et services" > "Identifiants"
2. Cliquez sur "+ CRÉER DES IDENTIFIANTS"
3. Sélectionnez "Clé API"
4. Copiez la clé générée et **notez-la précieusement**
5. Cliquez sur "RESTREINDRE LA CLÉ"
6. Dans "Restrictions relatives aux API" :
   - Sélectionnez "Restreindre la clé"
   - Cochez uniquement "Google Sheets API"
7. Cliquez sur "Enregistrer"

---

## 📧 ÉTAPE 3 : CONFIGURATION EMAILJS (Notifications email)

### 3.1 Créer un compte EmailJS

1. Allez sur https://www.emailjs.com/
2. Cliquez sur "Sign Up" (gratuit jusqu'à 200 emails/mois)
3. Créez votre compte

### 3.2 Connecter votre email

1. Dans le dashboard, allez dans "Email Services"
2. Cliquez sur "Add New Service"
3. Choisissez votre fournisseur d'email (Gmail, Outlook, etc.)
4. Suivez les instructions pour connecter votre compte
5. **Notez le Service ID** affiché

### 3.3 Créer les templates d'email

**Template 1 : Confirmation de réservation**
1. Allez dans "Email Templates"
2. Cliquez sur "Create New Template"
3. Nommez-le "Confirmation Réservation"
4. Utilisez ce contenu :

```
Subject: ✅ Confirmation de réservation - {{salle}}

Bonjour {{to_name}},

Votre réservation a bien été enregistrée :

🏛️ Salle : {{salle}}
📅 Date : {{date_debut}}
🕐 Horaire : {{heure_debut}} - {{heure_fin}}
🏢 Service : {{service}}
📝 Objet : {{objet}}

Référence : {{reservation_id}}

Pour modifier ou annuler cette réservation, connectez-vous à l'application.

Cordialement,
Le service de gestion des salles
```

5. Cliquez sur "Save" et **notez le Template ID**

**Template 2 : Annulation de réservation**
1. Créez un nouveau template nommé "Annulation Réservation"
2. Utilisez ce contenu :

```
Subject: ❌ Annulation de réservation - {{salle}}

Bonjour {{to_name}},

Votre réservation a été annulée :

🏛️ Salle : {{salle}}
📅 Date : {{date_debut}}
🕐 Horaire : {{heure_debut}} - {{heure_fin}}

Raison : {{raison}}

Cordialement,
Le service de gestion des salles
```

3. Cliquez sur "Save" et **notez le Template ID**

### 3.4 Récupérer votre User ID

1. Allez dans "Account" (icône en haut à droite)
2. Dans l'onglet "General", copiez votre **Public Key** (User ID)

---

## 💻 ÉTAPE 4 : INSTALLATION DU CODE

### 4.1 Télécharger le code

Le code source complet se trouve dans le dossier `/home/claude/reservation-salles/`

### 4.2 Configurer les identifiants

1. Ouvrez le fichier `src/config/googleSheets.js`
2. Remplacez les valeurs suivantes :

```javascript
export const GOOGLE_CONFIG = {
  API_KEY: 'VOTRE_CLE_API_GOOGLE',  // ← Clé API créée à l'étape 2
  SPREADSHEET_ID: 'VOTRE_ID_SPREADSHEET',  // ← ID du Google Sheet (étape 1)
  // ...
};

export const EMAIL_CONFIG = {
  SERVICE_ID: 'VOTRE_SERVICE_ID',  // ← Service ID EmailJS
  TEMPLATE_ID_CONFIRMATION: 'VOTRE_TEMPLATE_CONFIRMATION',  // ← Template ID confirmation
  TEMPLATE_ID_ANNULATION: 'VOTRE_TEMPLATE_ANNULATION',  // ← Template ID annulation
  USER_ID: 'VOTRE_USER_ID'  // ← Public Key EmailJS
};

// Remplacez également les emails administrateurs
export const ADMINISTRATEURS = [
  'votre.email@mairie.fr',  // ← Votre email
  'dsi@mairie.fr'  // ← Email du DSI
];
```

### 4.3 Installer les dépendances

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

Cette commande va installer toutes les bibliothèques nécessaires (React, etc.)

### 4.4 Tester en local

Pour tester l'application sur votre ordinateur :

```bash
npm start
```

L'application s'ouvrira automatiquement dans votre navigateur à l'adresse http://localhost:3000

---

## 🚀 ÉTAPE 5 : DÉPLOIEMENT SUR GITHUB PAGES

### 5.1 Créer un repository GitHub

1. Allez sur https://github.com
2. Connectez-vous ou créez un compte (gratuit)
3. Cliquez sur "New repository"
4. Nommez-le : `reservation-salles`
5. Laissez-le en "Public"
6. **NE PAS** cocher "Initialize with README"
7. Cliquez sur "Create repository"

### 5.2 Configuration pour GitHub Pages

1. Ouvrez le fichier `package.json`
2. Ajoutez cette ligne au début (après "name") :

```json
"homepage": "https://DSI-Maurepas.github.io/reservation-salles",

			// => https://github.com/DSI-Maurepas/reservation-salles.git
```

Remplacez `VOTRE-USERNAME-GITHUB` par votre nom d'utilisateur GitHub.

### 5.3 Initialiser Git et publier

Dans le terminal, dans le dossier du projet :

```bash
# Initialiser git
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit - Application de réservation"

# Lier au repository GitHub (remplacez VOTRE-USERNAME par le vôtre)
git remote add origin https://github.com/VOTRE-USERNAME/reservation-salles.git

# Pousser le code
git branch -M main
git push -u origin main

# Déployer sur GitHub Pages
npm run deploy
```

### 5.4 Activer GitHub Pages

1. Allez sur votre repository GitHub
2. Cliquez sur "Settings"
3. Dans le menu de gauche, cliquez sur "Pages"
4. Dans "Source", sélectionnez la branche `gh-pages`
5. Cliquez sur "Save"

**Votre application sera accessible à :**
`https://VOTRE-USERNAME-GITHUB.github.io/reservation-salles`

⏱️ Attendez 2-3 minutes que GitHub Pages déploie votre site.

---

## 🔒 ÉTAPE 6 : SÉCURISATION (IMPORTANT)

### 6.1 Sécuriser l'accès au Google Sheet

Pour éviter les modifications non autorisées :

1. Dans Google Sheets, allez dans "Outils" > "Éditeur de scripts"
2. Créez un script de validation (optionnel mais recommandé)
3. Définissez des règles de protection sur les feuilles

### 6.2 Configuration du pare-feu Fortigate

Pour autoriser l'accès aux API nécessaires :

1. Connectez-vous à votre interface FortiGate
2. Ajoutez les domaines suivants à la liste blanche :
   - `sheets.googleapis.com`
   - `accounts.google.com`
   - `api.emailjs.com`
   - `cdn.emailjs.com`

---

## 📱 ÉTAPE 7 : UTILISATION DE L'APPLICATION

### 7.1 Pour les agents (utilisateurs)

**Faire une réservation :**
1. Ouvrez l'URL de l'application
2. Sur le calendrier, cliquez sur une date disponible (verte ou orange)
3. Sélectionnez un créneau en cliquant et glissant sur la grille
4. Remplissez le formulaire (nom, prénom, email, service, objet)
5. Validez la réservation
6. Vous recevrez un email de confirmation

**Consulter ses réservations :**
1. Cliquez sur "Mes Réservations"
2. Entrez votre adresse email
3. Vous verrez toutes vos réservations
4. Vous pouvez annuler ou exporter en iCal

### 7.2 Pour les administrateurs

**Accéder au panel admin :**
1. Cliquez sur "Administration"
2. Entrez un email administrateur (défini dans la config)
3. Vous accédez aux statistiques et à la liste complète
4. Vous pouvez annuler n'importe quelle réservation

---

## 🔧 MAINTENANCE ET MISES À JOUR

### Mettre à jour l'application

1. Modifiez les fichiers nécessaires
2. Testez en local avec `npm start`
3. Déployez avec `npm run deploy`

### Ajouter/Retirer des salles

1. Ouvrez `src/config/googleSheets.js`
2. Modifiez le tableau `SALLES`
3. Mettez également à jour l'onglet "Salles" dans Google Sheets
4. Redéployez

### Modifier les horaires

1. Dans `src/config/googleSheets.js`, modifiez `HORAIRES`
2. Mettez également à jour dans Google Sheets onglet "Configuration"
3. Redéployez

### Mettre à jour les jours fériés

Dans `src/config/googleSheets.js`, mettez à jour le tableau `JOURS_FERIES` chaque année.

---

## ❓ RÉSOLUTION DES PROBLÈMES

### Problème : "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"
**Solution :** Désactivez temporairement les bloqueurs de publicité (AdBlock, etc.)

### Problème : "API key not valid"
**Solution :** Vérifiez que vous avez bien restreint la clé API uniquement à Google Sheets API

### Problème : Les emails ne sont pas envoyés
**Solution :** 
1. Vérifiez vos identifiants EmailJS
2. Vérifiez votre quota (200 emails/mois en gratuit)
3. Vérifiez que le service email est bien connecté

### Problème : Les réservations ne s'enregistrent pas
**Solution :**
1. Vérifiez que le Google Sheet est bien partagé en "Éditeur"
2. Vérifiez l'ID du spreadsheet dans la configuration
3. Ouvrez la console du navigateur (F12) pour voir les erreurs

### Problème : L'application ne se charge pas sur GitHub Pages
**Solution :**
1. Vérifiez que la branche `gh-pages` existe
2. Attendez 2-3 minutes après le déploiement
3. Videz le cache de votre navigateur (Ctrl+F5)

---

## 📞 SUPPORT

Pour toute question ou problème :

1. **Vérifiez d'abord ce guide**
2. **Consultez les logs** dans la console du navigateur (F12)
3. **Vérifiez le Google Sheet** pour voir si les données sont bien enregistrées
4. **Testez en local** pour isoler le problème

---

## 📊 STATISTIQUES ET RAPPORTS

L'application collecte automatiquement des statistiques :
- Nombre total de réservations
- Taux d'occupation par salle
- Réservations par service
- Réservations par type d'objet

Ces données sont exportables en CSV depuis le panel d'administration.

---

## 🎓 FORMATION DES AGENTS

**Points clés à expliquer aux agents :**
1. Comment accéder à l'application (URL)
2. La signification des couleurs du calendrier
3. Comment sélectionner un créneau (clic + glisser)
4. L'importance de fournir un email valide
5. Comment consulter et annuler leurs réservations
6. L'export iCal pour synchroniser avec leur agenda

**Durée de formation estimée :** 15-20 minutes

---

## ✅ CHECKLIST FINALE

Avant de mettre en production, vérifiez :

- [ ] Google Sheet créé avec les 3 onglets
- [ ] Google Sheet partagé en mode "Éditeur"
- [ ] Clé API Google créée et restreinte
- [ ] Compte EmailJS configuré avec les 2 templates
- [ ] Identifiants mis à jour dans `googleSheets.js`
- [ ] Emails administrateurs configurés
- [ ] Application testée en local
- [ ] Repository GitHub créé
- [ ] Application déployée sur GitHub Pages
- [ ] URL accessible et fonctionnelle
- [ ] Pare-feu Fortigate configuré
- [ ] Agents formés à l'utilisation

---

## 🎉 FÉLICITATIONS !

Votre système de réservation de salles est maintenant opérationnel !

**URL de votre application :**
`https://VOTRE-USERNAME-GITHUB.github.io/reservation-salles`

**Prochaines étapes suggérées :**
1. Communiquer l'URL aux agents
2. Organiser une session de démonstration
3. Surveiller les premières réservations
4. Collecter les retours utilisateurs
5. Ajuster si nécessaire

---

**Document créé par : Direction des Systèmes d'Information**
**Version : 1.0**
**Date : Décembre 2024**
