// src/config/googleSheets.js
// Configuration pour l'API Google Sheets
// VERSION OPTIMISÉE - Centralisation Sécurité
//TEMPLATE_ID_CONFIRMATION: 'template_awkvaoh', // Votre template de confirmation

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
  // ⚠️ Identifiants EmailJS
  SERVICE_ID: 'service_xoen8ug',            // Commun aux deux envois
  TEMPLATE_ID_ANNULATION: 'template_i9aqlt9',   // Votre template d'annulation
  USER_ID: 'QFnQAOzHCSEtZoeVe'      // Mettez ici votre "Public Key"
};

// CONFIGURATION APPLICATIVE
export const APP_CONFIG = {
  ADMIN_PASSWORD: 'R3sa@M0rep@s78', // Mot de passe centralisé
  CACHE_DURATION: 60000, // Durée du cache en ms (1 minute) pour éviter surcharge API
};

// Liste des salles de la mairie (9 salles)
export const SALLES = [
  'Salle Conseil',
  'Salle Mariages',
  'Salle 16e A',
  'Salle 16e B',
  'Salle N°1',
  'Salle N°2',
  'Salle N°3',
  'Salle N°4',
  'Salle CCAS'
];

// Liste des services
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
  'Réunion de service', 'Réunion Élus / Commissions', 'Réunion avec prestataire',
  'Formation interne', 'Formation externe (prestataires)', 'Événement municipal / public',
  'Entretien RH', 'Usage logistique / technique', 'Permanence (élus ou services)', 'Autre'
];

export const OBJETS_VEHICULE = [
  'Astreinte', 
  'Déplacement Professionnel',
  'Formation',
  'Hors département',
  'Mission Technique',
  'Réunion Extérieure',
  'Transport de Matériel',
  'Usage logistique / technique',
  'Autre'
];

// ✅ MISE À JOUR : Ajout des couleurs pour les objets Véhicule
export const COULEURS_OBJETS = {
  // Objets Salles
  'Réunion de service': '#64B5F6', // Bleu clair
  'Réunion Élus / Commissions': '#F06292', // Rose
  'Réunion avec prestataire': '#0D47A1', // Bleu foncé
  'Formation interne': '#81C784', // Vert clair
  'Formation externe (prestataires)': '#1B5E20', // Vert foncé
  'Événement municipal / public': '#FFA726', // Orange
  'Entretien RH': '#FF7043', // Corail
  'Permanence (élus ou services)': '#880E4F', // Bordeaux
  
  // Objets Véhicule (Nouveaux)
  'Astreinte': '#E57373', // Rouge clair
  'Déplacement Professionnel': '#BA68C8', // Violet
  'Formation': '#81C784', // Vert (Cohérent avec salles)
  'Hors département': '#F06292', // Rose soutenu
  'Mission Technique': '#4DB6AC', // Sarcelle (Teal)
  'Réunion Extérieure': '#7986CB', // Indigo clair
  'Transport de Matériel': '#A1887F', // Marron clair
  
  // Communs
  'Usage logistique / technique': '#AB47BC', // Violet/Mauve
  'Autre': '#BDBDBD' // Gris
};

export const HORAIRES = {
  HEURE_DEBUT: 8,
  HEURE_FIN: 22,
  JOURS_OUVRES: [1, 2, 3, 4, 5, 6],
  DUREE_CRENEAU: 0.5
};

export const JOURS_FERIES = [
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11', '2024-12-25',
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
  '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25',
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14',
  '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25'
];

export const ADMINISTRATEURS = [
  'j.matrat@maurepas.fr', 'admin@maurepas.fr', 'sevindi.munure@gmail.com',
  'cabinet@maurepas.fr', 'mchaumeron@gmail.com'
];

export const SALLES_ADMIN_ONLY = ['Salle Conseil', 'Salle Mariages'];

export const MOTIFS_ANNULATION = [
  'Changement de date', 'Changement de salle', 'Réunion annulée',
  'Conflit d\'agenda', 'Absence de participants', 'Report à une date ultérieure',
  'Problème technique', 'Événement annulé', 'Erreur de réservation', 'Autre raison'
];