// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, COULEURS_OBJETS, JOURS_FERIES } from '../config/googleSheets';
import { sallesData } from '../data/sallesData';
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ÉTATS POUR LA SÉCURITÉ ADMIN
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const detailsRef = useRef(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: localStorage.getItem('userEmail') || '',
    telephone: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceJusquau: '', recurrenceType: 'weekly',
    agencement: '', nbPersonnes: ''
  });

  const changeDate = (days) => {
    const d = new Date(currentDate); d.setDate(d.getDate() + days);
    setCurrentDate(d); setSelections([]);
  };

  const handleToday = () => { setCurrentDate(new Date()); setSelections([]); };

  const formatRoomName = (name) => {
    if (!name) return '';
    return name.replace(/Salle Conseil/gi, 'Conseil').replace(/Salle Mariages/gi, 'Mariages');
  };

  // VÉRIFICATION ADMIN SÉCURISÉE
  const isAdminOnlyRoom = (salle) => {
    return SALLES_ADMIN_ONLY.some(adminRoom => salle.includes(adminRoom) || adminRoom.includes(salle));
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPasswordModal.password === 'R3sa@M0rep@s78') {
      setIsAdminUnlocked(true);
      setAdminPasswordModal({ show: false, password: '' });
    } else {
      alert('❌ Mot de passe incorrect');
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

  const handleMouseDown = (salle, hour) => {
    if (isAdminOnlyRoom(salle) && !isAdminUnlocked) {
      setAdminPasswordModal({ show: true, password: '' });
      return;
    }
    // Empêcher de glisser sur une cellule déjà réservée
    if (reservations.find(res => res.salle.includes(salle.split(' - ')[0]) && hour >= googleSheetsService.timeToFloat(res.heureDebut) && hour < googleSheetsService.timeToFloat(res.heureFin))) return;

    setIsDragging(true);
    setCurrentSelection({ salle, startHour: hour, endHour: hour + 0.5 });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !currentSelection || currentSelection.salle !== salle) return;
    setCurrentSelection({ ...currentSelection, endHour: hour + 0.5 });
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) {
      setSelections(prev => [...prev, currentSelection]);
    }
    setIsDragging(false);
    setCurrentSelection(null);
  };

  const preMergeSelections = (selections) => {
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
  };

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner"></div>);

    SALLES.forEach((salle, idx) => {
      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{ gridColumn: idx + 2 }} onClick={() => { setHoveredSalle(salle); if(detailsRef.current) detailsRef.current.scrollIntoView({behavior:'smooth'}); }}>
          <span className="salle-name">{formatRoomName(salle.split(' - ')[0])}</span>
          <span className="salle-capacity">{salle.split(' - ')[1] || ''}</span>
        </div>
      );
    });

    for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) {
      const row = (h - HORAIRES.HEURE_DEBUT) / 0.5 + 2;
      const isFullHour = h % 1 === 0;
      const isLastRow = (h === HORAIRES.HEURE_FIN - 0.5);
      if (isFullHour) grid.push(<div key={`t-${h}`} className="time-label" style={{ gridRow: `${row} / span 2` }}>{h}h</div>);

      SALLES.forEach((salle, idx) => {
        const reserved = reservations.find(res => res.salle.includes(salle.split(' - ')[0]) && h >= googleSheetsService.timeToFloat(res.heureDebut) && h < googleSheetsService.timeToFloat(res.heureFin));
        const locked = isAdminOnlyRoom(salle) && !isAdminUnlocked;
        const selected = selections.some(sel => sel.salle === salle && h >= sel.startHour && h < sel.endHour) || (currentSelection && currentSelection.salle === salle && h >= currentSelection.startHour && h < currentSelection.endHour);
        
        let classes = `time-slot ${isFullHour ? 'full-hour-start' : 'half-hour-start'} ${isLastRow ? 'last-row-slot' : ''}`;
        if (locked) classes += ' admin-only-locked';
        else if (reserved) classes += ' reserved occupied';
        else if (selected) classes += ' selected';
        else if (h >= 12 && h < 14) classes += ' lunch-break';

        grid.push(
          <div key={`c-${salle}-${h}`} className={classes} style={{ gridColumn: idx + 2, gridRow: row, backgroundColor: (reserved && !locked) ? (COULEURS_OBJETS[reserved.objet] || '#ccc') : '' }}
            onMouseDown={() => handleMouseDown(salle, h)}
            onMouseEnter={() => handleMouseEnter(salle, h)}
          >
          </div>
        );
      });
    }
    return grid;
  };

  const mergedSelections = preMergeSelections(selections);

  return (
    <div className="reservation-grid-container" onMouseUp={handleMouseUp}>
      <div className="date-navigation-bar">
        <div className="nav-group-left"><button className="back-button-small" onClick={onBack}>◀ Calendrier</button></div>
        <div className="nav-group-center">
            <button className="nav-nav-btn" onClick={() => changeDate(-7)}>⏪</button>
            <button className="nav-nav-btn" onClick={() => changeDate(-1)}>◀</button>
            <div className="central-date-block">
                <button className="nav-today-button" onClick={handleToday}>Aujourd'hui</button>
                <div className="date-display">
                    <h2>{currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                </div>
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
              <h3 className="form-title">Nouvelle Réservation</h3>
              <div className="selections-summary">
                {mergedSelections.map((sel, i) => (
                  <div key={i} className="selection-item">
                    <div className="selection-info">
                      <p><strong>{sel.salle.split(' - ')[0]}</strong></p>
                      <p>{googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)}</p>
                    </div>
                    <button className="remove-selection-btn" onClick={() => setSelections(prev => prev.filter(s => !(s.salle === sel.salle && s.startHour >= sel.startHour && s.endHour <= sel.endHour)))}>✕</button>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => e.preventDefault()} className="room-form">
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

                {/* LOGIQUE RECURRENCE RESTAURÉE */}
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
                      <div className="date-input-group">
                        <label>Jusqu'au :</label>
                        <input type="date" className="form-input" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} required />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setSelections([])}>Annuler</button>
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button>
                </div>
              </form>
            </div>
          ) : (
            hoveredSalle ? <SalleCard salle={hoveredSalle} /> : <ColorLegend />
          )}
        </div>
      </div>

      {adminPasswordModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🔑 Accès Administrateur</h3>
            <p>Cette salle est réservée. Veuillez saisir le mot de passe :</p>
            <input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" />
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