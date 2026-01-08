// src/services/googleSheetsService.js
import { GOOGLE_CONFIG, HORAIRES, JOURS_FERIES } from '../config/googleSheets';

class GoogleSheetsService {
  constructor() {
    this.gapiLoaded = false;
    this.gisLoaded = false;
    this.tokenClient = null;
    this.accessToken = null;
  }

  // Initialisation de l'API Google (Version Robuste)
  async initialize() {
    if (this.gapiLoaded && this.gisLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // --- Callback GAPI (API Data) ---
      const initGapiClient = async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
          });
          this.gapiLoaded = true;
          if (this.gisLoaded) resolve();
        } catch (err) {
          console.error("Erreur init GAPI:", err);
          reject(err);
        }
      };

      // --- Callback GIS (Identité/Token) ---
      const initGisClient = () => {
        try {
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '', // sera défini lors de l'appel
          });
          this.gisLoaded = true;
          if (this.gapiLoaded) resolve();
        } catch (err) {
          console.error("Erreur init GIS:", err);
          reject(err);
        }
      };

      // 1. Chargement GAPI
      if (window.gapi && window.gapi.client) {
        initGapiClient(); // Déjà chargé
      } else {
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.onload = () => window.gapi.load('client', initGapiClient);
        script1.onerror = (e) => reject(new Error("Erreur chargement script GAPI"));
        document.body.appendChild(script1);
      }

      // 2. Chargement GIS
      if (window.google && window.google.accounts) {
        initGisClient(); // Déjà chargé
      } else {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = initGisClient;
        script2.onerror = (e) => reject(new Error("Erreur chargement script GIS"));
        document.body.appendChild(script2);
      }
    });
  }

  // Demander l'accès OAuth 2.0
  async requestAccessToken() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          // Tentative de ré-init si manquant (filet de sécurité)
          console.warn("TokenClient manquant, tentative de réinitialisation...");
          if (window.google && window.google.accounts) {
             this.tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CONFIG.CLIENT_ID,
              scope: GOOGLE_CONFIG.SCOPES,
              callback: '',
            });
          } else {
            reject(new Error('Token client non initialisé et script Google manquant. Veuillez rafraîchir la page.'));
            return;
          }
        }

        this.tokenClient.callback = async (response) => {
          if (response.error !== undefined) {
            reject(response);
            return;
          }
          this.accessToken = response.access_token;
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: this.accessToken });
          }
          resolve(response);
        };

        if (this.accessToken && window.gapi.client.getToken()) {
          resolve({ access_token: this.accessToken });
          return;
        }

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated() {
    return this.accessToken !== null && window.gapi && window.gapi.client && window.gapi.client.getToken() !== null;
  }

  // Se déconnecter
  revokeToken() {
    if (window.gapi && window.gapi.client) {
        const token = window.gapi.client.getToken();
        if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token révoqué');
        });
        window.gapi.client.setToken(null);
        this.accessToken = null;
        }
    }
  }

  // Récupérer toutes les réservations
  async getAllReservations() {
    try {
      if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
        // Au lieu de planter, on attend l'init
        console.warn("API non prête, attente...");
        await this.initialize();
      }

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A2:S`,
        valueRenderOption: 'UNFORMATTED_VALUE', // IMPORTANT: Récupère les valeurs brutes (dates ISO)
        dateTimeRenderOption: 'FORMATTED_STRING' // Garde les dates lisibles si besoin
      });

      if (!response || !response.result) {
        throw new Error('Réponse invalide de Google Sheets');
      }

      const rows = response.result.values || [];
      return rows
        .filter(row => row && row[0] && row[1])
        .map((row, index) => ({
          id: row[0] || `res_${index}`,
          salle: row[1] || '',
          dateDebut: row[2] || '',
          heureDebut: row[3] || '',
          dateFin: row[4] || '',
          heureFin: row[5] || '',
          nom: row[6] || '',
          prenom: row[7] || '',
          email: row[8] || '',
          telephone: row[9] || '',
          service: row[10] || '',
          objet: row[11] || '',
          recurrence: (row[12] || '').toUpperCase() === 'OUI',
          recurrenceJusquau: row[13] || null,
          description: row[14] || '',
          statut: row[15] || 'active',
          agencement: row[16] || '',
          nbPersonnes: row[17] || '',
          dateCreation: row[18] || ''
        }));
    } catch (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      throw error;
    }
  }

  // Vérifier les conflits de réservation
  async checkConflicts(nouvelleReservation) {
    const reservations = await this.getAllReservations();
    
    const conflicts = reservations.filter(res => {
      if (res.salle !== nouvelleReservation.salle) return false;
      if (res.statut === 'cancelled') return false;

      // Comparaison temporelle fine (float)
      const resStart = this.timeToFloat(res.heureDebut);
      const resEnd = this.timeToFloat(res.heureFin);
      const newStart = this.timeToFloat(nouvelleReservation.heureDebut);
      const newEnd = this.timeToFloat(nouvelleReservation.heureFin);

      // Chevauchement si : (DebutA < FinB) et (FinA > DebutB)
      // Et dates identiques
      const memeJour = res.dateDebut === nouvelleReservation.dateDebut;
      
      return memeJour && (newStart < resEnd && newEnd > resStart);
    });

    return conflicts;
  }

  // Ajouter une nouvelle réservation
  async addReservation(reservation) {
    try {
      if (!this.isAuthenticated()) {
        await this.requestAccessToken();
      }

      const id = `RES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const dateFin = reservation.dateFin || reservation.dateDebut;

      const values = [[
        id,
        reservation.salle,
        reservation.dateDebut,
        reservation.heureDebut, // String "HH:mm"
        dateFin,
        reservation.heureFin,   // String "HH:mm"
        reservation.nom,
        reservation.prenom,
        reservation.email || '',
        reservation.telephone || '',
        reservation.service,
        reservation.objet,
        reservation.recurrence ? 'OUI' : 'NON',
        reservation.recurrenceJusquau || '',
        reservation.description || '',
        'active',
        reservation.agencement || '',
        reservation.nbPersonnes || '',
        new Date().toISOString()
      ]];

      const response = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:S`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });

      if (!response || !response.result) {
        throw new Error('La réponse de Google Sheets est invalide');
      }

      return { success: true, id };
    } catch (error) {
      console.error('Erreur addReservation:', error);
      if (error.message) throw new Error(error.message);
      else throw new Error('Erreur inconnue lors de l\'ajout.');
    }
  }

  // Supprimer une réservation
  async deleteReservation(reservationId) {
    try {
      if (!this.isAuthenticated()) await this.requestAccessToken();
      const reservation = await this.getReservationById(reservationId);
      if (!reservation) throw new Error('Réservation non trouvée');

      if (reservation.recurrence && reservation.recurrenceJusquau) {
        const allReservations = await this.getAllReservations();
        const toDelete = allReservations.filter(res => 
          res.email === reservation.email &&
          res.salle === reservation.salle &&
          res.heureDebut === reservation.heureDebut &&
          res.heureFin === reservation.heureFin &&
          res.objet === reservation.objet &&
          res.service === reservation.service &&
          res.recurrence === true
        );
        for (const res of toDelete) {
          await this.deleteReservationById(res.id);
        }
        return { success: true, count: toDelete.length };
      } else {
        await this.deleteReservationById(reservationId);
        return { success: true, count: 1 };
      }
    } catch (error) {
      console.error('Erreur deleteReservation:', error);
      throw error;
    }
  }

  async deleteReservationById(reservationId) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:A`,
      });
      const rows = response.result.values || [];
      const rowIndex = rows.findIndex(row => row[0] === reservationId);
      if (rowIndex === -1) return;

      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
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
      console.error('Erreur deleteReservationById:', error);
      throw error;
    }
  }

  // --- FONCTIONS UTILITAIRES OBLIGATOIRES POUR LE 30 MIN ---

  // Formater une heure décimale en chaîne HH:mm (ex: 8.5 -> "08:30")
  formatTime(timeValue) {
    const hours = Math.floor(timeValue);
    const minutes = Math.round((timeValue - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Convertir une chaîne HH:mm en heure décimale (ex: "08:30" -> 8.5)
  timeToFloat(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + (m / 60);
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getReservationById(id) {
    const all = await this.getAllReservations();
    return all.find(res => res.id === id);
  }
}

export default new GoogleSheetsService();