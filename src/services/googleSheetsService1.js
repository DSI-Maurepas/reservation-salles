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
  // Correction 10 : Supprimer réservation (gère récurrence)
  async deleteReservation(reservationId) {
    try {
      if (!this.isAuthenticated()) {
        console.log('Authentification requise pour supprimer...');
        await this.requestAccessToken();
      }

      // 1. Récupérer la réservation à supprimer
      const reservation = await this.getReservationById(reservationId);
      
      if (!reservation) {
        throw new Error('Réservation non trouvée');
      }

      // 2. Si récurrence, supprimer toutes les occurrences
      if (reservation.recurrence && reservation.recurrenceJusquau) {
        console.log('Suppression récurrence détectée...');
        const allReservations = await this.getAllReservations();
        
        // Trouver toutes les occurrences de cette récurrence
        const toDelete = allReservations.filter(res => 
          res.email === reservation.email &&
          res.salle === reservation.salle &&
          res.heureDebut === reservation.heureDebut &&
          res.heureFin === reservation.heureFin &&
          res.objet === reservation.objet &&
          res.service === reservation.service &&
          res.recurrence === true
        );

        console.log(`${toDelete.length} occurrences à supprimer`);

        // Supprimer chaque occurrence (de la plus récente à la plus ancienne pour préserver les index)
        const sortedToDelete = toDelete.sort((a, b) => {
          const dateA = new Date(a.dateDebut);
          const dateB = new Date(b.dateDebut);
          return dateB - dateA;
        });

        for (const res of sortedToDelete) {
          await this.deleteReservationById(res.id);
        }

        return { success: true, count: toDelete.length };
      } else {
        // Réservation simple
        await this.deleteReservationById(reservationId);
        return { success: true, count: 1 };
      }
    } catch (error) {
      console.error('Erreur deleteReservation:', error);
      throw error;
    }
  }

  // Fonction helper pour supprimer par ID
  async deleteReservationById(reservationId) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:A`,
      });

      const rows = response.result.values || [];
      const rowIndex = rows.findIndex(row => row[0] === reservationId);

      if (rowIndex === -1) {
        console.warn(`Réservation ${reservationId} déjà supprimée`);
        return;
      }

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

  /**
   * Nettoie automatiquement les réservations anciennes (> X jours)
   * Cette fonction est appelée automatiquement lors de chaque nouvelle réservation
   * 
   * @param {number} daysToKeep - Nombre de jours à conserver (par défaut 100)
   * @returns {Promise<{deleted: number, kept: number}>} - Statistiques du nettoyage
   */
  async cleanOldReservations(daysToKeep = 100) {
    console.log(`🧹 Début du nettoyage: suppression des réservations > ${daysToKeep} jours`);
    
    try {
      // Calculer la date limite (aujourd'hui - daysToKeep jours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limitDate = new Date(today);
      limitDate.setDate(limitDate.getDate() - daysToKeep);
      
      console.log(`📅 Date limite: ${this.formatDate(limitDate)}`);
      console.log(`📅 Les réservations avant cette date seront supprimées`);
      
      // Récupérer TOUTES les réservations
      const allReservations = await this.getAllReservations();
      console.log(`📋 ${allReservations.length} réservations totales à analyser`);
      
      // Filtrer les réservations à supprimer
      const toDelete = allReservations.filter(res => {
        // Parser la dateFin (format YYYY-MM-DD)
        const dateFin = new Date(res.dateFin);
        dateFin.setHours(0, 0, 0, 0);
        
        // Supprimer si dateFin < limitDate
        return dateFin < limitDate;
      });
      
      const toKeep = allReservations.length - toDelete.length;
      
      console.log(`🗑️  ${toDelete.length} réservations à supprimer`);
      console.log(`✅ ${toKeep} réservations à conserver`);
      
      // Supprimer les anciennes réservations
      if (toDelete.length > 0) {
        console.log('🗑️  Suppression en cours...');
        
        // Supprimer par lots de 10 pour ne pas surcharger l'API Google Sheets
        const BATCH_SIZE = 10;
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
          const batch = toDelete.slice(i, i + BATCH_SIZE);
          
          // Supprimer le lot en parallèle
          await Promise.all(
            batch.map(res => this.deleteReservation(res.id))
          );
          
          console.log(`  ✅ ${Math.min(i + BATCH_SIZE, toDelete.length)}/${toDelete.length} supprimées`);
          
          // Petite pause entre les lots (200ms) pour éviter rate limiting
          if (i + BATCH_SIZE < toDelete.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.log(`✅ Nettoyage terminé: ${toDelete.length} réservations supprimées`);
      } else {
        console.log('✅ Aucune réservation à nettoyer');
      }
      
      return {
        deleted: toDelete.length,
        kept: toKeep
      };
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
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

  // Correction 8 : Obtenir une réservation par ID
  async getReservationById(id) {
    try {
      const allReservations = await this.getAllReservations();
      return allReservations.find(res => res.id === id);
    } catch (error) {
      console.error('Erreur getReservationById:', error);
      throw error;
    }
  }

  // Correction 8 : Modifier une réservation
  async updateReservation(reservationId, updateData) {
    try {
      if (!this.isAuthenticated()) {
        console.log('Authentification requise pour modifier...');
        await this.requestAccessToken();
      }

      // 1. Trouver la ligne à mettre à jour
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:P`,
      });

      const rows = response.result.values || [];
      const rowIndex = rows.findIndex(row => row[0] === reservationId);

      if (rowIndex === -1) {
        throw new Error('Réservation non trouvée');
      }

      // 2. Construire la nouvelle ligne
      const updatedRow = [
        reservationId, // A - ID inchangé
        updateData.salle, // B
        updateData.dateDebut, // C
        updateData.heureDebut, // D
        updateData.dateFin, // E
        updateData.heureFin, // F
        updateData.nom, // G
        updateData.prenom || '', // H
        updateData.email, // I
        updateData.telephone || '', // J
        updateData.service, // K
        updateData.objet, // L
        updateData.recurrence ? 'true' : 'false', // M
        updateData.recurrenceJusquau || '', // N
        'Confirmée', // O - Statut
        new Date().toISOString() // P - Date modification
      ];

      // 3. Mettre à jour la ligne
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A${rowIndex + 1}:P${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [updatedRow]
        }
      });

      return { success: true, id: reservationId };
    } catch (error) {
      console.error('Erreur updateReservation:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();
