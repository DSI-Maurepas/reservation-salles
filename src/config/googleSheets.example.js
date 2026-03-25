// src/config/googleSheets.js
// ============================================================
// FICHIER EXEMPLE — COPIER EN googleSheets.js ET REMPLIR
// ============================================================
// ⚠️  googleSheets.js est dans .gitignore et ne doit JAMAIS
//     être commité. Ce fichier .example sert de modèle.
// ============================================================

export const GOOGLE_CONFIG = {
  API_KEY: 'VOTRE_CLE_API_GOOGLE',
  CLIENT_ID: 'VOTRE_CLIENT_ID.apps.googleusercontent.com',
  SPREADSHEET_ID: 'ID_DE_VOTRE_SPREADSHEET',

  SHEETS: {
    RESERVATIONS: 'Réservations',
    SALLES: 'Salles',
    CONFIG: 'Configuration',
    RESERVATIONS_IA: 'Reservations_IA'
  },

  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
};

export const EMAIL_CONFIG = {
  SERVICE_ID: 'VOTRE_EMAILJS_SERVICE_ID',
  TEMPLATE_ID_CONFIRMATION: 'VOTRE_TEMPLATE_CONFIRMATION',
  TEMPLATE_ID_ANNULATION: 'VOTRE_TEMPLATE_ANNULATION',
  TEMPLATE_ID_ANNULATION_CLIO: 'VOTRE_TEMPLATE_ANNULATION_CLIO',
  TEMPLATE_ID_ANNULATION_IA: 'VOTRE_TEMPLATE_ANNULATION_IA',
  USER_ID: 'VOTRE_EMAILJS_USER_ID'
};

export const APP_CONFIG = {
  ADMIN_PASSWORD: 'MOT_DE_PASSE_ADMIN_SALLES',
  ADMIN_AUTO_PASSWORD: 'MOT_DE_PASSE_ADMIN_AUTO',
  IA_ADMIN_PASSWORD: 'MOT_DE_PASSE_ADMIN_IA',
  SUPER_ADMIN_PASSWORD: 'MOT_DE_PASSE_SUPER_ADMIN',
  CACHE_DURATION: 60000,
};

// ============================================================
// Les constantes ci-dessous ne sont pas sensibles
// et peuvent rester dans ce fichier exemple
// ============================================================

export const SALLES = [
  'Salle Conseil', 'Salle Mariages', 'Salle 16e A', 'Salle 16e B',
  'Salle N°1', 'Salle N°2', 'Salle N°3', 'Salle N°4', 'Salle CCAS'
];

export const SERVICES = [
  'Achats Publics', 'Administration Générale', 'Archives', 'Cabinet du Maire', 'CCAS',
  'Centres de Loisirs', 'Commande Publique', 'Direction des Systèmes d\'Information',
  'Direction Générale', 'Direction Ressources Humaines', 'Élus', 'Finances', 'Juridique',
  'Pôle communication Animation Ville', 'Pôle communication Animation Ville / Animation de la ville',
  'Pôle communication Animation Ville / Communication', 'Pôle communication Animation Ville / Reprographie',
  'Pôle Culture', 'Pôle Culture / Café', 'Pôle Culture / Camus', 'Pôle Culture / Cobalt',
  'Pôle Culture / Conservatoire', 'Pôle Culture / Diffusion', 'Pôle Famille',
  'Pôle Famille / Education', 'Pôle Famille / Enfance', 'Pôle Famille / Hygiène et Restauration',
  'Pôle Famille / Petite Enfance', 'Pôle Loisirs', 'Pôle Loisirs / Animation Sénior',
  'Pôle Loisirs / BIJ', 'Pôle Loisirs / Ecole des sports', 'Pôle Loisirs / Mille Club',
  'Pôle Loisirs / Sports', 'Pôle Loisirs / Tridim', 'Pôle Loisirs / Vie Associative',
  'Pôle Solidarité', 'Pôle Solidarité / Relais Marianne', 'Police Municipale',
  'Régies', 'Syndicats', 'Technique', 'Technique / Pôle Aménagement Et Environnement',
  'Technique / Pôle Patrimoine', 'Technique / Serres'
];

