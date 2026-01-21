// src/components/AdminIA.js
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import { IA_TOOLS } from '../data/iaData'; // Import des données IA pour fallback nom
import { APP_CONFIG } from '../config/googleSheets'; // Import de la config mot de passe
import './Statistics.css';

// --- SOUS-COMPOSANT PIECHART ---
const PieChart = ({ data, title, colors, sortOrder = 'alpha', className = '', onHover, activeLabel }) => {
  let entries = Object.entries(data);
  const momentOrder = ['Matin', 'Après-midi'];

  if (sortOrder === 'alpha') entries.sort(([a], [b]) => a.localeCompare(b));
  else if (sortOrder === 'asc') entries.sort(([, a], [, b]) => a - b);
  else if (sortOrder === 'desc') entries.sort(([, a], [, b]) => b - a);
  else if (sortOrder === 'moments') entries.sort(([a], [b]) => momentOrder.indexOf(a) - momentOrder.indexOf(b));

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
      label, value: Math.round(value), percentage: percentage.toFixed(1), color,
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
              <span className="legend-value">{segment.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---
function AdminIA() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // GESTION DU MOT DE PASSE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Filtres
  const [filterIA, setFilterIA] = useState('Toutes');
  const [filterService, setFilterService] = useState('Tous');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Tri
  const [sortConfig, setSortConfig] = useState({ key: 'dateDebut', direction: 'desc' });

  // Graphiques
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // On ne charge les données que si authentifié
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const data = await googleSheetsService.getAllIAReservations();
        setReservations(data);
      } catch (error) {
        console.error("Erreur chargement IA:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === APP_CONFIG.IA_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Mot de passe incorrect');
    }
  };

  // Helper pour récupérer le nom de l'IA
  const getIAName = (res) => {
    if (res.salle && res.salle.trim() !== '') return res.salle;
    const tool = IA_TOOLS.find(t => t.id === res.toolId);
    return tool ? tool.nom : 'Inconnue';
  };

  // --- STATISTIQUES ---
  const stats = useMemo(() => {
    if (!reservations || reservations.length === 0) return null;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const reservationsAVenir = reservations.filter(res => { const d = new Date(res.dateDebut); return !Number.isNaN(d.getTime()) && d >= todayStart; }).length;

    // Par Jour
    const parJour = { 'Lundi': 0, 'Mardi': 0, 'Mercredi': 0, 'Jeudi': 0, 'Vendredi': 0, 'Samedi': 0, 'Dimanche': 0 };
    const joursNoms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    reservations.forEach(res => { const date = new Date(res.dateDebut); if (!isNaN(date)) parJour[joursNoms[date.getDay()]]++; });

    // Top Utilisateurs (TOP 15)
    const parUtilisateur = {}; reservations.forEach(res => { const key = `${res.prenom} ${res.nom}`.trim(); parUtilisateur[key] = (parUtilisateur[key] || 0) + 1; });
    const topUtilisateurs = Object.entries(parUtilisateur).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // Par IA
    const parIA = {}; 
    reservations.forEach(res => { 
      const iaName = getIAName(res);
      parIA[iaName] = (parIA[iaName] || 0) + 1; 
    });

    // Par Service
    const formatServiceNomCourt = (service) => { const s = (service || '').trim(); if (!s) return 'Non spécifié'; if (!s.includes('/')) return s; const parts = s.split('/'); const shortName = (parts[parts.length - 1] || '').trim(); return shortName || s; };
    const parService = {}; reservations.forEach(res => { const serviceKey = formatServiceNomCourt(res.service); parService[serviceKey] = (parService[serviceKey] || 0) + 1; });

    // Moments (Matin / Après-midi)
    const parMomentJournee = { 'Matin': 0, 'Après-midi': 0 };
    reservations.forEach(res => {
        if (res.heureDebut && res.heureDebut.startsWith('08')) {
            parMomentJournee['Matin']++;
        } else {
            parMomentJournee['Après-midi']++;
        }
    });

    // Durée Moyenne
    let totalMinutes = 0;
    reservations.forEach(res => { 
        if (res.heureDebut && res.heureDebut.startsWith('08')) totalMinutes += 270; 
        else totalMinutes += 300; 
    });
    const avg = reservations.length > 0 ? totalMinutes / reservations.length : 0;
    const dureeMoyenne = `${Math.floor(avg / 60)}h${Math.round(avg % 60).toString().padStart(2, '0')}m`;

    // Nombre de jours d'activité unique
    const uniqueDays = new Set(reservations.map(res => res.dateDebut)).size;

    return { total: reservations.length, futureTotal: reservationsAVenir, parJour, topUtilisateurs, parIA, parService, parMomentJournee, dureeMoyenne, uniqueDays };
  }, [reservations]);

  // --- FILTRAGE & TRI ---
  const filteredAndSortedReservations = useMemo(() => {
    let result = reservations.filter(res => {
      const iaName = getIAName(res);
      if (filterDateStart && new Date(res.dateDebut) < new Date(filterDateStart)) return false;
      if (filterDateEnd && new Date(res.dateDebut) > new Date(filterDateEnd)) return false;
      if (filterIA !== 'Toutes' && iaName !== filterIA) return false;
      if (filterService !== 'Tous' && !res.service?.includes(filterService)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          res.nom?.toLowerCase().includes(term) ||
          res.prenom?.toLowerCase().includes(term) ||
          res.email?.toLowerCase().includes(term)
        );
      }
      return true;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'dateDebut') {
          aValue = new Date(a.dateDebut).getTime();
          bValue = new Date(b.dateDebut).getTime();
        } else if (sortConfig.key === 'heureDebut') {
          aValue = a.heureDebut; 
          bValue = b.heureDebut;
        } else if (sortConfig.key === 'salle') {
          aValue = getIAName(a);
          bValue = getIAName(b);
        } else if (sortConfig.key === 'utilisateur') {
          aValue = `${a.prenom} ${a.nom}`.toLowerCase();
          bValue = `${b.prenom} ${b.nom}`.toLowerCase();
        } else {
          aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
          bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [reservations, filterIA, filterService, filterDateStart, filterDateEnd, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return '↕';
    return sortConfig.direction === 'asc' ? '🔼' : '🔽';
  };

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

  // MODAL DE CONNEXION SI NON AUTHENTIFIÉ
  if (!isAuthenticated) {
    return (
      <div className="statistics-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: '#0f6aba', marginTop: 0, marginBottom: '1.5rem' }}>🔒 Administration IA</h3>
          <form onSubmit={handlePasswordSubmit}>
            <input 
              type="password" 
              placeholder="Mot de passe" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
              autoFocus
            />
            {authError && <p style={{ color: '#ef5350', fontSize: '0.9rem', marginBottom: '1rem' }}>{authError}</p>}
            <button type="submit" style={{ width: '100%', background: '#0f6aba', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              Valider
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="statistics-container"><p className="no-data">Chargement des statistiques IA...</p></div>;
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

  const servicesUniques = [...new Set(reservations.map(r => {
      const s = r.service || ''; 
      return s.includes('/') ? s.split('/').pop().trim() : s;
  }).filter(s => s))].sort();

  return (
    <div className="statistics-container" onClick={() => setHoveredSlice(null)}>
      {hoveredSlice && createPortal(popupContent, document.body)}
      
      <h2>📊 Statistiques & Administration IA</h2>

      <div className="stats-summary">
        <div className="summary-card"><div className="summary-icon">🤖</div><div className="summary-content"><div className="summary-value">{stats.futureTotal}</div><div className="summary-label">Réservations IA à venir</div></div></div>
        <div className="summary-card"><div className="summary-icon">⏱️</div><div className="summary-content"><div className="summary-label">Durée moyenne estimée</div><div className="summary-value">{stats.dureeMoyenne}</div></div></div>
        <div className="summary-card"><div className="summary-icon">🏆</div><div className="summary-content"><div className="summary-value">{stats.topUtilisateurs[0]?.[0] || 'N/A'}</div><div className="summary-label">est l'Utilisateur n°1</div></div></div>
        <div className="summary-card"><div className="summary-icon">📅</div><div className="summary-content"><div className="summary-label">Jours d'utilisation</div><div className="summary-value">{stats.uniqueDays}</div></div></div>
      </div>

      {/* GRILLE RECONFIGURÉE */}
      <div className="charts-grid" style={{marginBottom:'3rem'}}>
        <PieChart data={stats.parIA} title="🤖 Répartition par Outil IA" colors={c1} sortOrder="desc" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        <PieChart data={stats.parJour} title="📆 Réservations par jour" colors={c2} sortOrder="jours" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        
        {/* Ligne 2 & 3 : Top 15 à Gauche (Span 2) | Moments et Service à Droite */}
        <div className="chart-card" style={{ gridRow: 'span 2', display:'flex', flexDirection:'column' }}>
          <h3>🏆 Top 15 Utilisateurs IA</h3>
          <div className="top-users-list" style={{flex:1, overflowY:'auto'}}>
            {stats.topUtilisateurs.map(([n, c], i) => (
              <div key={i} className="top-user-item">
                <span className="user-rank">{i + 1}</span>
                <span className="user-name">{n}</span>
                <span className="user-count">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <PieChart data={stats.parMomentJournee} title="🌓 Matin vs Après-midi" colors={c2} sortOrder="moments" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
        <PieChart data={stats.parService} title="🏛️ Réservations par service" colors={c3} sortOrder="alpha" onHover={handleSliceHover} activeLabel={hoveredSlice?.label} />
      </div>

      <div className="admin-list-section" style={{background:'white', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 4px 15px rgba(0,0,0,0.1)'}}>
        {/* ✅ AJOUT DU COMPTEUR ICI */}
        <h3 style={{color:'#0f6aba', marginTop:0, borderBottom:'2px solid #e0e0e0', paddingBottom:'0.5rem'}}>
          📋 Liste des réservations des outils de l'IA ({filteredAndSortedReservations.length})
        </h3>
        
        <div className="admin-filters" style={{display:'flex', flexWrap:'wrap', gap:'1rem', marginBottom:'1.5rem', padding:'1rem', background:'#f8fafc', borderRadius:'8px'}}>
          <div style={{flex:1, minWidth:'200px'}}>
            <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem', color:'#64748b'}}>Recherche :</label>
            <input type="text" placeholder="Nom, Prénom, Email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{width:'100%', padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1'}} />
          </div>
          
          <div>
            <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem', color:'#64748b'}}>Outil IA :</label>
            <select value={filterIA} onChange={e => setFilterIA(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1', minWidth:'150px'}}>
              <option value="Toutes">Toutes les IA</option>
              {IA_TOOLS.map(t => <option key={t.id} value={t.nom}>{t.nom}</option>)}
            </select>
          </div>

          <div>
            <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem', color:'#64748b'}}>Service :</label>
            <select value={filterService} onChange={e => setFilterService(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1', minWidth:'150px'}}>
              <option value="Tous">Tous les services</option>
              {servicesUniques.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem', color:'#64748b'}}>Période :</label>
            <div style={{display:'flex', gap:'5px'}}>
              <input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1'}} />
              <span style={{alignSelf:'center'}}>à</span>
              <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1'}} />
            </div>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
            <thead>
              <tr style={{background:'#0f6aba', color:'white'}}>
                <th onClick={() => requestSort('dateDebut')} style={{padding:'12px', textAlign:'left', borderRadius:'6px 0 0 6px', cursor:'pointer', userSelect:'none'}}>
                  Date {getSortIcon('dateDebut')}
                </th>
                <th onClick={() => requestSort('heureDebut')} style={{padding:'12px', textAlign:'left', cursor:'pointer', userSelect:'none'}}>
                  Créneau {getSortIcon('heureDebut')}
                </th>
                <th onClick={() => requestSort('salle')} style={{padding:'12px', textAlign:'left', cursor:'pointer', userSelect:'none'}}>
                  Outil IA {getSortIcon('salle')}
                </th>
                <th onClick={() => requestSort('utilisateur')} style={{padding:'12px', textAlign:'left', cursor:'pointer', userSelect:'none'}}>
                  Utilisateur {getSortIcon('utilisateur')}
                </th>
                <th onClick={() => requestSort('service')} style={{padding:'12px', textAlign:'left', borderRadius:'0 6px 6px 0', cursor:'pointer', userSelect:'none'}}>
                  Service {getSortIcon('service')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedReservations.map((res, i) => (
                <tr key={i} style={{borderBottom:'1px solid #e2e8f0', background: i % 2 === 0 ? 'white' : '#f8fafc'}}>
                  <td style={{padding:'12px', textAlign:'left'}}>{new Date(res.dateDebut).toLocaleDateString()}</td>
                  <td style={{padding:'12px', textAlign:'left'}}>{res.heureDebut === '08:00' ? 'Matin' : 'Après-midi'}</td>
                  <td style={{padding:'12px', textAlign:'left', fontWeight:'600', color:'#0f6aba'}}>{getIAName(res)}</td>
                  <td style={{padding:'12px', textAlign:'left'}}>
                    <div style={{fontWeight:'bold'}}>{res.prenom} {res.nom}</div>
                    <div style={{fontSize:'0.8rem', color:'#64748b'}}>{res.email}</div>
                  </td>
                  <td style={{padding:'12px', textAlign:'left'}}>{res.service}</td>
                </tr>
              ))}
              {filteredAndSortedReservations.length === 0 && (
                <tr>
                  <td colSpan="5" style={{padding:'2rem', textAlign:'center', color:'#64748b'}}>Aucune réservation trouvée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:'1rem', fontSize:'0.85rem', color:'#64748b', textAlign:'right'}}>
          Total affiché : {filteredAndSortedReservations.length} réservation(s)
        </div>
      </div>
    </div>
  );
}

export default AdminIA;