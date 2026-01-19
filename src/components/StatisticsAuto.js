// src/components/StatisticsAuto.js
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSalleData } from '../data/sallesData';
import './Statistics.css'; // On réutilise le CSS existant

// --- SOUS-COMPOSANT PIECHART (Identique à Statistics.js) ---
const PieChart = ({ data, title, colors, sortOrder = 'alpha', className = '', onHover, activeLabel }) => {
  let entries = Object.entries(data);
  const jourOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const moisOrder = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  if (sortOrder === 'alpha') entries.sort(([a], [b]) => a.localeCompare(b));
  else if (sortOrder === 'asc') entries.sort(([, a], [, b]) => a - b);
  else if (sortOrder === 'desc') entries.sort(([, a], [, b]) => b - a);
  else if (sortOrder === 'jours') entries.sort(([a], [b]) => jourOrder.indexOf(a) - jourOrder.indexOf(b));
  else if (sortOrder === 'mois') entries.sort(([a], [b]) => moisOrder.indexOf(a) - moisOrder.indexOf(b));

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) return null;

  let currentAngle = 0;
  const segments = entries.map(([label, value], index) => {
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;

    const r = 40; const cx = 50; const cy = 50;
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const midRad = (midAngle - 90) * Math.PI / 180;
    const startX = cx + r * Math.cos(startRad);
    const startY = cy + r * Math.sin(startRad);
    const endX = cx + r * Math.cos(endRad);
    const endY = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    const isActive = activeLabel === label;
    const explodeDist = isActive ? 4 : 0;
    const transX = explodeDist * Math.cos(midRad);
    const transY = explodeDist * Math.sin(midRad);
    const color = colors[index % colors.length];

    const handleInteraction = (e) => {
      if (e.type === 'click') e.stopPropagation();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      onHover({ label, value, percentage: percentage.toFixed(1), color, x: clientX, y: clientY });
    };

    return {
      label, value, percentage: percentage.toFixed(1), color,
      path: `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`,
      transform: `translate(${transX}, ${transY})`,
      handleInteraction, isActive
    };
  });

  return (
    <div className={`chart-card ${className}`}>
      <h3>{title}</h3>
      <div className="chart-content">
        <svg viewBox="0 0 100 100" className="pie-chart">
          {segments.map((segment, i) => (
            <path key={i} d={segment.path} fill={segment.color} stroke="white" strokeWidth="0.5" transform={segment.transform} onClick={segment.handleInteraction} onMouseEnter={segment.handleInteraction} style={{ cursor: 'pointer', transition: 'transform 0.3s ease-out' }} />
          ))}
        </svg>
        <div className="chart-legend">
          {segments.map((segment, i) => (
            <div key={i} className={`legend-item ${segment.isActive ? 'active' : ''}`} onClick={segment.handleInteraction} style={{ cursor: 'pointer' }}>
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

function StatisticsAuto({ reservations }) {
  const stats = useMemo(() => {
    if (!reservations || reservations.length === 0) return null;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const reservationsAVenir = reservations.filter(res => { const d = new Date(res.dateDebut); return !Number.isNaN(d.getTime()) && d >= todayStart; }).length;

    // Par Jour
    const parJour = { 'Lundi': 0, 'Mardi': 0, 'Mercredi': 0, 'Jeudi': 0, 'Vendredi': 0, 'Samedi': 0, 'Dimanche': 0 };
    const joursNoms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    reservations.forEach(res => { const date = new Date(res.dateDebut); if (!isNaN(date)) parJour[joursNoms[date.getDay()]]++; });

    // Top Utilisateurs - ✅ MODIFIÉ : Slice 0 à 6
    const parUtilisateur = {}; reservations.forEach(res => { const key = `${res.prenom} ${res.nom}`.trim(); parUtilisateur[key] = (parUtilisateur[key] || 0) + 1; });
    const topUtilisateurs = Object.entries(parUtilisateur).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Par Objet
    const parObjet = {}; reservations.forEach(res => { const objet = res.objet || 'Non spécifié'; parObjet[objet] = (parObjet[objet] || 0) + 1; });

    // Par Service
    const formatServiceNomCourt = (service) => { const s = (service || '').trim(); if (!s) return 'Non spécifié'; if (!s.includes('/')) return s; const parts = s.split('/'); const shortName = (parts[parts.length - 1] || '').trim(); return shortName || s; };
    const parService = {}; reservations.forEach(res => { const serviceKey = formatServiceNomCourt(res.service); parService[serviceKey] = (parService[serviceKey] || 0) + 1; });

    // Par Mois (Filtré : 2 derniers mois et 2 à venir)
    const parMois = {};
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    // Calcul de la fenêtre de date
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1); // 2 mois avant
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0); // 2 mois après (fin de mois)

    reservations.forEach(res => { 
      const date = new Date(res.dateDebut); 
      if (!isNaN(date) && date >= startDate && date <= endDate) {
        parMois[moisNoms[date.getMonth()]] = (parMois[moisNoms[date.getMonth()]] || 0) + 1;
      }
    });

    // Par Horaire (Sera affiché en premier)
    const parHoraire = { '08h-10h': 0, '10h-12h': 0, '12h-14h': 0, '14h-16h': 0, '16h-18h': 0, '18h-19h': 0 };
    reservations.forEach(res => { const h = parseInt(res.heureDebut.split(':')[0]); if (h >= 8 && h < 10) parHoraire['08h-10h']++; else if (h >= 10 && h < 12) parHoraire['10h-12h']++; else if (h >= 12 && h < 14) parHoraire['12h-14h']++; else if (h >= 14 && h < 16) parHoraire['14h-16h']++; else if (h >= 16 && h < 18) parHoraire['16h-18h']++; else if (h >= 18) parHoraire['18h-19h']++; });

    // Calculs de durée et occupation
    let totalMinutes = 0, countRes = 0; const salleStats = {};
    reservations.forEach(res => { if (!res.heureDebut || !res.heureFin) return; const [hS, mS] = res.heureDebut.split(':').map(Number); const [hE, mE] = res.heureFin.split(':').map(Number); const dur = (hE * 60 + mE) - (hS * 60 + mS); if (dur > 0) { totalMinutes += dur; countRes++; const salleKey = res.salle || 'Non spécifié'; if (!salleStats[salleKey]) salleStats[salleKey] = { totalMinutes: 0, count: 0 }; salleStats[salleKey].totalMinutes += dur; salleStats[salleKey].count += 1; } });

    let dureeMoyenne = "0h00m";
    if (countRes > 0) { let weightedSum = 0; let weightTotal = 0; Object.entries(salleStats).forEach(([salle, { totalMinutes: sTotal, count }]) => { const moyenneSalle = sTotal / count; const capacite = getSalleData(salle)?.capacite || 0; if (capacite > 0) { weightedSum += moyenneSalle * capacite; weightTotal += capacite; } }); const avg = (weightTotal > 0) ? (weightedSum / weightTotal) : (totalMinutes / countRes); dureeMoyenne = `${Math.floor(avg / 60)}h${Math.round(avg % 60).toString().padStart(2, '0')}m`; }

    const tauxOccupation = {}; const durationByRoom = {}; let minTime = Infinity, maxTime = -Infinity;
    reservations.forEach(res => { if (!res.heureDebut || !res.heureFin) return; const [hS, mS] = res.heureDebut.split(':').map(Number); const [hE, mE] = res.heureFin.split(':').map(Number); durationByRoom[res.salle] = (durationByRoom[res.salle] || 0) + Math.max(0, ((hE * 60 + mE) - (hS * 60 + mS)) / 60); const t = new Date(res.dateDebut).getTime(); if (t < minTime) minTime = t; if (t > maxTime) maxTime = t; });
    const weeks = Math.max(1, (maxTime !== -Infinity ? Math.floor((maxTime - minTime) / (24 * 60 * 60 * 1000)) + 1 : 1) / 7); Object.keys(durationByRoom).forEach(s => tauxOccupation[s] = Math.min(100, Math.round((durationByRoom[s] / (weeks * 55)) * 100)));

    return { total: reservations.length, futureTotal: reservationsAVenir, parJour, topUtilisateurs, parObjet, parService, parMois, parHoraire, dureeMoyenne, tauxOccupation };
  }, [reservations]);

  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  const handleSliceHover = (data) => {
    setHoveredSlice(data);
    setPopupPos({ x: data.x, y: data.y - 130 });
    setIsFading(false);
  };

  useEffect(() => {
    let fadeTimer, removeTimer;
    if (hoveredSlice) {
      fadeTimer = setTimeout(() => { setIsFading(true); removeTimer = setTimeout(() => { setHoveredSlice(null); setIsFading(false); }, 400); }, 3000);
    }
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [hoveredSlice]);

  if (!stats) return <div className="statistics-container"><p className="no-data">Aucune donnée.</p></div>;
  const c1 = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#cddc39', '#795548', '#607d8b'];
  const c2 = ['#3f51b5', '#009688', '#ffc107', '#f44336', '#673ab7', '#03a9f4', '#8bc34a', '#ff5722', '#9e9e9e'];
  const c3 = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#afb42b', '#5d4037', '#455a64'];

  const popupContent = hoveredSlice ? (
    <div className={`stats-popup ${isFading ? 'fading-out' : ''}`} style={{ top: popupPos.y, left: popupPos.x }}>
      <div className="stats-popup-header" style={{ borderLeft: `5px solid ${hoveredSlice.color}` }}>{hoveredSlice.label}</div>
      <div className="stats-popup-body"><div><strong>Nombre :</strong> {hoveredSlice.value}</div><div><strong>Part :</strong> {hoveredSlice.percentage}%</div></div>
    </div>
  ) : null;

  return (
    <div className="statistics-container" onClick={() => setHoveredSlice(null)}>
      {hoveredSlice && createPortal(popupContent, document.body)}
      
      <h2>📊 Statistiques CLIO</h2>

      <div className="stats-summary">
        <div className="summary-card"><div className="summary-icon">📅</div><div className="summary-content"><div className="summary-value">{stats.futureTotal}</div><div className="summary-label">Réservations à venir de la Clio</div></div></div>
        <div className="summary-card"><div className="summary-icon">⏱️</div><div className="summary-content"><div className="summary-value">{stats.dureeMoyenne}</div><div className="summary-label">Durée moyenne d'une réservation</div></div></div>
        <div className="summary-card"><div className="summary-icon">🏆</div><div className="summary-content"><div className="summary-value">{stats.topUtilisateurs[0]?.[0] || 'N/A'}</div><div className="summary-label">Top pilote !</div></div></div>
        <div className="summary-card"><div className="summary-icon">📉</div><div className="summary-content"><div className="summary-value">{stats.tauxOccupation['CLIO'] ? stats.tauxOccupation['CLIO'] + '%' : '0%'}</div><div className="summary-label">Taux de réservation de la Clio</div></div></div>
      </div>

      <div className="charts-grid">
        <PieChart data={stats.parHoraire} title="🕐 Réservation par horaire" colors={c2} onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        
        <PieChart data={stats.parJour} title="📆 Réservation par jour" colors={c2} sortOrder="jours" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        <PieChart data={stats.parService} title="🏛️ Réservation par service" colors={c3} sortOrder="alpha" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        <PieChart data={stats.parObjet} title="📝 Réservation par motif" colors={c1} sortOrder="alpha" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        
        {/* ✅ SUPPRESSION du bloc Chart 'Taux d'occupation' détaillé ICI */}

        <PieChart data={stats.parMois} title="📅 Les 2 derniers mois et les 2 à venir" colors={c3} sortOrder="mois" className="month-chart-card" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        
        <div className="chart-card">
          <h3>🚗 Top 6 Pilote !</h3> {/* ✅ TITRE MODIFIÉ */}
          <div className="top-users-list">{stats.topUtilisateurs.map(([n, c], i) => (<div key={i} className="top-user-item"><span className="user-rank">{i + 1}</span><span className="user-name">{n}</span><span className="user-count">{c}</span></div>))}</div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsAuto;