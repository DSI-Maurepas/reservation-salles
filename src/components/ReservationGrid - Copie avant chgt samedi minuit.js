// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import icalService from '../services/icalService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, COULEURS_OBJETS, JOURS_FERIES, APP_CONFIG } from '../config/googleSheets';
import { getSalleData, sallesData } from '../data/sallesData'; 
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
  const [isRoomFading, setIsRoomFading] = useState(false);

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

  // ✅ CORRECTION : Vérification de la session Admin au chargement
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isAdminAuthenticated');
    if (sessionAuth === 'true') {
      setIsAdminUnlocked(true);
    }
  }, []);

  const changeDate = (days) => {
    const d = new Date(currentDate); d.setDate(d.getDate() + days);
    setCurrentDate(d); setSelections([]);
  };
  const handleToday = () => { setCurrentDate(new Date()); setSelections([]); };

  const handleAdminPasswordSubmit = () => {
    if (adminPasswordModal.password === APP_CONFIG.ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      // ✅ CORRECTION : Enregistrement dans la session
      sessionStorage.setItem('isAdminAuthenticated', 'true');
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

  useEffect(() => {
    let timerWait, timerFade;
    if (hoveredSalle && selections.length === 0) { 
      setIsRoomFading(false);
      timerWait = setTimeout(() => {
        setIsRoomFading(true);
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

  const handleSalleHeaderClick = (salleFull) => {
    if (hoveredSalle === salleFull) {
      setHoveredSalle(null);
    } else {
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
      const selStart = currentSelection.startHour;
      const selEnd = currentSelection.endHour;
      const selSalle = currentSelection.salle;
      const EPSILON = 0.001; 

      const containingSelectionIndex = selections.findIndex(s => 
        s.salle === selSalle && 
        (s.startHour <= selStart + EPSILON) && 
        (s.endHour >= selEnd - EPSILON)
      );

      if (containingSelectionIndex !== -1) {
        const oldSel = selections[containingSelectionIndex];
        const newSelections = selections.filter((_, i) => i !== containingSelectionIndex);

        if (oldSel.startHour < selStart) {
          newSelections.push({ ...oldSel, endHour: selStart });
        }
        if (oldSel.endHour > selEnd) {
          newSelections.push({ ...oldSel, startHour: selEnd });
        }
        setSelections(newSelections);
      } else {
        setSelections(prev => [...prev, currentSelection]);
      }
    }
    setIsDragging(false); 
    setCurrentSelection(null);
  };

  const handleCancelSelection = () => {
    setSelections([]);
    setFormData({
      nom: '', prenom: '', email: localStorage.getItem('userEmail') || '',
      telephone: '', service: '', objet: '', description: '',
      recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '',
      agencement: '', nbPersonnes: ''
    });
  };

  // ✅ Fonction utilitaire pour générer le nom court (mobile)
  const getShortName = (fullName) => {
    return fullName
      .replace(/Salle Conseil/gi, 'Conseil')
      .replace(/Salle Mariages/gi, 'Mariages')
      .replace(/Salle N°/gi, 'N°')
      .replace(/Salle CCAS/gi, 'CCAS');
  };

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner"></div>);
    SALLES.forEach((salle, idx) => {
      const parts = salle.split(' - ');
      const nomSimple = parts[0];
      const nomLong = nomSimple.replace(/Salle Conseil/gi, 'Conseil').replace(/Salle Mariages/gi, 'Mariages');
      // Nom court pour mobile
      const nomCourt = getShortName(nomSimple);
      
      const salleData = getSalleData(nomSimple);
      const capacity = salleData ? `${salleData.capacite} Pers.` : '';
      const capacityShort = salleData ? `${salleData.capacite}p` : ''; // Capacité raccourcie mobile

      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{ gridColumn: idx + 2 }} onClick={() => handleSalleHeaderClick(salle)}>
          {/* Version Desktop */}
          <span className="salle-name-desktop">{nomLong}</span>
          <span className="salle-capacity-desktop">{capacity}</span>
          
          {/* Version Mobile (sera affichée via CSS) */}
          <span className="salle-name-mobile">{nomCourt}</span>
          <span className="salle-capacity-mobile">{capacityShort}</span>
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
          const datesRecur = icalService.generateRecurrenceDates ? icalService.generateRecurrenceDates(selDateObj, new Date(formData.recurrenceJusquau), formData.recurrenceType) : [];
          if (datesRecur.length === 0) {
             const current = new Date(selDateObj); const end = new Date(formData.recurrenceJusquau);
             if (formData.recurrenceType === 'monthly') current.setMonth(current.getMonth() + 1); else if (formData.recurrenceType === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7);
             while (current <= end) { datesRecur.push(new Date(current)); if (formData.recurrenceType === 'monthly') current.setMonth(current.getMonth() + 1); else if (formData.recurrenceType === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); }
          }
          datesRecur.forEach(date => { const dateRecurStr = googleSheetsService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); });
        }
      });
      const allExisting = await googleSheetsService.getAllReservations(true); 
      const { conflicts, valid } = checkConflicts(allCandidates, allExisting); 
      
      setIsSubmitting(false); 
      
      if (conflicts.length > 0) {
        setWarningModal({ show: true, conflicts, validReservations: valid });
      } else {
        await finalizeReservation(valid);
      }
    } catch (error) { 
      alert('Erreur : ' + error.message); 
      setIsSubmitting(false); 
    }
  };

  const checkConflicts = (candidates, allExistingReservations) => {
    const conflicts = []; const valid = [];
    candidates.forEach(candidate => {
      const candidateStart = new Date(`${candidate.dateDebut}T${candidate.heureDebut}`);
      const candidateEnd = new Date(`${candidate.dateFin}T${candidate.heureFin}`);
      const candShortName = candidate.salle.split(' - ')[0].trim();

      const hasConflict = allExistingReservations.some(existing => {
        if (existing.statut === 'cancelled') return false;
        const existShortName = existing.salle.split(' - ')[0].trim();
        if (candShortName !== existShortName) return false;

        const existingStart = new Date(`${existing.dateDebut}T${existing.heureDebut}`);
        const existingEnd = new Date(`${existing.dateFin || existing.dateDebut}T${existing.heureFin}`);
        return (candidateStart < existingEnd && candidateEnd > existingStart);
      });
      if (hasConflict) conflicts.push(candidate); else valid.push(candidate);
    });
    return { conflicts, valid };
  };

  const finalizeReservation = async (reservationsToSave) => {
    setWarningModal({ show: false, conflicts: [], validReservations: [] });

    setIsSubmitting(true); 
    setSubmissionProgress({ current: 0, total: reservationsToSave.length });
    
    await new Promise(r => setTimeout(r, 10));

    try {
      const createdReservations = [];
      for (const res of reservationsToSave) {
        const result = await googleSheetsService.addReservation(res);
        createdReservations.push({ ...res, id: result.id });
        setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 }));
        try { await emailService.sendConfirmation(res); } catch (e) { console.error(e); }
      }
      setSuccessModal({ show: true, reservations: createdReservations, message: '✅ Réservation confirmée !' });
      setSelections([]);
      loadReservations();
    } catch (error) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  // ✅ LOGIQUE POUR RECUPERER LES DISPOSITIONS CORRECTES
  const specialRoomSelection = selections.find(sel => sel.salle.includes('Conseil') || sel.salle.includes('Mariages'));
  let currentDispositions = [];
  if (specialRoomSelection) {
      const cleanName = specialRoomSelection.salle.split(' - ')[0];
      const sData = getSalleData(cleanName);
      const sInfo = sallesData.find(s => s.nom === sData?.nom);
      currentDispositions = sInfo?.dispositions || [];
  }

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
          {selections.length > 0 ? (
            <div className="reservation-form">
              <h3 className="form-title">Nouvelle Réservation</h3>
              
              {/* ✅ CORRECTION : Texte conditionnel */}
              <p className="selection-count">
                {selections.length > 1 
                  ? `Réservation de ${selections.length} créneaux` 
                  : 'Confirmer la réservation'}
              </p>

              <div className="selections-summary">{preMergeSelections(selections).map((sel, idx) => (<div key={idx} className="selection-item">{sel.salle.split(' - ')[0]} : {googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)}<button className="remove-selection-btn" onClick={() => setSelections(prev => prev.filter(s => !(s.salle === sel.salle && s.startHour >= sel.startHour && s.endHour <= sel.endHour)))}>✕</button></div>))}</div>
              <form onSubmit={handleFormSubmit} className="room-form">
                <div className="form-row">
                  <input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} />
                  <input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} />
                </div>
                <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Choisissez le service...*</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required><option value="">Choisissez l'objet...*</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}</select>
                
                {/* ✅ CORRECTION : Affichage dynamique des dispositions */}
                {specialRoomSelection && (
                  <>
                    <select className="form-select disposition-select" value={formData.agencement} onChange={e => setFormData({...formData, agencement: e.target.value})} required>
                      <option value="">Disposition souhaitée *</option>
                      {currentDispositions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="number" className="form-input" placeholder="Nb Personnes *" value={formData.nbPersonnes} onChange={e => setFormData({...formData, nbPersonnes: e.target.value})} required />
                  </>
                )}

                <textarea className="form-textarea" placeholder="Description (facultative)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="recurrence-section-styled">
                  <div className="recurrence-box"><input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} /><label>Réservation récurrente</label></div>
                  {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}>
                    {/* ✅ CORRECTION : Date min = date de la grille en cours */}
                    <input type="date" className="form-input" placeholder="JJ/MM/AAAA" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(currentDate)} required={formData.recurrence} />
                  </div></div>)}</div>
                
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={handleCancelSelection}>Annuler</button>
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button>
                </div>
              </form>
            </div>
          ) : (
            hoveredSalle ? (
              <div className={`salle-detail-wrapper ${isRoomFading ? 'fading-out' : ''}`} onClick={() => setHoveredSalle(null)}>
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

      {isSubmitting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Enregistrement... ({submissionProgress.current} / {submissionProgress.total})</h3>
            <div style={{width:'100%',background:'#eee',height:'10px',borderRadius:'5px'}}>
              <div style={{
                width: `${submissionProgress.total > 0 ? (submissionProgress.current / submissionProgress.total) * 100 : 0}%`, 
                background: '#4caf50', 
                height: '100%',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {successModal.show && (
        <div className="success-modal-overlay" onClick={() => setSuccessModal({...successModal, show:false})}>
          <div className="success-modal">
            <div className="success-modal-header">
              <h2>{successModal.reservations.length > 1 ? "✅ Réservations confirmées !" : "✅ Réservation confirmée !"}</h2>
            </div>
            <div className="success-modal-body">
              <div className="reservations-list">
                {successModal.reservations.map((res, i) => (
                  <div key={i} className="reservation-item-success">
                    <span className="calendar-icon">📅</span> {res.salle.split(' - ')[0]} - {new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin}
                  </div>
                ))}
              </div>
              
              <div className="ical-info-text">
                {successModal.reservations.length > 1 
                  ? "Intégration dans un agenda parallèle à transférer ensuite dans le votre" 
                  : "Intégration dans votre agenda"}
              </div>
              
              <button className="download-ical-button" onClick={() => icalService.generateAndDownload(successModal.reservations)}>
                📥 Calendrier iCal
              </button>
            </div>
            <div className="success-modal-footer">
              <button className="close-modal-button" onClick={() => setSuccessModal({...successModal, show:false})}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {warningModal.show && (
        <div className="modal-overlay">
          <div className="warning-modal">
            <div className="warning-modal-header">
              <h2>{warningModal.conflicts.length > 1 ? "⚠️ Conflits de réservation" : "⚠️ Conflit de réservation"}</h2>
            </div>
            <div className="warning-modal-body">
              <p>
                {warningModal.conflicts.length > 1 
                  ? `${warningModal.conflicts.length} créneaux déjà réservés :`
                  : "Créneau déjà réservé :"}
              </p>
              <div className="conflict-list">
                {warningModal.conflicts.map((conf, idx) => (
                  <li key={idx}>📅 {conf.dateDebut} - 🕑 {conf.heureDebut} à {conf.heureFin}</li>
                ))}
              </div>
            </div>
            <div className="warning-modal-footer">
              <button className="btn-cancel" onClick={() => setWarningModal({show:false, conflicts:[], validReservations:[]})}>Annuler</button>
              {warningModal.validReservations.length > 0 && (
                <button className="btn-submit" onClick={() => finalizeReservation(warningModal.validReservations)}>
                  Valider les {warningModal.validReservations.length} disponibles
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><h2>Fermé</h2><button onClick={() => setBlockedDayModal(false)}>Fermer</button></div></div>}
      {adminPasswordModal.show && <div className="modal-overlay"><div className="modal-content"><h3>🔑 Accès Administrateur</h3><p>Saisissez le mot de passe pour déverrouiller cette salle :</p><input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" autoFocus /><div className="form-actions"><button className="btn-cancel" onClick={() => setAdminPasswordModal({show:false, password:''})}>Annuler</button><button className="btn-submit" onClick={handleAdminPasswordSubmit}>Débloquer</button></div></div></div>}
    </div>
  );
}

export default ReservationGrid;