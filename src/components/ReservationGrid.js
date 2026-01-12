// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, COULEURS_OBJETS, JOURS_FERIES } from '../config/googleSheets';
import ColorLegend from './ColorLegend';
import SalleCard from './SalleCard';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, onBack, editingReservation }) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSalle, setHoveredSalle] = useState(null);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0, alignment: 'bottom' });
  const [isFading, setIsFading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedDayModal, setBlockedDayModal] = useState(false);

  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const detailsRef = useRef(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: localStorage.getItem('userEmail') || '',
    telephone: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '',
    agencement: '', nbPersonnes: ''
  });

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

  // Fonctions de vérification dates
  const isJourFerie = (date) => JOURS_FERIES.includes(googleSheetsService.formatDate(date));
  const isDimanche = (date) => date.getDay() === 0;
  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };

  const handleMouseDown = (salle, hour, e) => {
    // PRIORITÉ 1 : Vérifier réservation existante (pour popup)
    const sShort = salle.split(' - ')[0];
    const res = reservations.find(r => r.salle.includes(sShort) && hour >= googleSheetsService.timeToFloat(r.heureDebut) && hour < googleSheetsService.timeToFloat(r.heureFin));
    if (res) {
      const popupHeight = 220;
      const popupWidth = 280;
      
      let finalX, finalY, transform;
      
      if (window.innerWidth < 1280) {
        // RESPONSIVE : Centrer horizontalement SANS transform horizontal
        finalX = (window.innerWidth - popupWidth) / 2;
        finalY = e.clientY - 50 - (popupHeight / 2);
        transform = 'translate(0, 0)';  // Pas de décalage
      } else {
        // DESKTOP : Centré sur pointeur (5ème correction)
        finalX = e.clientX;
        finalY = e.clientY;
        transform = 'translate(-50%, -50%)';  // Centré en X et Y
      }
      
      const alignment = 'top';
      setPopupPosition({ x: finalX, y: finalY, alignment, transform });
      setHoveredReservation(res);
      return;
    }
    // PRIORITÉ 2 : Bloquer dates passées/dimanche/férié (BUG CRITIQUE)
    if (isDimanche(currentDate) || isJourFerie(currentDate)) {
      setBlockedDayModal(true);  // Modal comme Par Salle
      return;
    }
    if (isDateInPast(currentDate)) {
      return;  // Bloquer silencieusement
    }
    
    // PRIORITÉ 3 : Vérifier admin
    if (SALLES_ADMIN_ONLY.some(a => salle.includes(a)) && !isAdminUnlocked) {
      setAdminPasswordModal({ show: true, password: '' });
      return;
    }
    
    // PRIORITÉ 4 : Permettre sélection
    setIsDragging(true);
    setCurrentSelection({ salle, startHour: hour, endHour: hour + 0.5 });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !currentSelection || currentSelection.salle !== salle) return;
    setCurrentSelection({ ...currentSelection, endHour: hour + 0.5 });
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) {
      // Vérifier si déjà sélectionné (TOGGLE)
      const isAlreadySelected = selections.some(
        sel => sel.salle === currentSelection.salle && 
               Math.abs(sel.startHour - currentSelection.startHour) < 0.01
      );
      
      if (isAlreadySelected) {
        // TOGGLE OFF - Retirer le créneau
        setSelections(prev => prev.filter(
          sel => !(sel.salle === currentSelection.salle && 
                   Math.abs(sel.startHour - currentSelection.startHour) < 0.01)
        ));
      } else {
        // TOGGLE ON - Ajouter le créneau
        setSelections(prev => [...prev, currentSelection]);
      }
    }
    setIsDragging(false);
    setCurrentSelection(null);
  };

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner"></div>);
    SALLES.forEach((salle, idx) => {
      const parts = salle.split(' - ');
      const capacity = parts[1] ? parts[1].replace(/Personnes/gi, 'Pers.') : '';
      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{ gridColumn: idx + 2 }} onClick={() => setHoveredSalle(salle)}>
          <span className="salle-name-white">{parts[0].replace(/Salle Conseil/gi, 'Conseil').replace(/Salle Mariages/gi, 'Mariages')}</span>
          <span className="salle-capacity-white">{capacity}</span>
        </div>
      );
    });
    for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) {
      const row = (h - HORAIRES.HEURE_DEBUT) / 0.5 + 2;
      const isFullHour = h % 1 === 0;
      if (isFullHour) grid.push(<div key={`t-${h}`} className="time-label" style={{ gridRow: `${row} / span 2` }}>{h}h</div>);
      SALLES.forEach((salle, idx) => {
        const sShort = salle.split(' - ')[0];
        const res = reservations.find(r => r.salle.includes(sShort) && h >= googleSheetsService.timeToFloat(r.heureDebut) && h < googleSheetsService.timeToFloat(r.heureFin));
        const isLocked = SALLES_ADMIN_ONLY.some(a => salle.includes(a)) && !isAdminUnlocked;
        const selected = selections.some(sel => sel.salle === salle && h >= sel.startHour && h < sel.endHour) || (currentSelection && currentSelection.salle === salle && h >= currentSelection.startHour && h < currentSelection.endHour);
        let classes = `time-slot ${isFullHour ? 'full-hour-start' : 'half-hour-start'}`;
        if (h === HORAIRES.HEURE_FIN - 0.5) classes += ' last-row-slot';
        
        // Ajouter classes pour dates invalides (dimanche/férié/passé)
        // IMPORTANT : Dimanche/Férié grisé SAUF si réservé
        if ((isDimanche(currentDate) || isJourFerie(currentDate)) && !res) {
          classes += ' dimanche jour-ferie';
        }
        // Passé : grisé SEULEMENT si VIDE
        if (isDateInPast(currentDate) && !res) {
          classes += ' past-date';
        }
        
        if (res) classes += ' reserved occupied';
        else if (isLocked) classes += ' admin-only-locked';
        else if (selected) classes += ' selected';
        else if (h >= 12 && h < 14) classes += ' lunch-break';
        grid.push(
          <div key={`c-${salle}-${h}`} className={classes} style={{ gridColumn: idx + 2, gridRow: row, backgroundColor: res ? (COULEURS_OBJETS[res.objet] || '#ccc') : '' }}
            onMouseDown={(e) => handleMouseDown(salle, h, e)}
            onMouseEnter={() => handleMouseEnter(salle, h)}
          >
            
          </div>
        );
      });
    }
    return grid;
  };

  const preMergeSelections = (sels) => {
    const bySalle = {};
    sels.forEach(sel => { if (!bySalle[sel.salle]) bySalle[sel.salle] = []; bySalle[sel.salle].push(sel); });
    const merged = [];
    for (const s in bySalle) {
      const slots = bySalle[s].sort((a, b) => a.startHour - b.startHour);
      let i = 0;
      while (i < slots.length) {
        const cur = { ...slots[i] };
        while (i + 1 < slots.length && Math.abs(cur.endHour - slots[i + 1].startHour) < 0.01) { cur.endHour = slots[i + 1].endHour; i++; }
        merged.push(cur); i++;
      }
    }
    return merged;
  };

  return (
    <div className="reservation-grid-container" onMouseUp={handleMouseUp}>
      <div className="date-navigation-bar">
        <div className="nav-group-left">
          <button className="back-button-original" onClick={onBack}>◀ Calendrier</button>
        </div>
        
        {/* Structure HTML modifiée pour permettre le repositionnement Flexbox */}
        <div className="nav-group-center">
          <button className="nav-nav-btn nav-prev-week" onClick={() => changeDate(-7)}>◀◀</button>
          <button className="nav-nav-btn nav-prev-day" onClick={() => changeDate(-1)}>◀</button>
          
          <button className="nav-today-button" onClick={handleToday}>Aujourd'hui</button>
          
          <button className="nav-nav-btn nav-next-day" onClick={() => changeDate(1)}>▶</button>
          <button className="nav-nav-btn nav-next-week" onClick={() => changeDate(7)}>▶▶</button>
        </div>

        <div className="central-date-block">
          <div className="date-display">
            <h2>{currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          </div>
        </div>
      </div>

      <div className="reservation-content">
        <div className="grid-column"><div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>{renderGrid()}</div></div>
        <div className="form-column" ref={detailsRef}>
          {selections.length > 0 ? (
            <div className="reservation-form">
              <h3 className="form-title">Nouvelle Réservation</h3>
              <p className="selection-count">{selections.length} {selections.length > 1 ? 'nouveaux créneaux' : 'nouveau créneau'}</p>
              <div className="selections-summary">
                {preMergeSelections(selections).map((sel, idx) => (
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
                      <input type="date" className="form-input" placeholder="JJ/MM/AAAA" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} required />
                    </div>
                  )}
                </div>
                <textarea className="form-textarea" placeholder="Description" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setSelections([])}>Annuler la sélection</button>
                  <button type="submit" className="btn-submit">Continuer la réservation</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {hoveredSalle ? <SalleCard salle={hoveredSalle} /> : <ColorLegend />}
              {selections.length === 0 && (
                <div className="no-selection-message">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👆</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', lineHeight: '1.4' }}>
                    Sélectionnez un ou plusieurs créneaux<br/>pour commencer votre réservation
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* Modal Dimanche/Férié fermé - ✅ CORRECTION : Classes CSS au lieu de styles inline */}
      {blockedDayModal && (
        <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}>
          <div className="blocked-modal" onClick={(e) => e.stopPropagation()}>
            <div className="warning-modal-header">
              <span className="blocked-modal-emoji">🚫</span>
              <h2 className="blocked-modal-title">Fermé</h2>
            </div>
            <p className="blocked-modal-message">
              Dimanche/Férié fermé.
            </p>
            <button onClick={() => setBlockedDayModal(false)} className="blocked-close-button">
              Fermer
            </button>
          </div>
        </div>
      )}

      {hoveredReservation && (
        <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`}
             onClick={() => { setHoveredReservation(null); setIsFading(false); }}
             style={{ position: 'fixed', left: popupPosition.x, top: popupPosition.y, transform: popupPosition.transform || 'translate(-50%, 0)', zIndex: 10005 }}>
          <div className="popup-card-header"><span className="popup-icon">👤</span> {hoveredReservation.prenom} {hoveredReservation.nom}</div>
          <div className="popup-card-body">
            <div className="popup-info-line"><span className="popup-info-icon">🏢</span> {hoveredReservation.service}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📧</span> {hoveredReservation.email}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📋</span> {hoveredReservation.objet}</div>
            
            <div className="popup-info-line">
              <span className="popup-info-icon">📅</span> 
              {new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR')} | {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}
            </div>
            {(hoveredReservation.salle.toLowerCase().includes('conseil') || hoveredReservation.salle.toLowerCase().includes('mariages')) && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">🪑</span> 
                  {hoveredReservation.agencement || 'N/C'} | {hoveredReservation.nbPersonnes || 'N/C'} Pers.
                </div>
            )}
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