// src/config/googleSheets.js
// Configuration pour l'API Google Sheets

export const GOOGLE_CONFIG = {
  // À REMPLACER : Votre API Key Google (pour la lecture publique)
  API_KEY: 'AIzaSyAfpo4O0YkzjG8AaRl9tz9JMcAdQW3b8nY',
  
  // À REMPLACER : Votre Client ID OAuth 2.0 (pour l'écriture avec authentification)
  // IMPORTANT : Nécessaire pour pouvoir créer/modifier/supprimer des réservations
  // Obtenir depuis : https://console.cloud.google.com/apis/credentials
  CLIENT_ID: '175113424020-t2ootm4m0v08kkn1vbadmd2qeqt5cv27.apps.googleusercontent.com',
  
  // À REMPLACER : L'ID de votre Google Sheet
  // Exemple: si l'URL est https://docs.google.com/spreadsheets/d/1ABC-xyz123/edit
  // alors SPREADSHEET_ID = '1ABC-xyz123'
  SPREADSHEET_ID: '1SNkHpAXIzu3GNQxFX3csCRv_4rz9M52xO6ov0LCed7Q',
  
  // Noms des onglets dans votre Google Sheet
  SHEETS: {
    RESERVATIONS: 'Réservations',
    SALLES: 'Salles',
    CONFIG: 'Configuration'
  },
  
  // Portée de l'API (lecture et écriture)
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

// Configuration EmailJS pour les notifications
export const EMAIL_CONFIG = {
  // À REMPLACER : Vos identifiants EmailJS (voir guide d'installation)
  SERVICE_ID: 'VOTRE_SERVICE_ID',
  TEMPLATE_ID_CONFIRMATION: 'VOTRE_TEMPLATE_CONFIRMATION',
  TEMPLATE_ID_ANNULATION: 'VOTRE_TEMPLATE_ANNULATION',
  USER_ID: 'VOTRE_USER_ID'
};

// Liste des salles de la mairie
export const SALLES = [
  'Salle du Conseil',
  'Salle des Mariages',
  'Salle du 16eme A',
  'Salle du 16eme B',
  'Salle rdc N°1',
  'Salle rdc N°2',
  'Salle rdc N°3',
  'Salle CCAS',
  'Salle CTM'
];

// Capacités des salles
export const CAPACITES_SALLES = {
  'Salle du Conseil': '30 pers.',
  'Salle des Mariages': '20 pers.',
  'Salle du 16eme A': '12 pers.',
  'Salle du 16eme B': '12 pers.',
  'Salle rdc N°1': '8 pers.',
  'Salle rdc N°2': '8 pers.',
  'Salle rdc N°3': '8 pers.',
  'Salle CCAS': '10 pers.',
  'Salle CTM': '15 pers.'
};

// Liste des services
export const SERVICES = [
  'Cabinet du Maire',
  'CCAS',
  'Direction de la Communication',
  'Direction de la Communication/Evénementiel',
  'Direction des Systèmes d\'Information',
  'Direction des Finances',
  'Direction des Ressources Humaines',
  'Direction Générale',
  'Direction Générale/Courrier',
  'Direction Générale/Documentation - Archives',
  'Direction Générale/Juridique',
  'Direction Générale/Qualité',
  'Pôle Citoyen',
  'Pôle Culture/Conservatoire',
  'Pôle Culture/Café de la Plage',
  'Pôle Culture/Cobalt',
  'Pôle Culture/TAC',
  'Pôle Famille/Hygiène et Restauration',
  'Pôle Famille/Enfance',
  'Pôle Famille/Petite Enfance',
  'Pôle Famille/Scolaire',
  'Pôle Loisirs/Animation Seniors',
  'Pôle Loisirs/Jeunesse',
  'Pôle Loisirs/Jeunesse/Mille Club',
  'Pôle Loisirs/Jeunesse/Tridim',
  'Pôle Loisirs/Sports',
  'Pôle Loisirs/Vie Associative',
  'Police Municipale',
  'Service Achats',
  'Service de la Commande publique',
  'Services Techniques',
  'Services Techniques/Urbanisme',
  'Solidarité',
  'Solidarité/BIJ',
  'Solidarité/Relais Marianne',
  'Syndicat'
];

// Types d'objets de réservation
export const OBJETS_RESERVATION = [
  'Réunion',
  'Formation',
  'Événement',
  'CODIR',
  'COPIL',
  'COTECH',
  'Présentation',
  'Convivialité',
  'Prioritaire'
];

// Horaires d'ouverture
export const HORAIRES = {
  HEURE_DEBUT: 8,
  HEURE_FIN: 22,
  JOURS_OUVRES: [1, 2, 3, 4, 5, 6], // Lundi à Samedi (0 = Dimanche)
  DUREE_CRENEAU: 1 // en heures
};

// Jours fériés français 2024-2026 (à mettre à jour annuellement)
export const JOURS_FERIES = [
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11',
  '2024-12-25',
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
  '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11',
  '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14',
  '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11',
  '2026-12-25'
];

// Administrateurs de l'application (adresses email)
export const ADMINISTRATEURS = [
  'j.matrat@maurepas.fr', // DSI
  'admin@maurepas.fr'
];

// Motifs d'annulation obligatoires pour toute suppression
export const MOTIFS_ANNULATION = [
  "Réquisition par la Direction / Cabinet du Maire",
  "Évènement institutionnel prioritaire",
  "Indisponibilité exceptionnelle de la salle",
  "Réorganisation interne / besoin de service",
  "Annulation à la demande de l'agent"
];
