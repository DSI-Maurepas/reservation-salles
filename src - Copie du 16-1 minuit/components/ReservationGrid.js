// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import icalService from '../services/icalService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, COULEURS_OBJETS, JOURS_FERIES, APP_CONFIG } from '../config/googleSheets';
import { getSalleData } from '../data/sallesData'; 
import ColorLegend from './ColorLegend';
import SalleCard from './SalleCard';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, onBack, editingReservation }) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Gestion affichage Fiche Salle (Clic en-tête)
  const [hoveredSalle, setHoveredSalle] = useState(null); // Contient le nom de la salle cliquée
  const [isRoomFading, setIsRoomFading] = useState(false);

  // Gestion Popup Réservation (Survol/Clic créneau)
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  const [loading, setLoading] = useState(true);
  const [blockedDayModal, setBlockedDayModal] = useState(false);

  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  const [successModal, setSuccessModal] = useState({ show: false, reservations: [], message: '' });
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [] });

  const detailsRef = useRef(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: localStorage.getItem('userEmail') || '',
    telephone: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '',
    agencement: '', nbPersonnes: ''
  });

  const changeDate = (days) => {
    const d = new Date(currentDate); d.setDate(d.getDate() + days);
    setCurrentDate(d); setSelections([]);
  };
  const handleToday = () => { setCurrentDate(new Date()); setSelections([]); };

  const handleAdminPasswordSubmit = () => {
    if (adminPasswordModal.password === APP_CONFIG.ADMIN_PASSWORD) {
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
  
  // Timer Popup Réservation
  useEffect(() => {
    let timerOut, timerRemove;
    if (hoveredReservation) {
      setIsFading(false);
      timerOut = setTimeout(() => {
        setIsFading(true);
        timerRemove = setTimeout(() => {
          setHoveredReservation(null);
          setIsFading(false);
        }, 400); 
      }, 4000);
    }
    return () => { clearTimeout(timerOut); clearTimeout(timerRemove); };
  }, [hoveredReservation]);

  // ✅ Timer Fiche Salle (5s + 0.6s fade)
  useEffect(() => {
    let timerWait, timerFade;
    if (hoveredSalle && selections.length === 0) { // Uniquement si pas de formulaire ouvert
      setIsRoomFading(false);
      // Attente 5 secondes
      timerWait = setTimeout(() => {
        setIsRoomFading(true);
        // Attente fin animation 0.6s
        timerFade = setTimeout(() => {
          setHoveredSalle(null);
          setIsRoomFading(false);
        }, 600);
      }, 5000);
    }
    return () => { clearTimeout(timerWait); clearTimeout(timerFade); };
  }, [hoveredSalle, selections.length]);

  const isJourFerie = (date) => JOURS_FERIES.includes(googleSheetsService.formatDate(date));
  const isDimanche = (date) => date.getDay() === 0;
  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };

  // ✅ Gestion Clic En-tête Salle
  const handleSalleHeaderClick = (salleFull) => {
    // Si on clique sur la même salle, on ferme (toggle)
    if (hoveredSalle === salleFull) {
      setHoveredSalle(null);
    } else {
      // Sinon on ouvre la nouvelle
      setHoveredSalle(salleFull);
      setIsRoomFading(false);
    }
  };

  const handleMouseDown = (salle, hour, e) => {
    const sShort = salle.split(' - ')[0];
    const res = reservations.find(r => r.salle.includes(sShort) && hour >= googleSheetsService.timeToFloat(r.heureDebut) && hour < googleSheetsService.timeToFloat(r.heureFin));
    if (res) {
      setPopupPosition({ x: e.clientX, y: e.clientY });
      setHoveredReservation(res);
      return;
    }
    if (isDimanche(currentDate) || isJourFerie(currentDate)) { setBlockedDayModal(true); return; }
    if (isDateInPast(currentDate)) return;
    if (SALLES_ADMIN_ONLY.some(a => salle.includes(a)) && !isAdminUnlocked) { setAdminPasswordModal({ show: true, password: '' }); return; }
    
    // Le clic sur un créneau ferme la fiche salle immédiatement
    setHoveredSalle(null);
    
    setIsDragging(true);
    setCurrentSelection({ salle, startHour: hour, endHour: hour + 0.5 });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !currentSelection || currentSelection.salle !== salle) return;
    setCurrentSelection({ ...currentSelection, endHour: hour + 0.5 });
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) {
      const isAlreadySelected = selections.some(sel => sel.salle === currentSelection.salle && Math.abs(sel.startHour - currentSelection.startHour) < 0.01);
      if (isAlreadySelected) {
        setSelections(prev => prev.filter(sel => !(sel.salle === currentSelection.salle && Math.abs(sel.startHour - currentSelection.startHour) < 0.01)));
      } else {
        setSelections(prev => [...prev, currentSelection]);
      }
    }
    setIsDragging(false); setCurrentSelection(null);
  };

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner"></div>);
    SALLES.forEach((salle, idx) => {
      const parts = salle.split(' - ');
      const nomSimple = parts[0];
      const nom = nomSimple.replace(/Salle Conseil/gi, 'Conseil').replace(/Salle Mariages/gi, 'Mariages');
      
      const salleData = getSalleData(nomSimple);
      const capacity = salleData ? `${salleData.capacite} Pers.` : '';

      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{ gridColumn: idx + 2 }} onClick={() => handleSalleHeaderClick(salle)}>
          <span className="salle-name-white">{nom}</span>
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
        if ((isDimanche(currentDate) || isJourFerie(currentDate)) && !res) classes += ' dimanche jour-ferie';
        if (isDateInPast(currentDate) && !res) classes += ' past-date';
        if (res) classes += ' reserved occupied'; else if (isLocked) classes += ' admin-only-locked'; else if (selected) classes += ' selected'; else if (h >= 12 && h < 14) classes += ' lunch-break';
        grid.push(<div key={`c-${salle}-${h}`} className={classes} style={{ gridColumn: idx + 2, gridRow: row, backgroundColor: res ? (COULEURS_OBJETS[res.objet] || '#ccc') : '' }} onMouseDown={(e) => handleMouseDown(salle, h, e)} onMouseEnter={() => handleMouseEnter(salle, h)}></div>);
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const needsDisposition = selections.some(sel => sel.salle.includes('Conseil') || sel.salle.includes('Mariages'));
    if (needsDisposition && !formData.agencement) return alert('⚠️ Veuillez choisir une disposition pour cette salle.');
    if (needsDisposition && !formData.nbPersonnes) return alert('⚠️ Veuillez indiquer le nombre de personnes prévues.');
    
    setIsSubmitting(true);
    try {
      const mergedSelections = preMergeSelections(selections);
      let allCandidates = [];
      mergedSelections.forEach(sel => {
        const dateStr = googleSheetsService.formatDate(currentDate);
        const baseRes = { salle: sel.salle, service: formData.service, nom: formData.nom, prenom: formData.prenom, email: formData.email, telephone: formData.telephone, dateDebut: dateStr, dateFin: dateStr, heureDebut: googleSheetsService.formatTime(sel.startHour), heureFin: googleSheetsService.formatTime(sel.endHour), objet: formData.objet, description: formData.description, recurrence: formData.recurrence ? 'OUI' : 'NON', recurrenceJusquau: formData.recurrenceJusquau, agencement: formData.agencement || '', nbPersonnes: formData.nbPersonnes || '', statut: 'active' };
        allCandidates.push(baseRes);
        if (formData.recurrence && formData.recurrenceJusquau) {
          const selDateObj = new Date(dateStr);
          const datesRecur = []; const current = new Date(selDateObj); const end = new Date(formData.recurrenceJusquau); 
          if (formData.recurrenceType === 'monthly') current.setMonth(current.getMonth() + 1); else if (formData.recurrenceType === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7);
          while (current <= end) { datesRecur.push(new Date(current)); if (formData.recurrenceType === 'monthly') current.setMonth(current.getMonth() + 1); else if (formData.recurrenceType === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); }
          
          datesRecur.forEach(date => { const dateRecurStr = googleSheetsService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); });
        }
      });
      const allExisting = await googleSheetsService.getAllReservations(true); 
      const { conflicts, valid } = checkConflicts(allCandidates, allExisting); 
      setIsSubmitting(false);
      if (conflicts.length > 0) setWarningModal({ show: true, conflicts, validReservations: valid });
      else await finalizeReservation(valid);
    } catch (error) { alert('Erreur : ' + error.message); setIsSubmitting(false); }
  };

  const checkConflicts = (candidates, allExistingReservations) => {
    const conflicts = []; const valid = [];
    candidates.forEach(candidate => {
      const candidateStart = new Date(`${candidate.dateDebut}T${candidate.heureDebut}`);
      const candidateEnd = new Date(`${candidate.dateFin}T${candidate.heureFin}`);
      const hasConflict = allExistingReservations.some(existing => {
        if (existing.statut === 'cancelled') return false;
        if (existing.salle !== candidate.salle && existing.salle.split(' - ')[0] !== candidate.salle) return false;
        const existingStart = new Date(`${existing.dateDebut}T${existing.heureDebut}`);
        const existingEnd = new Date(`${existing.dateFin || existing.dateDebut}T${existing.heureFin}`);
        return (candidateStart < existingEnd && candidateEnd > existingStart);
      });
      if (hasConflict) conflicts.push(candidate); else valid.push(candidate);
    });
    return { conflicts, valid };
  };

  const finalizeReservation = async (reservationsToSave) => {
    setIsSubmitting(true); setSubmissionProgress({ current: 0, total: reservationsToSave.length });
    try {
      const createdReservations = [];
      for (const res of reservationsToSave) {
        const result = await googleSheetsService.addReservation(res);
        createdReservations.push({ ...res, id: result.id });
        setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 }));
        try { await emailService.sendConfirmation(res); } catch (e) {}
      }
      setSuccessModal({ show: true, reservations: createdReservations, message: '✅ Réservation confirmée !' });
      setSelections([]);
    } catch (error) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="reservation-grid-container" onMouseUp={handleMouseUp}>
      <div className="date-navigation-bar">
        <div className="nav-group-left"><button className="back-button-original" onClick={onBack}>◀ Calendrier</button></div>
        <div className="nav-group-center">
          <button className="nav-nav-btn" onClick={() => changeDate(-7)}>◀◀</button>
          <button className="nav-nav-btn" onClick={() => changeDate(-1)}>◀</button>
          <button className="nav-today-button" onClick={handleToday}>Aujourd'hui</button>
          <div className="central-date-block"><div className="date-display"><h2>{currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2></div></div>
          <button className="nav-nav-btn" onClick={() => changeDate(1)}>▶</button>
          <button className="nav-nav-btn" onClick={() => changeDate(7)}>▶▶</button>
        </div>
      </div>

      <div className="reservation-content">
        <div className="grid-column"><div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>{renderGrid()}</div></div>
        <div className="form-column" ref={detailsRef}>
          {/* LOGIQUE D'AFFICHAGE DU FORMULAIRE OU DE LA LÉGENDE */}
          {selections.length > 0 ? (
            <div className="reservation-form">
              <h3 className="form-title">Nouvelle Réservation</h3>
              <p className="selection-count">{selections.length} créneau(x)</p>
              <div className="selections-summary">{preMergeSelections(selections).map((sel, idx) => (<div key={idx} className="selection-item">{sel.salle.split(' - ')[0]} : {googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)}<button className="remove-selection-btn" onClick={() => setSelections(prev => prev.filter(s => !(s.salle === sel.salle && s.startHour >= sel.startHour && s.endHour <= sel.endHour)))}>✕</button></div>))}</div>
              <form onSubmit={handleFormSubmit} className="room-form">
                <div className="form-row">
                  <input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} />
                  <input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} />
                </div>
                <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Service...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required><option value="">Objet...</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}</select>
                {selections.some(sel => sel.salle.includes('Conseil') || sel.salle.includes('Mariages')) && (
                  <><select className="form-select disposition-select" value={formData.agencement} onChange={e => setFormData({...formData, agencement: e.target.value})} required><option value="">Disposition...</option><option value="Tables en U">Tables en U</option><option value="Format Conférence">Conférence</option></select>
                  <input type="number" className="form-input" placeholder="Nb Personnes *" value={formData.nbPersonnes} onChange={e => setFormData({...formData, nbPersonnes: e.target.value})} required /></>
                )}
                <textarea className="form-textarea" placeholder="Description (facultative)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="recurrence-section-styled">
                  <div className="recurrence-box"><input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} /><label>Réservation récurrente</label></div>
                  {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}><input type="date" className="form-input" placeholder="JJ/MM/AAAA" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(new Date())} required={formData.recurrence} /></div></div>)}</div>
                <div className="form-actions"><button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button></div>
              </form>
            </div>
          ) : (
            // ✅ CORRECTION MAJEURE : Logique d'affichage Fiche Salle vs Légende
            hoveredSalle ? (
              <div 
                className={`salle-detail-wrapper ${isRoomFading ? 'fading-out' : ''}`}
                onClick={() => setHoveredSalle(null)} // Click sur le bloc ferme (Desktop & Mobile)
              >
                <SalleCard salle={hoveredSalle} />
              </div>
            ) : (
              <>
                <ColorLegend />
                <div className="no-selection-message"><p>Sélectionnez un ou plusieurs créneaux pour commencer votre réservation 👆</p></div>
              </>
            )
          )}
        </div>
      </div>
      
      {hoveredReservation && (
        <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{position:'fixed', left:popupPosition.x, top:popupPosition.y, zIndex:10005, transform: 'translate(-50%, -50%)'}} onClick={() => setHoveredReservation(null)}>
          <div className="popup-card-header"><span className="popup-icon">👤</span> {hoveredReservation.prenom} {hoveredReservation.nom}</div>
          <div className="popup-card-body">
            <div className="popup-info-line"><span className="popup-info-icon">🏢</span> {hoveredReservation.service}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📧</span> {hoveredReservation.email}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📝</span> {hoveredReservation.objet}</div>
            <div className="popup-info-line"><span className="popup-info-icon">📅</span> {new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR')} - {hoveredReservation.heureDebut} à {hoveredReservation.heureFin}</div>
            {(hoveredReservation.salle.includes('Conseil') || hoveredReservation.salle.includes('Mariages')) && (
              <>
                 <div className="popup-info-line"><span className="popup-info-icon">🪑</span> {hoveredReservation.agencement || 'N/A'}</div>
                 <div className="popup-info-line"><span className="popup-info-icon">👥</span> {hoveredReservation.nbPersonnes || 'N/A'} personnes</div>
              </>
            )}
          </div>
        </div>
      )}

      {successModal.show && <div className="success-modal-overlay" onClick={() => setSuccessModal({...successModal, show:false})}><div className="success-modal"><h2>Confirmé !</h2><button onClick={() => setSuccessModal({...successModal, show:false})}>Fermer</button></div></div>}
      {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><h2>Fermé</h2><button onClick={() => setBlockedDayModal(false)}>Fermer</button></div></div>}
      {adminPasswordModal.show && <div className="modal-overlay"><div className="modal-content"><h3>🔑 Accès Administrateur</h3><p>Saisissez le mot de passe pour déverrouiller cette salle :</p><input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" autoFocus /><div className="form-actions"><button className="btn-cancel" onClick={() => setAdminPasswordModal({show:false, password:''})}>Annuler</button><button className="btn-submit" onClick={handleAdminPasswordSubmit}>Débloquer</button></div></div></div>}
    </div>
  );
}

export default ReservationGrid;