export const OBJETS_RESERVATION = [
  'Entretien RH', 'Événement municipal / public', 'Formation interne',
  'Formation externe (prestataires)', 'Mariage', 'Parrainage',
  'Permanence (élus ou services)', 'Réunion de service',
  'Réunion Élus / Commissions', 'Réunion avec prestataire',
  'Usage logistique / technique', 'Autre'
];

export const OBJETS_VEHICULE = [
  'Déplacement dans Maurepas',
  'Déplacement hors de Maurepas',
];

export const COULEURS_OBJETS = {
  'Réunion de service': '#64B5F6',
  'Réunion Élus / Commissions': '#F06292',
  'Réunion avec prestataire': '#0D47A1',
  'Formation interne': '#81C784',
  'Formation externe (prestataires)': '#1B5E20',
  'Événement municipal / public': '#FFA726',
  'Entretien RH': '#FF7043',
  'Permanence (élus ou services)': '#880E4F',
  'Usage logistique / technique': '#AB47BC',
  'Autre': '#BDBDBD',
  'Déplacement dans Maurepas': '#F06292',
  'Déplacement hors de Maurepas': '#7986CB'
};

export const HORAIRES = {
  HEURE_DEBUT: 8,
  HEURE_FIN: 22,
  JOURS_OUVRES: [1, 2, 3, 4, 5, 6],
  DUREE_CRENEAU: 0.5
};

export const JOURS_FERIES = [
  // 2024
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11', '2024-12-25',
  // 2025
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
  '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14',
  '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
  // 2027
  '2027-01-01', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-08',
  '2027-05-17', '2027-07-14', '2027-08-15', '2027-11-01', '2027-11-11', '2027-12-25',
  // 2028
  '2028-01-01', '2028-04-17', '2028-05-01', '2028-05-08', '2028-05-25',
  '2028-06-05', '2028-07-14', '2028-08-15', '2028-11-01', '2028-11-11', '2028-12-25',
  // 2029
  '2029-01-01', '2029-04-02', '2029-05-01', '2029-05-08', '2029-05-10',
  '2029-05-21', '2029-07-14', '2029-08-15', '2029-11-01', '2029-11-11', '2029-12-25',
  // 2030
  '2030-01-01', '2030-04-22', '2030-05-01', '2030-05-08', '2030-05-30',
  '2030-06-10', '2030-07-14', '2030-08-15', '2030-11-01', '2030-11-11', '2030-12-25',
  // 2031
  '2031-01-01', '2031-04-14', '2031-05-01', '2031-05-08', '2031-05-22',
  '2031-06-02', '2031-07-14', '2031-08-15', '2031-11-01', '2031-11-11', '2031-12-25',
  // 2032
  '2032-01-01', '2032-03-29', '2032-05-01', '2032-05-06', '2032-05-08',
  '2032-05-17', '2032-07-14', '2032-08-15', '2032-11-01', '2032-11-11', '2032-12-25',
  // 2033
  '2033-01-01', '2033-04-18', '2033-05-01', '2033-05-08', '2033-05-26',
  '2033-06-06', '2033-07-14', '2033-08-15', '2033-11-01', '2033-11-11', '2033-12-25',
  // 2034
  '2034-01-01', '2034-04-10', '2034-05-01', '2034-05-08', '2034-05-18',
  '2034-05-29', '2034-07-14', '2034-08-15', '2034-11-01', '2034-11-11', '2034-12-25',
  // 2035
  '2035-01-01', '2035-03-26', '2035-05-01', '2035-05-03', '2035-05-08',
  '2035-05-14', '2035-07-14', '2035-08-15', '2035-11-01', '2035-11-11', '2035-12-25',
];

export const ADMINISTRATEURS = [
  'j.matrat@maurepas.fr', 'admin@maurepas.fr', 'sevindi.munure@gmail.com',
  'cabinet@maurepas.fr', 'mchaumeron@gmail.com', 'test.maurepas@maurepas.fr',
];

export const SALLES_ADMIN_ONLY = ['Salle Conseil', 'Salle Mariages'];

export const MOTIFS_ANNULATION = [
  'Changement de date', 'Changement de salle', 'Réunion annulée',
  'Conflit d\'agenda', 'Absence de participants', 'Report à une date ultérieure',
  'Problème technique', 'Événement annulé', 'Erreur de réservation', 'Autre raison'
];
