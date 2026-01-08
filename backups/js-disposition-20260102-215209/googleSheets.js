// src/config/googleSheets.js
// Configuration pour l'API Google Sheets
// VERSION FINALE - 31/12/2025
// Configuration unifiée et validée

export const GOOGLE_CONFIG = {
  API_KEY: 'AIzaSyAfpo4O0YkzjG8AaRl9tz9JMcAdQW3b8nY',
  CLIENT_ID: '175113424020-t2ootm4m0v08kkn1vbadmd2qeqt5cv27.apps.googleusercontent.com',
  SPREADSHEET_ID: '1SNkHpAXIzu3GNQxFX3csCRv_4rz9M52xO6ov0LCed7Q',
  
  SHEETS: {
    RESERVATIONS: 'Réservations',
    SALLES: 'Salles',
    CONFIG: 'Configuration'
  },
  
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

export const EMAIL_CONFIG = {
  // ⚠️ À COMPLÉTER avec vos identifiants EmailJS réels
  SERVICE_ID: 'VOTRE_SERVICE_ID',
  TEMPLATE_ID_CONFIRMATION: 'VOTRE_TEMPLATE_CONFIRMATION',
  TEMPLATE_ID_ANNULATION: 'VOTRE_TEMPLATE_ANNULATION',
  USER_ID: 'VOTRE_USER_ID'
};

// Liste des salles de la mairie (9 salles)
export const SALLES = [
  'Salle Conseil - 100 Personnes',
  'Salle Mariages - 30 Personnes',
  'Salle 16e A - 20 Personnes',
  'Salle 16e B - 19 Personnes',
  'Salle N°1 - 2 Personnes',
  'Salle N°2 - 12 Personnes',
  'Salle N°3 - 8 Personnes',
  'Salle N°4 - 4 Personnes',
  'Salle CCAS - 10 Personnes'
];

// Liste des services (46 services)
export const SERVICES = [
  'Achats Publics',
  'Administration Générale',
  'Archives',
  'Cabinet du Maire',
  'CCAS',
  'Centres de Loisirs',
  'Commande Publique',
  'Direction des Systèmes d\'Information',
  'Direction Générale',
  'Direction Ressources Humaines',
  'Élus',
  'Finances',
  'Juridique',
  'Pôle communication Animation Ville',
  'Pôle communication Animation Ville / Animation de la ville',
  'Pôle communication Animation Ville / Communication',
  'Pôle communication Animation Ville / Reprographie',
  'Pôle Culture',
  'Pôle Culture / Café',
  'Pôle Culture / Camus',
  'Pôle Culture / Cobalt',
  'Pôle Culture / Conservatoire',
  'Pôle Culture / Diffusion',
  'Pôle Famille',
  'Pôle Famille / Education',
  'Pôle Famille / Enfance',
  'Pôle Famille / Hygiène et Restauration',
  'Pôle Famille / Petite Enfance',
  'Pôle Loisirs',
  'Pôle Loisirs / Animation Sénior',
  'Pôle Loisirs / BIJ',
  'Pôle Loisirs / Ecole des sports',
  'Pôle Loisirs / Mille Club',
  'Pôle Loisirs / Sports',
  'Pôle Loisirs / Tridim',
  'Pôle Loisirs / Vie Associative',
  'Pôle Solidarité',
  'Pôle Solidarité / Relais Marianne',
  'Police Municipale',
  'Régies',
  'Syndicats',
  'Technique',
  'Technique / Pôle Aménagement Et Environnement',
  'Technique / Pôle Patrimoine',
  'Technique / Serres'
];

// Types d'objets de réservation (10 objets)
export const OBJETS_RESERVATION = [
  'Réunion de service',
  'Réunion Élus / Commissions',
  'Réunion avec prestataire',
  'Formation interne',
  'Formation externe (prestataires)',
  'Événement municipal / public',
  'Entretien RH',
  'Usage logistique / technique',
  'Permanence (élus ou services)',
  'Autre'
];

// Couleurs des objets de réservation - MODERNES ET CONTRASTÉES
export const COULEURS_OBJETS = {  'Réunion de service': '#64B5F6',  'Réunion Élus / Commissions': '#F06292',  'Réunion avec prestataire': '#0D47A1',  'Formation interne': '#81C784',  'Formation externe (prestataires)': '#1B5E20',  'Événement municipal / public': '#FFA726',  'Entretien RH': '#FF7043',  'Usage logistique / technique': '#AB47BC',  'Permanence (élus ou services)': '#880E4F',  'Autre': '#BDBDBD'};

// Horaires d'ouverture
export const HORAIRES = {
  HEURE_DEBUT: 8,
  HEURE_FIN: 22,
  JOURS_OUVRES: [1, 2, 3, 4, 5, 6], // Lundi à Samedi
  DUREE_CRENEAU: 1
};

// Jours fériés français 2024-2032
export const JOURS_FERIES = [
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11',
  '2024-12-25',
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
  '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11',
  '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14',
  '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11',
  '2026-12-25',
  '2027-01-01', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-08',
  '2027-05-17', '2027-07-14', '2027-08-15', '2027-11-01', '2027-11-11',
  '2027-12-25',
  '2028-01-01', '2028-04-17', '2028-05-01', '2028-05-08', '2028-05-25',
  '2028-06-05', '2028-07-14', '2028-08-15', '2028-11-01', '2028-11-11',
  '2028-12-25',
  '2029-01-01', '2029-04-02', '2029-05-01', '2029-05-08', '2029-05-10',
  '2029-05-21', '2029-07-14', '2029-08-15', '2029-11-01', '2029-11-11',
  '2029-12-25',
  '2030-01-01', '2030-04-22', '2030-05-01', '2030-05-08', '2030-05-30',
  '2030-06-10', '2030-07-14', '2030-08-15', '2030-11-01', '2030-11-11',
  '2030-12-25',
  '2031-01-01', '2031-04-14', '2031-05-01', '2031-05-08', '2031-05-22',
  '2031-06-02', '2031-07-14', '2031-08-15', '2031-11-01', '2031-11-11',
  '2031-12-25',
  '2032-01-01', '2032-03-29', '2032-05-01', '2032-05-06', '2032-05-08',
  '2032-05-17', '2032-07-14', '2032-08-15', '2032-11-01', '2032-11-11',
  '2032-12-25'
];

// Administrateurs de l'application (adresses email)
export const ADMINISTRATEURS = [
  'j.matrat@maurepas.fr',
  'admin@maurepas.fr',
  'sevindi.munure@gmail.com',
  'cabinet@maurepas.fr',
  'mchaumeron@gmail.com'
];

// ⚠️ CRITIQUE : Les noms doivent être IDENTIQUES à ceux dans SALLES (avec capacités)
export const SALLES_ADMIN_ONLY = [
  'Salle Conseil - 100 Personnes',
  'Salle Mariages - 30 Personnes'
];

// Motifs d'annulation standardisés
export const MOTIFS_ANNULATION = [
  'Changement de date',
  'Changement de salle',
  'Réunion annulée',
  'Conflit d\'agenda',
  'Absence de participants',
  'Report à une date ultérieure',
  'Problème technique',
  'Événement annulé',
  'Erreur de réservation',
  'Autre raison'
];
