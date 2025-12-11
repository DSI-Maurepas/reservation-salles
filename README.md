# 🏛️ Système de Réservation de Salles - Mairie

Application web moderne pour gérer les réservations de salles municipales.

## ✨ Fonctionnalités

- 📅 **Calendrier interactif** avec code couleur de disponibilité
- 🖱️ **Réservation intuitive** par drag-and-drop
- ⚡ **Détection de conflits** en temps réel
- 📧 **Notifications email** automatiques
- 📊 **Statistiques complètes** et exports
- 👤 **Gestion personnelle** des réservations
- ⚙️ **Panel d'administration** complet
- 📱 **Design responsive** (PC, tablette, mobile)

## 🚀 Démarrage rapide

### Prérequis
- Node.js 14+
- Compte Google
- Compte EmailJS (gratuit)
- Compte GitHub

### Installation

1. **Clonez le repository**
```bash
git clone https://github.com/VOTRE-USERNAME/reservation-salles.git
cd reservation-salles
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Configurez vos identifiants**
   
   Éditez `src/config/googleSheets.js` et remplacez :
   - `VOTRE_CLE_API_GOOGLE`
   - `VOTRE_ID_SPREADSHEET`
   - `VOTRE_SERVICE_ID`
   - `VOTRE_TEMPLATE_CONFIRMATION`
   - `VOTRE_TEMPLATE_ANNULATION`
   - `VOTRE_USER_ID`

4. **Lancez l'application en local**
```bash
npm start
```

5. **Déployez sur GitHub Pages**
```bash
npm run deploy
```

## 📖 Documentation complète

Consultez le [Guide d'Installation Complet](GUIDE_INSTALLATION.md) pour :
- Configuration détaillée de Google Sheets
- Création de la clé API Google
- Configuration d'EmailJS
- Déploiement sur GitHub Pages
- Résolution des problèmes
- Formation des utilisateurs

## 🏗️ Architecture

```
reservation-salles/
├── src/
│   ├── components/          # Composants React
│   │   ├── CalendarView.js     # Calendrier principal
│   │   ├── ReservationGrid.js  # Grille de réservation
│   │   ├── MyReservations.js   # Gestion personnelle
│   │   └── AdminPanel.js       # Administration
│   ├── services/            # Services (API, email)
│   ├── config/              # Configuration
│   └── App.js              # Composant principal
├── public/
└── package.json
```

## 🛠️ Technologies utilisées

- **Frontend:** React 18
- **Styling:** CSS personnalisé avec animations
- **Backend:** Google Sheets API (base de données gratuite)
- **Emails:** EmailJS
- **Hébergement:** GitHub Pages (gratuit)

## 👥 Utilisation

### Pour les agents

1. Accédez à l'application via l'URL fournie
2. Sélectionnez une date sur le calendrier
3. Cliquez et glissez pour sélectionner un créneau
4. Remplissez le formulaire de réservation
5. Recevez une confirmation par email

### Pour les administrateurs

1. Cliquez sur "Administration"
2. Connectez-vous avec un email administrateur
3. Consultez les statistiques
4. Gérez toutes les réservations
5. Exportez les données

## 🔧 Configuration

### Salles disponibles (9 salles)
- Salle du Conseil
- Salle des Mariages
- Salle du 16eme A
- Salle du 16eme B
- Salle rdc N°1
- Salle rdc N°2
- Salle rdc N°3
- Salle CCAS
- Salle CTM

### Horaires
- Lundi au Samedi : 8h - 22h
- Dimanche et jours fériés : Fermé
- Créneaux minimum : 1 heure

## 📊 Statistiques

L'application génère automatiquement :
- Taux d'occupation par salle
- Réservations par service
- Réservations par type d'événement
- Exports CSV pour analyses approfondies

## 🔒 Sécurité

- Authentification par email pour les administrateurs
- Validation des conflits côté serveur
- Gestion des accès via Google Sheets
- Aucune donnée sensible stockée localement

## 🆘 Support

En cas de problème, consultez :
1. Le [Guide d'Installation](GUIDE_INSTALLATION.md)
2. La console du navigateur (F12)
3. Les logs de Google Sheets

## 📝 License

Ce projet est développé pour la mairie dans le cadre de la modernisation des services municipaux.

## 👨‍💻 Développement

### Scripts disponibles

```bash
npm start          # Lance l'application en mode développement
npm run build      # Compile l'application pour la production
npm test           # Lance les tests
npm run deploy     # Déploie sur GitHub Pages
```

### Structure des données (Google Sheets)

**Onglet "Réservations"**
| ID | Salle | Date Début | Heure Début | Date Fin | Heure Fin | Nom | Prénom | Service | Objet | Récurrence | Récurrence Jusqu'au | Email |

## 🎯 Roadmap

- [ ] Ajout de pièces jointes aux réservations
- [ ] Intégration Microsoft Teams/Outlook
- [ ] Application mobile native
- [ ] Tableau de bord temps réel
- [ ] Système de notifications push

---

**Développé par la Direction des Systèmes d'Information**

*Pour toute question technique, contactez le DSI*
