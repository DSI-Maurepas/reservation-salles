// src/data/sallesData.js
// Données détaillées pour chaque salle

export const SALLES_DATA = {
  'Salle Conseil - 100 Personnes': {
    nom: 'Salle Conseil',
    capacite: 100,
    photo: process.env.PUBLIC_URL + '/images/Salle_Conseil.jpg',
    equipements: ['Vidéoprojecteur', 'Écran projection', 'Micros/Amplificateur sonore', 'Tables', 'Chaises', 'Prises électriques', 'WiFi public', 'WiFi mairie'],
    dispositions: ['Table en U', 'Table en carré', 'Conférence', 'Libre']
  },
  'Salle Mariages - 30 Personnes': {
    nom: 'Salle Mariages',
    capacite: 30,
    photo: process.env.PUBLIC_URL + '/images/Salle_Mariages.jpg',
    equipements: ['2 Écrans numériques', 'Tables', 'Chaises', 'WiFi public', 'WiFi mairie'],
    dispositions: ['Table en U', 'Table en carré', 'Conférence', 'Libre']
  },
  'Salle 16e A - 20 Personnes': {
    nom: 'Salle 16e A',
    capacite: 20,
    photo: process.env.PUBLIC_URL + '/images/16e_A.jpg',
    equipements: ['Vidéoprojecteur', 'Écran', 'WiFi', 'Tableau blanc'],
    dispositions: null
  },
  'Salle 16e B - 19 Personnes': {
    nom: 'Salle 16e B',
    capacite: 19,
    photo: process.env.PUBLIC_URL + '/images/16e_B.jpg',
    equipements: ['Écran', 'WiFi', 'Tableau blanc'],
    dispositions: null
  },
  'Salle N°1 - 2 Personnes': {
    nom: 'Salle N°1',
    capacite: 2,
    photo: process.env.PUBLIC_URL + '/images/Salle_1.jpg',
    equipements: ['2 Tables', '4 Chaises', '1 Téléphone', '3 Prises électriques', 'WiFi public', 'WiFi mairie'],
    dispositions: null
  },
  'Salle N°2 - 12 Personnes': {
    nom: 'Salle N°2',
    capacite: 12,
    photo: process.env.PUBLIC_URL + '/images/Salle_2.jpg',
    equipements: ['3 Tables', '12 Chaises', '1 Écran', '1 Téléphone', '13 Prises électriques', '9 Prises réseau', 'WiFi public', 'WiFi mairie'],
    dispositions: null
  },
  'Salle N°3 - 8 Personnes': {
    nom: 'Salle N°3',
    capacite: 8,
    photo: process.env.PUBLIC_URL + '/images/Salle_3.jpg',
    equipements: ['2 Tables', '8 Chaises', '1 Téléphone', '8 Prises électriques', '4 Prises réseau', 'WiFi public', 'WiFi mairie'],
    dispositions: null
  },
  'Salle N°4 - 4 Personnes': {
    nom: 'Salle N°4',
    capacite: 4,
    photo: process.env.PUBLIC_URL + '/images/Salle_4.jpg',
    equipements: ['2 Tables', '4 Chaises', '4 Prises électriques', '4 Prises réseau', 'WiFi public', 'WiFi mairie'],
    dispositions: null
  },
  'Salle CCAS - 10 Personnes': {
    nom: 'Salle CCAS',
    capacite: 10,
    photo: process.env.PUBLIC_URL + '/images/Salle_CCAS.jpg',
    equipements: ['Vidéoprojecteur', 'Écran', 'WiFi', 'Tableau blanc'],
    dispositions: null
  }
};

// Fonction helper pour obtenir les données d'une salle
export const getSalleData = (salleNom) => {
  return SALLES_DATA[salleNom] || null;
};
