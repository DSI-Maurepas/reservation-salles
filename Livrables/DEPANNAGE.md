# 🔧 GUIDE DE DÉPANNAGE RAPIDE

## Problèmes courants et solutions immédiates

---

## ⚠️ L'application ne se charge pas

### Symptôme
Page blanche ou erreur "Cannot GET /"

### Solutions
1. **Vérifiez l'URL**
   - Format correct : `https://username.github.io/reservation-salles`
   - Pas de `/index.html` à la fin

2. **Videz le cache**
   - Chrome/Edge : `Ctrl + Shift + Delete`
   - Firefox : `Ctrl + Shift + Delete`
   - Cochez "Images et fichiers en cache"

3. **Attendez le déploiement**
   - Après `npm run deploy`, attendez 2-3 minutes
   - Vérifiez sur GitHub : Settings > Pages > "Your site is live at..."

4. **Vérifiez la branche gh-pages**
   ```bash
   git branch -a
   ```
   Doit afficher `remotes/origin/gh-pages`

---

## 🔐 Erreur "API key not valid"

### Symptôme
Message d'erreur dans la console : "API key not valid"

### Solutions
1. **Vérifiez la clé API**
   - Allez sur Google Cloud Console
   - API et services > Identifiants
   - Vérifiez que la clé est bien copiée

2. **Restrictions de la clé**
   - Cliquez sur la clé API
   - Dans "Restrictions relatives aux API"
   - Assurez-vous que seule "Google Sheets API" est cochée

3. **Testez la clé**
   Ouvrez cette URL dans le navigateur (remplacez YOUR_API_KEY et YOUR_SPREADSHEET_ID) :
   ```
   https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID?key=YOUR_API_KEY
   ```
   Vous devez voir des données JSON, pas une erreur.

---

## 📊 Le Google Sheet ne se remplit pas

### Symptôme
Les réservations semblent validées mais n'apparaissent pas dans le Sheet

### Solutions
1. **Vérifiez les permissions**
   - Ouvrez le Google Sheet
   - Cliquez sur "Partager"
   - Vérifiez : "Tous les utilisateurs disposant du lien" = "Éditeur"

2. **Vérifiez l'ID du spreadsheet**
   - Dans `src/config/googleSheets.js`
   - `SPREADSHEET_ID` doit correspondre à l'ID dans l'URL
   - URL : `https://docs.google.com/spreadsheets/d/1ABC-xyz123/edit`
   - ID : `1ABC-xyz123`

3. **Vérifiez les noms des onglets**
   - Onglet 1 : Exactement "Réservations"
   - Onglet 2 : Exactement "Salles"
   - Onglet 3 : Exactement "Configuration"
   - Attention à la casse et aux espaces !

4. **Vérifiez la structure**
   - L'onglet "Réservations" doit avoir les en-têtes en ligne 1
   - Les colonnes doivent être dans l'ordre exact (A à M)

---

## 📧 Les emails ne sont pas envoyés

### Symptôme
Réservation validée mais pas d'email reçu

### Solutions
1. **Vérifiez le quota EmailJS**
   - Connectez-vous sur emailjs.com
   - Vérifiez votre quota (200 emails/mois en gratuit)

2. **Vérifiez la connexion du service**
   - EmailJS Dashboard > Email Services
   - Le service doit être "Connected"
   - Si rouge, reconnectez votre compte email

3. **Vérifiez les identifiants**
   Dans `src/config/googleSheets.js` :
   ```javascript
   SERVICE_ID: 'service_xxxxxx',  // Doit commencer par 'service_'
   TEMPLATE_ID_CONFIRMATION: 'template_xxxxxx',  // Doit commencer par 'template_'
   USER_ID: 'xxxxxx'  // Public Key (Account > General)
   ```

4. **Vérifiez les templates**
   - Les variables doivent correspondre : `{{to_email}}`, `{{salle}}`, etc.
   - Testez depuis EmailJS : Send Test Email

5. **Vérifiez le dossier spam**
   - Les emails peuvent arriver dans les spams
   - Ajoutez l'expéditeur aux contacts

---

## 🚫 Erreur de conflit alors que le créneau semble libre

### Symptôme
Message "Un conflit de réservation a été détecté"

### Solutions
1. **Rafraîchissez la page**
   - Appuyez sur F5
   - Ou Ctrl+F5 (refresh complet)

2. **Vérifiez dans le Google Sheet**
   - Ouvrez l'onglet "Réservations"
   - Cherchez la date/heure/salle concernée
   - Il peut y avoir une réservation invisible

3. **Nettoyez les lignes vides**
   - Dans Google Sheets
   - Supprimez les lignes vides entre les réservations

4. **Vérifiez les formats de date**
   - Format attendu : YYYY-MM-DD (ex: 2024-12-25)
   - Format attendu heure : HH:00 (ex: 14:00)

---

## 🎨 L'interface est cassée / pas de style

### Symptôme
Texte sans mise en forme, boutons mal alignés

### Solutions
1. **Vérifiez les fichiers CSS**
   - Tous les fichiers .css doivent être présents
   - Vérifiez dans le dossier `src/components/`

2. **Videz le cache**
   - Ctrl+Shift+Delete
   - Cochez "Feuilles de style en cache"

3. **Vérifiez la console**
   - Appuyez sur F12
   - Onglet "Console"
   - Cherchez des erreurs 404 sur les fichiers .css

4. **Rebuild l'application**
   ```bash
   rm -rf build
   npm run build
   npm run deploy
   ```

---

## 🖱️ Le drag-and-drop ne fonctionne pas

### Symptôme
Impossible de sélectionner un créneau en cliquant-glissant

### Solutions
1. **Vérifiez le navigateur**
   - Utilisez Chrome, Edge ou Firefox récent
   - Mettez à jour votre navigateur

2. **Désactivez les extensions**
   - Certaines extensions bloquent les interactions
   - Testez en mode navigation privée

3. **Vérifiez sur mobile**
   - Le drag-and-drop peut ne pas fonctionner sur mobile
   - Utilisez un ordinateur

---

## 📅 Le calendrier n'affiche pas les bonnes couleurs

### Symptôme
Toutes les dates apparaissent en gris ou avec la même couleur

### Solutions
1. **Attendez le chargement**
   - Le calcul de disponibilité peut prendre quelques secondes
   - Vérifiez qu'il n'y a pas de spinner qui tourne

2. **Vérifiez les données**
   - Ouvrez le Google Sheet
   - Vérifiez qu'il y a bien des réservations

3. **Vérifiez la console**
   - F12 > Console
   - Cherchez des erreurs de récupération de données

---

## 🔑 "Accès refusé" dans le panel Admin

### Symptôme
Message "Vous n'êtes pas autorisé à accéder à cette section"

### Solutions
1. **Vérifiez l'email**
   - L'email doit être EXACTEMENT celui dans la config
   - Attention aux majuscules/minuscules

2. **Ajoutez votre email**
   Dans `src/config/googleSheets.js` :
   ```javascript
   export const ADMINISTRATEURS = [
     'admin@mairie.fr',
     'votre.email@mairie.fr'  // ← Ajoutez le vôtre ici
   ];
   ```

3. **Redéployez**
   ```bash
   npm run deploy
   ```

---

## 🌐 Problème avec le pare-feu FortiGate

### Symptôme
Aucune donnée ne se charge, erreurs de connexion

### Solutions
1. **Vérifiez les domaines autorisés**
   Sur votre FortiGate, autorisez :
   - `sheets.googleapis.com`
   - `accounts.google.com`
   - `*.googleapis.com`
   - `api.emailjs.com`
   - `cdn.emailjs.com`

2. **Vérifiez les certificats SSL**
   - Le FortiGate peut inspecter le SSL
   - Ajoutez les domaines Google en exception

3. **Testez depuis un autre réseau**
   - Utilisez votre téléphone en 4G
   - Si ça fonctionne, c'est bien le pare-feu

---

## 🔍 Comment débugger efficacement

### Étape 1 : Ouvrir la console
- Appuyez sur **F12**
- Allez dans l'onglet **"Console"**

### Étape 2 : Identifier les erreurs
- Erreurs rouges = problème bloquant
- Warnings jaunes = à surveiller mais non bloquant

### Étape 3 : Erreurs courantes

**"Failed to fetch"**
→ Problème réseau ou API

**"Cannot read property of undefined"**
→ Données manquantes dans le Google Sheet

**"API key not valid"**
→ Problème de clé API Google

**"Network Error"**
→ Problème de pare-feu ou connexion

### Étape 4 : Vérifier le Google Sheet
1. Ouvrez le Sheet
2. Vérifiez que les données s'ajoutent
3. Si oui : problème d'affichage
4. Si non : problème de permissions ou API

---

## 🆘 Checklist de dépannage complète

Avant de demander de l'aide, vérifiez :

- [ ] L'application fonctionne en local (`npm start`)
- [ ] Le Google Sheet est bien partagé en "Éditeur"
- [ ] L'ID du spreadsheet est correct
- [ ] La clé API Google est valide et restreinte
- [ ] Les identifiants EmailJS sont corrects
- [ ] Les 3 onglets existent avec les bons noms
- [ ] Les en-têtes sont en ligne 1
- [ ] Le cache du navigateur est vidé
- [ ] La console (F12) ne montre pas d'erreur rouge
- [ ] Le déploiement GitHub Pages est terminé

---

## 📞 Obtenir de l'aide

Si le problème persiste :

1. **Notez le message d'erreur exact**
   - Copie d'écran de la console (F12)

2. **Vérifiez le Google Sheet**
   - Les données s'y trouvent-elles ?

3. **Testez en local**
   ```bash
   npm start
   ```
   - Ça fonctionne en local ? → Problème de déploiement
   - Ça ne fonctionne pas ? → Problème de configuration

4. **Partagez ces informations**
   - Message d'erreur complet
   - Capture d'écran de la console
   - Ce qui fonctionne / ne fonctionne pas
   - Ce que vous avez déjà essayé

---

## 💡 Astuces de pro

### Tester rapidement une modification
```bash
npm start
# L'application se recharge automatiquement à chaque modification
```

### Voir les requêtes API
1. F12 > Onglet "Network"
2. Filtrer par "XHR"
3. Vous verrez toutes les requêtes vers Google Sheets

### Forcer le rechargement complet
- Windows/Linux : `Ctrl + F5`
- Mac : `Cmd + Shift + R`

### Débugger EmailJS
Allez sur emailjs.com > Email History pour voir tous les emails envoyés

---

**Ce guide couvre 95% des problèmes courants !**
