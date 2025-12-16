// src/services/googleSheetsService.js
import { GOOGLE_CONFIG, HORAIRES, JOURS_FERIES } from '../config/googleSheets';

class GoogleSheetsService {
  constructor() {
    this.gapiLoaded = false;
    this.gisLoaded = false;
    this.tokenClient = null;
    this.accessToken = null;
  }

  // Initialisation de l'API Google
  async initialize() {
    return new Promise((resolve, reject) => {
      // Chargement du script GAPI
      if (!window.gapi) {
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.onload = () => {
          window.gapi.load('client', async () => {
            await window.gapi.client.init({
              apiKey: GOOGLE_CONFIG.API_KEY,
              discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
            });
            this.gapiLoaded = true;
            if (this.gisLoaded) resolve();
          });
        };
        script1.onerror = reject;
        document.body.appendChild(script1);
      }

      // Chargement du script GIS (Google Identity Services)
      if (!window.google) {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = () => {
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '', // sera défini lors de l'appel
          });
          this.gisLoaded = true;
          if (this.gapiLoaded) resolve();
        };
        script2.onerror = reject;
        document.body.appendChild(script2);
      }
    });
  }

  // Demander l'accès OAuth 2.0
  async requestAccessToken() {
    return new Promise((resolve, reject) => {
      try {
        // Vérifier que le tokenClient est initialisé
        if (!this.tokenClient) {
          reject(new Error('Token client non initialisé. CLIENT_ID manquant ?'));
          return;
        }

        // Callback pour gérer la réponse OAuth
        this.tokenClient.callback = async (response) => {
          if (response.error !== undefined) {
            reject(response);
            return;
          }
          
          this.accessToken = response.access_token;
          
          // Configurer le token pour gapi.client
          window.gapi.client.setToken({
            access_token: this.accessToken
          });
          
          resolve(response);
        };

        // Si l'utilisateur a déjà un token valide
        if (this.accessToken && window.gapi.client.getToken()) {
          resolve({ access_token: this.accessToken });
          return;
        }

        // Demander un nouveau token (popup OAuth)
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated() {
    return this.accessToken !== null && window.gapi.client.getToken() !== null;
  }

  // Se déconnecter
  revokeToken() {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        console.log('Token révoqué');
      });
      window.gapi.client.setToken(null);
      this.accessToken = null;
    }
  }

  // Récupérer toutes les réservations
  async getAllReservations() {
    try {
      // Vérifier que l'API est initialisée
      if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
        throw new Error('API Google Sheets non initialisée');
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A2:P`,
      });

      if (!response || !response.result) {
        throw new Error('Réponse invalide de Google Sheets');
      }

      const rows = response.result.values || [];
      return rows
        .filter(row => row && row[0] && row[1]) // Filtrer lignes vides et sans ID/Salle
        .map((row, index) => ({
          id: row[0] || `res_${index}`,
          salle: row[1] || '',
          dateDebut: row[2] || '',
          heureDebut: row[3] || '',
          dateFin: row[4] || '',
          heureFin: row[5] || '',
          nom: row[6] || '',
          prenom: row[7] || '',
          email: row[8] || '',          // Colonne I (index 8)
          telephone: row[9] || '',       // Colonne J (index 9)
          service: row[10] || '',        // Colonne K (index 10)
          objet: row[11] || '',          // Colonne L (index 11)
          recurrence: (row[12] || '').toUpperCase() === 'OUI', // Colonne M (index 12)
          recurrenceJusquau: row[13] || null, // Colonne N (index 13)
          statut: row[14] || 'active',   // Colonne O (index 14)
          dateCreation: row[15] || ''    // Colonne P (index 15)
        }));
    } catch (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      
      if (error.message) {
        throw new Error(`Erreur de récupération: ${error.message}`);
      } else if (error.status === 403) {
        throw new Error('Accès refusé au Google Sheet. Vérifiez les permissions.');
      } else if (error.status === 404) {
        throw new Error('Google Sheet introuvable. Vérifiez la configuration.');
      } else {
        throw new Error('Impossible de récupérer les réservations. Vérifiez votre connexion.');
      }
    }
  }

  // Vérifier les conflits de réservation
  async checkConflicts(nouvelleReservation) {
    const reservations = await this.getAllReservations();
    
    const conflicts = reservations.filter(res => {
      // Même salle ?
      if (res.salle !== nouvelleReservation.salle) return false;

      // Vérifier le chevauchement temporel
      const resDebut = new Date(`${res.dateDebut}T${res.heureDebut}`);
      const resFin = new Date(`${res.dateFin || res.dateDebut}T${res.heureFin}`);
      const newDebut = new Date(`${nouvelleReservation.dateDebut}T${nouvelleReservation.heureDebut}`);
      const newFin = new Date(`${nouvelleReservation.dateFin || nouvelleReservation.dateDebut}T${nouvelleReservation.heureFin}`);

      // Il y a conflit si les périodes se chevauchent
      return (newDebut < resFin && newFin > resDebut);
    });

    return conflicts;
  }

  // Ajouter une nouvelle réservation
  async addReservation(reservation) {
    try {
      // Vérifier que l'API est initialisée
      if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
        throw new Error('API Google Sheets non initialisée. Veuillez rafraîchir la page.');
      }

      // IMPORTANT : Demander l'authentification OAuth avant d'écrire
      if (!this.isAuthenticated()) {
        console.log('Authentification requise pour créer une réservation...');
        await this.requestAccessToken();
      }

      // Vérifier d'abord les conflits
      const conflicts = await this.checkConflicts(reservation);
      if (conflicts.length > 0) {
        throw new Error('CONFLIT: Un ou plusieurs créneaux sont déjà réservés');
      }

      // Générer un ID unique
      const id = `RES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Valider les données
      if (!reservation.salle || !reservation.dateDebut || !reservation.heureDebut) {
        throw new Error('Données de réservation incomplètes (salle, date ou heure manquante)');
      }

      const values = [[
        id,                                    // A: ID
        reservation.salle,                     // B: Salle
        reservation.dateDebut,                 // C: Date Début
        reservation.heureDebut,                // D: Heure Début
        reservation.dateFin,                   // E: Date Fin
        reservation.heureFin,                  // F: Heure Fin
        reservation.nom,                       // G: Nom
        reservation.prenom,                    // H: Prénom
        reservation.email || '',               // I: Email
        reservation.telephone || '',           // J: Téléphone
        reservation.service,                   // K: Service
        reservation.objet,                     // L: Objet
        reservation.recurrence ? 'OUI' : 'NON', // M: Récurrence
        reservation.recurrenceJusquau || '',   // N: Récurrence Jusqu'au
        'active',                              // O: Statut
        new Date().toISOString()               // P: Date de création
      ]];

      const response = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:P`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });

      // Vérifier que l'ajout a réussi
      if (!response || !response.result) {
        throw new Error('La réponse de Google Sheets est invalide');
      }

      return { success: true, id };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la réservation:', error);
      
      // Améliorer le message d'erreur
      if (error.message) {
        throw new Error(error.message);
      } else if (error.result && error.result.error) {
        throw new Error(`Erreur Google Sheets: ${error.result.error.message}`);
      } else if (error.status === 403) {
        throw new Error('Accès refusé. Vérifiez les permissions du Google Sheet.');
      } else if (error.status === 404) {
        throw new Error('Google Sheet introuvable. Vérifiez l\'ID de la feuille.');
      } else {
        throw new Error('Erreur inconnue lors de l\'ajout. Vérifiez votre connexion et réessayez.');
      }
    }
  }

  // Supprimer une réservation
  async deleteReservation(reservationId) {
    try {
      // IMPORTANT : Demander l'authentification OAuth avant de supprimer
      if (!this.isAuthenticated()) {
        console.log('Authentification requise pour supprimer une réservation...');
        await this.requestAccessToken();
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:A`,
      });

      const rows = response.result.values || [];
      const rowIndex = rows.findIndex(row => row[0] === reservationId);

      if (rowIndex === -1) {
        throw new Error('Réservation non trouvée');
      }

      // Supprimer la ligne
      // rowIndex correspond déjà à la position correcte car rows inclut l'en-tête
      // deleteDimension utilise des index 0-based où 0 = première ligne (en-tête)
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // ID de l'onglet Réservations
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Calculer la disponibilité d'une date
  async getDateAvailability(date) {
    const reservations = await this.getAllReservations();
    const dateStr = this.formatDate(date);

    // Vérifier si c'est un dimanche ou jour férié
    if (date.getDay() === 0 || JOURS_FERIES.includes(dateStr)) {
      return 'closed'; // Fermé
    }

    // Compter les créneaux réservés pour cette date
    const reservationsDuJour = reservations.filter(res => 
      res.dateDebut === dateStr || 
      (res.dateDebut <= dateStr && res.dateFin >= dateStr)
    );

    if (reservationsDuJour.length === 0) {
      return 'available'; // Toutes les salles disponibles - VERT
    }

    // Calculer le nombre total de créneaux possibles
    const nbSalles = 9; // SALLES.length
    const nbCreneaux = HORAIRES.HEURE_FIN - HORAIRES.HEURE_DEBUT; // 14 créneaux (8h-22h)
    const totalCreneauxPossibles = nbSalles * nbCreneaux;

    // Compter les créneaux réservés
    let creneauxReserves = 0;
    reservationsDuJour.forEach(res => {
      const debut = parseInt(res.heureDebut.split(':')[0]);
      const fin = parseInt(res.heureFin.split(':')[0]);
      creneauxReserves += (fin - debut);
    });

    const tauxOccupation = creneauxReserves / totalCreneauxPossibles;

    if (tauxOccupation >= 1) {
      return 'full'; // Complet - NOIR
    } else if (tauxOccupation > 0.7) {
      return 'busy'; // Très occupé - ROUGE
    } else if (tauxOccupation > 0.3) {
      return 'partial'; // Partiellement occupé - ORANGE
    } else {
      return 'available'; // Disponible - VERT
    }
  }

  // Utilitaire: formater une date en YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Utilitaire: formater une heure en HH:00
  formatTime(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
  }
}

export default new GoogleSheetsService();
