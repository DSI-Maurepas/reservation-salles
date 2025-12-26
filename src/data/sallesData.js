// src/data/sallesData.js
// Données détaillées pour chaque salle

export const SALLES_DATA = {
  'Salle Conseil - 80 Personnes': {
    nom: 'Salle Conseil',
    capacite: 80,
    photo: '/images/Salle_Conseil.jpg', // À remplacer
    equipements: ['Vidéoprojecteur', 'Écran', 'WiFi','Sono'],
    dispositions: ['Table en U', 'Table en carré', 'Conférence', 'Libre']
  },
  'Salle Mariages - 40 Personnes': {
    nom: 'Salle Mariages',
    capacite: 40,
    photo: '/images/Salle_Mariages.jpg', // À remplacer
    equipements: ['Écran', 'WiFi',],
    dispositions: ['Table en U', 'Table en carré', 'Conférence', 'Libre']
  },
  'Salle 16e A - 20 Personnes': {
    nom: 'Salle 16e A',
    capacite: 20,
    photo: '/images/16e_A.jpg', // ✅ VRAIE PHOTO
    equipements: ['Vidéoprojecteur', 'Écran', 'WiFi', 'Tableau blanc', 'Paperboard'],
    dispositions: null // Pas de dispositions
  },
  'Salle 16e B - 19 Personnes': {
    nom: 'Salle 16e B',
    capacite: 19,
    photo: '/images/16e_B.jpg', // ✅ VRAIE PHOTO
    equipements: ['Écran', 'WiFi', 'Tableau blanc'],
    dispositions: null // Pas de dispositions
  },
  'Salle N°1 - 2 Personnes': {
    nom: 'Salle N°1',
    capacite: 2,
    photo: '/images/Salle_1.jpg', // À remplacer
    equipements: ['WiFi'],
    dispositions: null
  },
  'Salle N°2 - 12 Personnes': {
    nom: 'Salle N°2',
    capacite: 12,
    photo: '/images/Salle_2.jpg', // À remplacer
    equipements: ['Écran', 'WiFi',],
    dispositions: null
  },
  'Salle N°3 - 8 Personnes': {
    nom: 'Salle N°3',
    capacite: 8,
    photo: '/images/Salle_3.jpg', // À remplacer
    equipements: ['Écran', 'WiFi'],
    dispositions: null
  },
  'Salle N°4 - 4 Personnes': {
    nom: 'Salle N°4',
    capacite: 4,
    photo: '/images/Salle_4.jpg', // À remplacer
    equipements: ['WiFi'],
    dispositions: null
  },
  'Salle CCAS - 10 Personnes': {
    nom: 'Salle CCAS',
    capacite: 10,
    photo: '/images/Salle_CCAS.jpg', // À remplacer
    equipements: ['Vidéoprojecteur', 'WiFi'],
    dispositions: null
  }
};

// Fonction helper pour obtenir les données d'une salle
export const getSalleData = (salleNom) => {
  return SALLES_DATA[salleNom] || null;
};
