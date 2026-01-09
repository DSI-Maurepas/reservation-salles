// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, COULEURS_OBJETS } from '../config/googleSheets';
import ColorLegend from './ColorLegend';
import SalleCard from './SalleCard';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, onBack }) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSalle, setHoveredSalle] = useState(null);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isFading, setIsFading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sécurité Admin
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const detailsRef = useRef(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: localStorage.getItem('userEmail') || '',
    telephone: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '',
    agencement: '', nbPersonnes: ''
  });

  // Gestion de la fiche (4s affichage, 0.4s disparition)
  useEffect(() => {
    let fadeTimer, removeTimer;
    if (hoveredReservation) {
      setIsFading(false);
      fadeTimer = setTimeout(() => {
        setIsFading(true);
        removeTimer = setTimeout(() => {
          setHoveredReservation(null);
          setIsFading(false);
        }, 400);
      }, 4000); 
    }
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [hoveredReservation]);

  const changeDate = (days) => {
    const d = new Date(currentDate); d.setDate(d.getDate() + days);
    setCurrentDate(d); setSelections([]);
  };
  const handleToday = () => { setCurrentDate(new Date()); setSelections([]); };

  const handleAdminPasswordSubmit = () => {
    if (adminPasswordModal.password === 'R3sa@M0rep@s78') {
      setIsAdminUnlocked(true);
      setAdminPasswordModal({ show: false, password: '' });
    } else {
      alert('Mot de passe incorrect');
      setAdminPasswordModal({ ...adminPasswordModal, password: '' });
    }
  };

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const all = await googleSheetsService.getAllReservations();
      const dStr = googleSheetsService.formatDate(currentDate);
      const dayRes = all.filter(res => res.statut !== 'cancelled' && (res.dateDebut === dStr || (res.dateDebut <= dStr && res.dateFin >= dStr)));
      setReservations(dayRes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [currentDate]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const handleMouseDown = (salle, hour, e) => {
    const sShort = salle.split(' - ')[0];
    const res = reservations.find(r => r.salle.includes(sShort) && hour >= googleSheetsService.timeToFloat(r.heureDebut) && hour < googleSheetsService.timeToFloat(r.heureFin));
    
    // Fiche de propriété prioritaire même sur salle verrouillée
    if (res) {
      setPopupPosition({ x: e.clientX, y: e.clientY - 50 });
      setHoveredReservation(res);
      return;
    }

    if (SALLES_ADMIN_ONLY.some(a => salle.includes(a)) && !isAdminUnlocked) {
      setAdminPasswordModal({ show: true, password: '' });
      return;
    }

    setIsDragging(true);
    setCurrentSelection({ salle, startHour: hour, endHour: hour + 0.5 });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !currentSelection || currentSelection.salle !== salle) return;
    setCurrentSelection({ ...currentSelection, endHour: hour + 0.5 });
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) setSelections(prev => [...prev, currentSelection]);
    setIsDragging(false);
    setCurrentSelection(null);
  };

  const mergedSelections = ((selections) => {
    const bySalle = {};
    selections.forEach(sel => { if (!bySalle[sel.salle]) bySalle[sel.salle] = []; bySalle[sel.salle].push(sel); });
    const merged = [];
    for (const salle in bySalle) {
      const slots = bySalle[salle].sort((a, b) => a.startHour - b.startHour);
      let i = 0;
      while (i < slots.length) {
        const current = { ...slots[i] };
        while (i + 1 < slots.length && Math.abs(current.endHour - slots[i + 1].startHour) < 0.01) { current.endHour = slots[i + 1].endHour; i++; }
        merged.push(current); i++;
      }
    }
    return merged;
  })(selections);

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner"></div>);

    SALLES.forEach((salle, idx) => {
      const parts = salle.split(' - ');
      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{ gridColumn: idx + 2 }} onClick={() => setHoveredSalle(salle)}>
          <span className="salle-name">{parts[0].replace(/Salle Conseil/gi, 'Conseil').replace(/Salle Mariages/gi, 'Mariages')}</span>
          <span className="salle-capacity">{parts[1] || ''}</span>
        </div>
      );
    });

    for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) {
      const row = (h - HORAIRES.HEURE_DEBUT) / 0.5 + 2;
      const isFullHour = h % 1 === 0;
      const isLastRow = (h === HORAIRES.HEURE_FIN - 0.5);
      if (isFullHour) grid.push(<div key={`t-${h}`} className="time-label" style={{ gridRow: `${row} / span 2` }}>{h}h</div>);

      SALLES.forEach((salle, idx) => {
        const sShort = salle.split(' - ')[0];
        const res = reservations.find(r => r.salle.includes(sShort) && h >= googleSheetsService.timeToFloat(r.heureDebut) && h < googleSheetsService.timeToFloat(r.heureFin));
        const isLocked = SALLES_ADMIN_ONLY.some(a => salle.includes(a)) && !isAdminUnlocked;
        const selected = selections.some(sel => sel.salle === salle && h >= sel.startHour && h < sel.endHour) || (currentSelection && currentSelection.salle === salle && h >= currentSelection.startHour && h < currentSelection.endHour);
        
        let classes = `time-slot ${isFullHour ? 'full-hour-start' : 'half-hour-start'}`;
        if (isLastRow) classes += ' last-row-slot';
        if (res) classes += ' reserved occupied'; // Toujours visible
        if (isLocked && !res) classes += ' admin-only-locked';
        else if (selected) classes += ' selected';
        else if (h >= 12 && h < 14 && !res) classes += ' lunch-break';

        grid.push(
          <div key={`c-${salle}-${h}`} className={classes} style={{ gridColumn: idx + 2, gridRow: row, backgroundColor: res ? (COULEURS_OBJETS[res.objet] || '#ccc') : '' }}
            onMouseDown={(e) => handleMouseDown(salle, h, e)}
            onMouseEnter={() => handleMouseEnter(salle, h)}
          >
            {isLocked && !res && <span className="lock-icon">🔒</span>}
          </div>
        );
      });
    }
    return grid;
  };

  return (
    <div className="reservation-grid-container" onMouseUp={handleMouseUp}>
      <div className="date-navigation-bar">
        <div className="nav-group-left"><button className="back-button-original" onClick={onBack}>◀ Calendrier</button></div>
        <div className="nav-group-center">
          <button className="nav-nav-btn" onClick={() => changeDate(-7)}>⏪</button>
          <button className="nav-nav-btn" onClick={() => changeDate(-1)}>◀</button>
          <div className="central-date-block">
            <button className="nav-today-button" onClick={handleToday}>Aujourd'hui</button>
            <div className="date-display"><h2>{currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
          </div>
          <button className="nav-nav-btn" onClick={() => changeDate(1)}>▶</button>
          <button className="nav-nav-btn" onClick={() => changeDate(7)}>⏩</button>
        </div>
        <div className="nav-group-right"></div>
      </div>

      <div className="reservation-content">
        <div className="grid-column">
          <div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>{renderGrid()}</div>
        </div>
        <div className="form-column" ref={detailsRef}>
          {selections.length > 0 ? (
            <div className="reservation-form">
              <h3>Nouvelle Réservation</h3>
              <p className="selection-count">{selections.length} {selections.length > 1 ? 'nouveaux créneaux' : 'nouveau créneau'}</p>
              <div className="selections-summary">
                {mergedSelections.map((sel, idx) => (
                  <div key={idx} className="selection-item">
                    {sel.salle.split(' - ')[0]} : {googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)}
                    <button className="remove-selection-btn" onClick={() => setSelections(prev => prev.filter(s => !(s.salle === sel.salle && s.startHour >= sel.startHour && s.endHour <= sel.endHour)))}>✕</button>
                  </div>
                ))}
              </div>
              <form onSubmit={e => e.preventDefault()} className="room-form">
                <div className="form-row">
                  <input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required />
                  <input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
                <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required>
                  <option value="">Service...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required>
                  <option value="">Objet...</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div className="recurrence-section-styled">
                  <div className="recurrence-box">
                    <input type="checkbox" id="rec-grid" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} />
                    <label htmlFor="rec-grid">Réservation récurrente</label>
                  </div>
                  {formData.recurrence && (
                    <div className="recurrence-options slide-down">
                      <select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}>
                        <option value="weekly">Toutes les semaines</option>
                        <option value="biweekly">Toutes les 2 semaines</option>
                        <option value="monthly">Tous les mois</option>
                      </select>
                      <input type="date" className="form-input" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} required />
                    </div>
                  )}
                </div>
                <textarea className="form-textarea" placeholder="Description" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setSelections([])}>Annuler</button>
                  <button type="submit" className="btn-submit">Continuer la réservation</button>
                </div>
              </form>
            </div>
          ) : (hoveredSalle ? <SalleCard salle={hoveredSalle} /> : <ColorLegend />)}
        </div>
      </div>

      {hoveredReservation && (
        <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{ position: 'fixed', left: popupPosition.x, top: popupPosition.y, transform: 'translateX(-50%)', zIndex: 10003 }}>
          <div className="popup-card-header"><span className="popup-icon">👤</span> {hoveredReservation.prenom} {hoveredReservation.nom}</div>
          <div className="popup-card-body">
            <div className="popup-info-line"><span className="popup-info-icon">📧</span> {hoveredReservation.email}</div>
            <div className="popup-info-line"><span className="popup-info-icon">🏢</span> {hoveredReservation.service}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📅</span> {new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR')} : {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}</div>
            {hoveredReservation.agencement && <div className="popup-info-line"><span className="popup-info-icon">🪑</span> Disposition : {hoveredReservation.agencement}</div>}
            {hoveredReservation.nbPersonnes && <div className="popup-info-line"><span className="popup-info-icon">👥</span> {hoveredReservation.nbPersonnes} pers.</div>}
          </div>
        </div>
      )}

      {adminPasswordModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🔑 Accès Administrateur</h3>
            <p>Saisissez le mot de passe pour déverrouiller cette salle :</p>
            <input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" autoFocus />
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setAdminPasswordModal({show:false, password:''})}>Annuler</button>
              <button className="btn-submit" onClick={handleAdminPasswordSubmit}>Débloquer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationGrid;