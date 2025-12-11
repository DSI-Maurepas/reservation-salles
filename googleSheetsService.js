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

  // Récupérer toutes les réservations
  async getAllReservations() {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A2:M`,
      });

      const rows = response.result.values || [];
      return rows.map((row, index) => ({
        id: row[0] || `res_${index}`,
        salle: row[1],
        dateDebut: row[2],
        heureDebut: row[3],
        dateFin: row[4],
        heureFin: row[5],
        nom: row[6],
        prenom: row[7],
        service: row[8],
        objet: row[9],
        recurrence: row[10] === 'OUI',
        recurrenceJusquau: row[11] || null,
        email: row[12] || '',
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
      // Même salle ?
      if (res.salle !== nouvelleReservation.salle) return false;

      // Vérifier le chevauchement temporel
      const resDebut = new Date(`${res.dateDebut}T${res.heureDebut}`);
      const resFin = new Date(`${res.dateFin}T${res.heureFin}`);
      const newDebut = new Date(`${nouvelleReservation.dateDebut}T${nouvelleReservation.heureDebut}`);
      const newFin = new Date(`${nouvelleReservation.dateFin}T${nouvelleReservation.heureFin}`);

      // Il y a conflit si les périodes se chevauchent
      return (newDebut < resFin && newFin > resDebut);
    });

    return conflicts;
  }

  // Ajouter une nouvelle réservation
  async addReservation(reservation) {
    try {
      // Vérifier d'abord les conflits
      const conflicts = await this.checkConflicts(reservation);
      if (conflicts.length > 0) {
        throw new Error('CONFLIT: Un ou plusieurs créneaux sont déjà réservés');
      }

      // Générer un ID unique
      const id = `RES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const values = [[
        id,
        reservation.salle,
        reservation.dateDebut,
        reservation.heureDebut,
        reservation.dateFin,
        reservation.heureFin,
        reservation.nom,
        reservation.prenom,
        reservation.service,
        reservation.objet,
        reservation.recurrence ? 'OUI' : 'NON',
        reservation.recurrenceJusquau || '',
        reservation.email || ''
      ]];

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:M`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });

      return { success: true, id };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la réservation:', error);
      throw error;
    }
  }

  // Supprimer une réservation
  async deleteReservation(reservationId) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEETS.RESERVATIONS}!A:A`,
      });

      const rows = response.result.values || [];
      const rowIndex = rows.findIndex(row => row[0] === reservationId);

      if (rowIndex === -1) {
        throw new Error('Réservation non trouvée');
      }

      // Supprimer la ligne (rowIndex + 1 car on commence à 1 dans Sheets)
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // ID de l'onglet Réservations
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2
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
