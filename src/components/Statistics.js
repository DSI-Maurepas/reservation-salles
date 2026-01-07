// src/components/Statistics.js
import React, { useMemo } from 'react';
import './Statistics.css';

function Statistics({ reservations }) {
  
  // Calcul des statistiques
  const stats = useMemo(() => {
    if (!reservations || reservations.length === 0) {
      return null;
    }

    // 1. Répartition par salle
    const parSalle = {};
    reservations.forEach(res => {
      parSalle[res.salle] = (parSalle[res.salle] || 0) + 1;
    });

    // 2. Répartition par jour de la semaine
    const parJour = {
      'Lundi': 0,
      'Mardi': 0,
      'Mercredi': 0,
      'Jeudi': 0,
      'Vendredi': 0,
      'Samedi': 0,
      'Dimanche': 0
    };
    const joursNoms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    reservations.forEach(res => {
      const date = new Date(res.dateDebut);
      const jour = joursNoms[date.getDay()];
      parJour[jour]++;
    });

    // 3. Top 10 utilisateurs
    const parUtilisateur = {};
    reservations.forEach(res => {
      const key = `${res.nom} ${res.prenom}`.trim();
      parUtilisateur[key] = (parUtilisateur[key] || 0) + 1;
    });
    const topUtilisateurs = Object.entries(parUtilisateur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 4. Répartition par objet
    const parObjet = {};
    reservations.forEach(res => {
      const objet = res.objet || 'Non spécifié';
      parObjet[objet] = (parObjet[objet] || 0) + 1;
    });

    // 5. Répartition par service
    const parService = {};
    reservations.forEach(res => {
      parService[res.service] = (parService[res.service] || 0) + 1;
    });

    // 6. Répartition par mois
    const parMois = {
      'Janvier': 0,
      'Février': 0,
      'Mars': 0,
      'Avril': 0,
      'Mai': 0,
      'Juin': 0,
      'Juillet': 0,
      'Août': 0,
      'Septembre': 0,
      'Octobre': 0,
      'Novembre': 0,
      'Décembre': 0
    };
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    reservations.forEach(res => {
      const date = new Date(res.dateDebut);
      const mois = moisNoms[date.getMonth()];
      parMois[mois]++;
    });

    // 7. Répartition par horaire (plages de 2h)
    const parHoraire = {
      '08h-10h': 0,
      '10h-12h': 0,
      '12h-14h': 0,
      '14h-16h': 0,
      '16h-18h': 0,
      '18h-19h': 0
    };
    reservations.forEach(res => {
      const heure = parseInt(res.heureDebut.split(':')[0]);
      if (heure >= 8 && heure < 10) parHoraire['08h-10h']++;
      else if (heure >= 10 && heure < 12) parHoraire['10h-12h']++;
      else if (heure >= 12 && heure < 14) parHoraire['12h-14h']++;
      else if (heure >= 14 && heure < 16) parHoraire['14h-16h']++;
      else if (heure >= 16 && heure < 18) parHoraire['16h-18h']++;
      else if (heure >= 18) parHoraire['18h-19h']++;
    });

    // 7. Durée moyenne des réservations
    let dureeTotale = 0;
    reservations.forEach(res => {
      const debut = parseInt(res.heureDebut.split(':')[0]);
      const fin = parseInt(res.heureFin.split(':')[0]);
      dureeTotale += (fin - debut);
    });
    const dureeMoyenne = (dureeTotale / reservations.length).toFixed(1);

    // 8. Taux d'occupation par salle (estimé sur 11h x 5 jours = 55h/semaine)
    const tauxOccupation = {};
    Object.keys(parSalle).forEach(salle => {
      const nbRes = parSalle[salle];
      const tauxEstime = Math.min(100, Math.round((nbRes / 55) * 100));
      tauxOccupation[salle] = tauxEstime;
    });

    return {
      total: reservations.length,
      parSalle,
      parJour,
      topUtilisateurs,
      parObjet,
      parService,
      parMois,
      parHoraire,
      dureeMoyenne,
      tauxOccupation
    };
  }, [reservations]);

  if (!stats) {
    return (
      <div className="statistics-container">
        <p className="no-data">Aucune donnée disponible pour les statistiques.</p>
      </div>
    );
  }

  // Fonction pour générer un graphique en camembert
  // Modification : Ajout prop 'className'
  const PieChart = ({ data, title, colors, sortOrder = 'alpha', className = '' }) => {
    let entries = Object.entries(data);
    
    // Ordres de référence
    const jourOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const moisOrder = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    // Tri selon le type demandé
    if (sortOrder === 'alpha') {
      entries = entries.sort(([a], [b]) => a.localeCompare(b)); // Alphabétique
    } else if (sortOrder === 'asc') {
      entries = entries.sort(([, a], [, b]) => a - b); // Croissant (nombre)
    } else if (sortOrder === 'desc') {
      entries = entries.sort(([, a], [, b]) => b - a); // Décroissant (nombre)
    } else if (sortOrder === 'jours') {
      // Tri par ordre des jours de la semaine
      entries = entries.sort(([a], [b]) => jourOrder.indexOf(a) - jourOrder.indexOf(b));
    } else if (sortOrder === 'mois') {
      // Tri par ordre des mois de l'année
      entries = entries.sort(([a], [b]) => moisOrder.indexOf(a) - moisOrder.indexOf(b));
    }
    
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    
    if (total === 0) return null;

    let currentAngle = 0;
    const segments = entries.map(([label, value], index) => {
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // Calcul du chemin SVG
      const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
      const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
      const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
      const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
      const largeArc = angle > 180 ? 1 : 0;

      return {
        label,
        value,
        percentage: percentage.toFixed(1),
        path: `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`,
        color: colors[index % colors.length]
      };
    });

    return (
      <div className={`chart-card ${className}`}>
        <h3>{title}</h3>
        <div className="chart-content">
          <svg viewBox="0 0 100 100" className="pie-chart">
            {segments.map((segment, i) => (
              <path
                key={i}
                d={segment.path}
                fill={segment.color}
                stroke="white"
                strokeWidth="0.5"
              >
                <title>{`${segment.label}: ${segment.value} (${segment.percentage}%)`}</title>
              </path>
            ))}
          </svg>
          <div className="chart-legend">
            {segments.map((segment, i) => (
              <div key={i} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: segment.color }}></span>
                <span className="legend-label">{segment.label}</span>
                <span className="legend-value">{segment.value} ({segment.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Palettes de couleurs
  const colors1 = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#cddc39', '#795548', '#607d8b'];
  const colors2 = ['#3f51b5', '#009688', '#ffc107', '#f44336', '#673ab7', '#03a9f4', '#8bc34a', '#ff5722', '#9e9e9e'];
  const colors3 = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#afb42b', '#5d4037', '#455a64'];

  return (
    <div className="statistics-container">
      <h2>📊 Statistiques détaillées</h2>
      
      <div className="stats-summary">
        <div className="summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <div className="summary-value">{stats.total}</div>
            <div className="summary-label">Réservations totales</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <div className="summary-value">{stats.dureeMoyenne}h</div>
            <div className="summary-label">Durée moyenne</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🏆</div>
          <div className="summary-content">
            <div className="summary-value">{stats.topUtilisateurs[0]?.[0] || 'N/A'}</div>
            <div className="summary-label">Top utilisateur</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🏢</div>
          <div className="summary-content">
            <div className="summary-value">{Object.keys(stats.parSalle).length}</div>
            <div className="summary-label">Salles utilisées</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <PieChart 
          data={stats.parSalle} 
          title="📍 Répartition par salle"
          colors={colors1}
        />
        
        <PieChart 
          data={stats.parJour} 
          title="📆 Répartition par jour"
          colors={colors2}
          sortOrder="jours"
        />
        
        <PieChart 
          data={stats.parService} 
          title="🏛️ Répartition par service"
          colors={colors3}
          sortOrder="alpha"
        />
        
        <PieChart 
          data={stats.parObjet} 
          title="📝 Répartition par objet"
          colors={colors1}
          sortOrder="alpha"
        />
        
        <div className="chart-card">
          <h3>📊 Taux d'occupation</h3>
          <div className="occupation-bars">
            {Object.entries(stats.tauxOccupation)
              .sort((a, b) => b[1] - a[1])
              .map(([salle, taux], i) => (
                <div key={i} className="occupation-item">
                  <div className="occupation-label">{salle}</div>
                  <div className="occupation-bar-container">
                    <div 
                      className="occupation-bar" 
                      style={{ 
                        width: `${taux}%`,
                        backgroundColor: taux > 80 ? '#f44336' : taux > 50 ? '#ff9800' : '#4caf50'
                      }}
                    ></div>
                  </div>
                  <div className="occupation-value">{taux}%</div>
                </div>
            ))}
          </div>
        </div>
        
        <PieChart 
          data={stats.parHoraire} 
          title="🕐 Répartition par horaire"
          colors={colors2}
        />
        
        {/* INTERVERSION : MOIS ICI AVEC CLASSE SPÉCIFIQUE */}
        <PieChart 
          data={stats.parMois} 
          title="📅 Répartition par mois"
          colors={colors3}
          sortOrder="mois"
          className="month-chart-card" // AJOUT CLASSE SPÉCIALE
        />
        
        <div className="chart-card">
          <h3>👥 Top 10 utilisateurs</h3>
          <div className="top-users-list">
            {stats.topUtilisateurs.map(([nom, count], i) => (
              <div key={i} className="top-user-item">
                <span className="user-rank">{i + 1}</span>
                <span className="user-name">{nom}</span>
                <span className="user-count">{count} réservations</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;