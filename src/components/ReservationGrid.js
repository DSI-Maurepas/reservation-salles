// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, ADMINISTRATEURS, COULEURS_OBJETS, JOURS_FERIES } from '../config/googleSheets';
import { sallesData } from '../data/sallesData';
import ColorLegend from './ColorLegend';
import SalleCard from './SalleCard';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, editReservationId, onBack, onSuccess }) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredObjet, setHoveredObjet] = useState(null);
  const [hoveredSalle, setHoveredSalle] = useState(null);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  const [isFading, setIsFading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  const [successModal, setSuccessModal] = useState({ show: false, reservations: [], message: '' });
  const [blockedDayModal, setBlockedDayModal] = useState(false);
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, salle: '', slot: null, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [] });

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: localStorage.getItem('userEmail') || '',
    telephone: '',
    service: '',
    objet: '',
    description: '',
    recurrence: false,
    recurrenceJusquau: '',
    recurrenceType: 'weekly',
    agencement: '',
    nbPersonnes: ''
  });
  
  const ADMIN_PASSWORD = 'R3sa@Morepas78';

  // --- TIMER 4 SECONDES ---
  useEffect(() => {
    let fadeTimer;
    let removeTimer;
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

  const normalizeRoomName = (name) => name ? name.split(' - ')[0].trim().toLowerCase() : '';
  const isDateInPast = (date) => { const today = new Date(); today.setHours(0,0,0,0); const check = new Date(date); check.setHours(0,0,0,0); return check < today; };
  const isAdminOnlyRoom = (salle) => SALLES_ADMIN_ONLY.includes(salle);
  const isDateBlocked = useCallback((date) => date.getDay() === 0 || JOURS_FERIES.includes(googleSheetsService.formatDate(date)), []);

  const handlePrevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d); setSelections([]); };
  const handleNextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate()+1); setCurrentDate(d); setSelections([]); };
  const handleToday = () => { setCurrentDate(new Date()); setSelections([]); };
  const handleWeekPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d); setSelections([]); };
  const handleWeekNext = () => { const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d); setSelections([]); };

  const loadReservations = useCallback(async () => { setLoading(true); try { if (isDateBlocked(currentDate)) setBlockedDayModal(true); const all = await googleSheetsService.getAllReservations(); const dStr = googleSheetsService.formatDate(currentDate); let dayRes = all.filter(res => { if (res.statut === 'cancelled') return false; const isSameDay = res.dateDebut === dStr; const isMultiDay = (res.dateDebut <= dStr && res.dateFin >= dStr); return isSameDay || isMultiDay; }); if (editingReservation?.id) dayRes = dayRes.filter(r => r.id !== editingReservation.id); setReservations(dayRes); } catch (e) { console.error(e); } finally { setLoading(false); } }, [currentDate, editingReservation, isDateBlocked]);
  useEffect(() => { loadReservations(); }, [loadReservations]);
  useEffect(() => { const loadEdit = async () => { if (editReservationId) { const all = await googleSheetsService.getAllReservations(); const res = all.find(r => r.id === editReservationId); if (res) { setEditingReservation(res); setIsEditMode(true); setSelections([]); setCurrentSelection(null); setFormData({ nom: res.nom, prenom: res.prenom, email: res.email, telephone: res.telephone, service: res.service, objet: res.objet, description: res.description, recurrence: false, recurrenceJusquau: '', recurrenceType: 'weekly', agencement: res.agencement || '', nbPersonnes: res.nbPersonnes || '' }); } } }; if (editReservationId) loadEdit(); }, [editReservationId]);

  const isSlotReserved = (salle, slotStart) => { const slotEnd = slotStart + 0.5; return reservations.some(res => { if (normalizeRoomName(res.salle) !== normalizeRoomName(salle)) return false; const resStart = googleSheetsService.timeToFloat(res.heureDebut); const resEnd = googleSheetsService.timeToFloat(res.heureFin); return (slotStart < resEnd && slotEnd > resStart); }); };
  const getReservation = (salle, slotStart) => { const slotEnd = slotStart + 0.5; return reservations.find(res => { if (normalizeRoomName(res.salle) !== normalizeRoomName(salle)) return false; const resStart = googleSheetsService.timeToFloat(res.heureDebut); const resEnd = googleSheetsService.timeToFloat(res.heureFin); return (slotStart < resEnd && slotEnd > resStart); }); };
  const isSlotSelected = (salle, hour) => { return selections.some(sel => sel.salle === salle && hour >= sel.startHour && hour < sel.endHour); };

  const handleMouseDown = (salle, hour) => { if (isDateBlocked(currentDate)) { setBlockedDayModal(true); return; } if (isDateInPast(currentDate)) { alert('Date passée.'); return; } if (isSlotReserved(salle, hour)) return; if (isAdminOnlyRoom(salle) && !isAdminUnlocked) { setAdminPasswordModal({ show: true, salle, slot: {salle, hour}, password: '' }); return; } setIsDragging(true); setCurrentSelection({ salle, startHour: hour, endHour: hour + 0.5 }); };
  const handleMouseEnter = (salle, hour) => { if (!isDragging || !currentSelection) return; if (currentSelection.salle !== salle) return; const currentEnd = hour + 0.5; let start = currentSelection.startHour; let end = currentSelection.endHour; if (hour < start) start = hour; if (currentEnd > end) end = currentEnd; for (let h = start; h < end; h += 0.5) { if (isSlotReserved(salle, h)) return; } setCurrentSelection({ ...currentSelection, startHour: start, endHour: end }); };
  const handleMouseUp = () => { if (isDragging && currentSelection) { setSelections(prev => { const exists = prev.some(s => s.salle === currentSelection.salle && Math.abs(s.startHour - currentSelection.startHour) < 0.001 && Math.abs(s.endHour - currentSelection.endHour) < 0.001); const overlap = prev.some(s => s.salle === currentSelection.salle && !exists && ((currentSelection.startHour < s.endHour) && (currentSelection.endHour > s.startHour))); if (overlap) { alert("Chevauchement détecté."); return prev; } if (exists) { return prev; } return [...prev, currentSelection]; }); setCurrentSelection(null); } setIsDragging(false); };
  const removeMergedSelection = (mergedSlot) => { setSelections(currentSelections => currentSelections.filter(sel => { if (sel.salle !== mergedSlot.salle) return true; const isInside = (sel.startHour >= mergedSlot.startHour - 0.001) && (sel.endHour <= mergedSlot.endHour + 0.001); return !isInside; })); };
  const handleAdminPasswordSubmit = () => { if (adminPasswordModal.password === ADMIN_PASSWORD) { setIsAdminUnlocked(true); setAdminPasswordModal({ show: false, salle: '', slot: null, password: '' }); } else { alert('Mot de passe incorrect'); } };
  
  const preMergeSelections = (selections) => { const bySalle = {}; selections.forEach(sel => { if (!bySalle[sel.salle]) bySalle[sel.salle] = []; bySalle[sel.salle].push(sel); }); const merged = []; for (const salle in bySalle) { const slots = bySalle[salle].sort((a, b) => a.startHour - b.startHour); let i = 0; while (i < slots.length) { const current = { ...slots[i] }; while (i + 1 < slots.length && Math.abs(current.endHour - slots[i + 1].startHour) < 0.01) { current.endHour = slots[i + 1].endHour; i++; } merged.push(current); i++; } } return merged; };
  const generateRecurrenceDates = (startDate, endDate, type) => { const dates = []; const current = new Date(startDate); const end = new Date(endDate); if (type === 'monthly') current.setMonth(current.getMonth() + 1); else if (type === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); while (current <= end) { dates.push(new Date(current)); if (type === 'monthly') current.setMonth(current.getMonth() + 1); else if (type === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); } return dates; };
  const checkConflicts = (candidates, allExistingReservations) => { const conflicts = []; const valid = []; candidates.forEach(candidate => { const candidateStart = new Date(`${candidate.dateDebut}T${candidate.heureDebut}`); const candidateEnd = new Date(`${candidate.dateFin}T${candidate.heureFin}`); const hasConflict = allExistingReservations.some(existing => { if (existing.statut === 'cancelled') return false; if (normalizeRoomName(existing.salle) !== normalizeRoomName(candidate.salle)) return false; const existingStart = new Date(`${existing.dateDebut}T${existing.heureDebut}`); const existingEnd = new Date(`${existing.dateFin || existing.dateDebut}T${existing.heureFin}`); return (candidateStart < existingEnd && candidateEnd > existingStart); }); if (hasConflict) conflicts.push(candidate); else valid.push(candidate); }); return { conflicts, valid }; };
  const finalizeReservation = async (reservationsToSave) => { setIsSubmitting(true); setSubmissionProgress({ current: 0, total: reservationsToSave.length }); setWarningModal({ show: false, conflicts: [], validReservations: [] }); try { const createdReservations = []; for (const res of reservationsToSave) { const result = await googleSheetsService.addReservation(res); createdReservations.push({ ...res, id: result.id }); setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 })); } setSuccessModal({ show: true, reservations: createdReservations, message: '' }); setSelections([]); loadReservations(); } catch (error) { alert("Erreur : " + error.message); } finally { setIsSubmitting(false); } };
  
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (selections.length === 0) return alert('Aucune sélection'); 
    if (!formData.nom || !formData.email || !formData.service || !formData.objet) return alert('Champs manquants'); 
    
    // VALIDATIONS OBLIGATOIRES
    const selectedSalles = [...new Set(selections.map(s => s.salle))];
    if (selectedSalles.length > 0) {
      const room = selectedSalles[0];
      const isConseil = room.includes('Conseil');
      const isMariages = room.includes('Mariages');

      if (isConseil || isMariages) {
        if (!formData.agencement) return alert('⚠️ Veuillez choisir une disposition.');
        if (!formData.nbPersonnes) return alert('⚠️ Veuillez indiquer le nombre de personnes.');
        const nb = parseInt(formData.nbPersonnes, 10);
        const max = isMariages ? 30 : 100;
        if (nb > max) {
          return alert(`⚠️ La capacité maximale pour la salle ${isMariages ? 'des Mariages' : 'du Conseil'} est de ${max} personnes.`);
        }
      }
    }

    setIsSubmitting(true); try { const mergedSelections = preMergeSelections(selections); let allCandidates = []; mergedSelections.forEach(sel => { const dateStr = googleSheetsService.formatDate(currentDate); const baseRes = { salle: sel.salle, dateDebut: dateStr, dateFin: dateStr, heureDebut: googleSheetsService.formatTime(sel.startHour), heureFin: googleSheetsService.formatTime(sel.endHour), nom: formData.nom, prenom: formData.prenom, email: formData.email, telephone: formData.telephone, service: formData.service, objet: formData.objet, description: formData.description, recurrence: formData.recurrence ? 'OUI' : 'NON', recurrenceJusquau: formData.recurrenceJusquau, agencement: formData.agencement, nbPersonnes: formData.nbPersonnes, statut: 'active' }; allCandidates.push(baseRes); if (formData.recurrence && formData.recurrenceJusquau) { const dates = generateRecurrenceDates(currentDate, new Date(formData.recurrenceJusquau), formData.recurrenceType); dates.forEach(date => { const dateRecurStr = googleSheetsService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); }); } }); const allExisting = await googleSheetsService.getAllReservations(); const { conflicts, valid } = checkConflicts(allCandidates, allExisting); setIsSubmitting(false); if (conflicts.length > 0) { setWarningModal({ show: true, conflicts, validReservations: valid }); } else { await finalizeReservation(valid); } } catch (e) { alert("Erreur : " + e.message); setIsSubmitting(false); } 
  };
  
  const handleReservationMouseEnter = (res, e) => { 
    const rect = e.currentTarget.getBoundingClientRect(); 
    setPopupPosition({ x: rect.left + (rect.width / 2), y: rect.top }); 
    setHoveredReservation(res); 
  };

  const renderGrid = () => {
    const grid = [];
    grid.push(<div key="corner" className="grid-corner">Heure</div>);
    SALLES.forEach((salle, idx) => {
      const parts = salle.split(' - ');
      grid.push(
        <div key={`h-${idx}`} className="salle-header" style={{gridColumn: idx+2}} onMouseEnter={() => setHoveredSalle(salle)} onMouseLeave={() => setHoveredSalle(null)}>
          <span className="salle-name">{parts[0]}</span>
          <span className="salle-capacity">{parts[1]||''}</span>
        </div>
      );
    });
    for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) {
      const row = (h - HORAIRES.HEURE_DEBUT) / 0.5 + 2;
      const isFullHour = h % 1 === 0;
      if (isFullHour) {
        grid.push(<div key={`t-${h}`} className="time-label" style={{gridRow: `${row} / span 2`}}>{h}h</div>);
      } 
      SALLES.forEach((salle, idx) => {
        const reserved = isSlotReserved(salle, h);
        const res = reserved ? getReservation(salle, h) : null;
        const selected = isSlotSelected(salle, h);
        const isBlockedDay = isDateBlocked(currentDate);
        const isLunch = (h >= 12 && h < 14);
        const isAdmin = isAdminOnlyRoom(salle);
        const past = isDateInPast(currentDate);
        let classes = `time-slot`;
        classes += isFullHour ? ' full-hour-start' : ' half-hour-start';
        if (isBlockedDay) classes += ' blocked';
        else if (reserved) classes += ' reserved occupied';
        else if (past) classes += ' past-date';
        else if (selected) classes += ' selected';
        else if (isAdmin && !isAdminUnlocked) classes += ' admin-only-locked';
        if (isLunch) classes += ' lunch-break';
        let style = { gridColumn: idx+2, gridRow: row };
        if (reserved && res) { style.backgroundColor = COULEURS_OBJETS[res.objet] || '#ccc'; style.color = 'white'; }
        grid.push(
          <div key={`c-${salle}-${h}`} className={classes} style={style}
            onMouseDown={() => handleMouseDown(salle, h)}
            onMouseEnter={(e) => { 
              handleMouseEnter(salle, h); 
              if(reserved && res) handleReservationMouseEnter(res, e); 
            }}
          >
            {isAdmin && !isAdminUnlocked && !reserved && <span className="lock-icon">🔒</span>}
          </div>
        );
      });
    }
    return grid;
  };

  const mergedSelectionsForDisplay = selections.length > 0 ? preMergeSelections(selections) : [];
  const getFormTitle = () => { const count = mergedSelectionsForDisplay.length; if (count > 1) return `Réservation de ${count} créneaux`; return "Réservation d'un créneau"; };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div>;

  return (
    <>
    <div className="reservation-grid-container">
      <div className="date-navigation-bar">
        <div className="nav-group-left">
          <button className="back-button-small" onClick={onBack}>◀ Calendrier</button>
        </div>
        <div className="nav-group-center">
          <button className="nav-week-button" onClick={handleWeekPrev}>◀◀</button>
          <button className="nav-day-button" onClick={handlePrevDay}>◀</button>
          <button className="nav-today-button" onClick={handleToday}>Aujourd'hui</button>
          <div className="date-display">
            <h2>{currentDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
          </div>
          <button className="nav-day-button" onClick={handleNextDay}>▶</button>
          <button className="nav-week-button" onClick={handleWeekNext}>▶▶</button>
        </div>
        <div className="nav-group-right"></div>
      </div>

      <div className="mobile-instruction">
        {/* TEXTE MODIFIÉ POUR MOBILE */}
        <p>👆 Cliquez sur une salle pour afficher ses propriétés en bas de page</p>
        <p>ℹ️ Cliquez sur un créneau pour en connaître les propriétés</p>
      </div>

      <div className="reservation-content" onMouseUp={handleMouseUp}>
        <div className="grid-column">
          <div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>{renderGrid()}</div>
        </div>

        <div className="form-column">
          {selections.length > 0 ? (
            <div className="reservation-form">
                <h3>{getFormTitle()}</h3>
                <div className="selections-summary">
                  <h4 style={{margin:'0 0 0.5rem 0', color:'#2e7d32', fontSize:'0.9rem'}}>📍 Créneaux sélectionnés</h4>
                  {mergedSelectionsForDisplay.map((sel, i) => (
                    <div key={i} className="selection-item">
                      <div className="selection-info">
                        <p><strong>{sel.salle.split(' - ')[0]}</strong></p>
                        <p>{new Date(currentDate).toLocaleDateString('fr-FR')} : {googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)}</p>
                      </div>
                      <button className="remove-selection-btn" onClick={() => removeMergedSelection(sel)}>✕</button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-row"><input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} /><input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} /></div>
                    <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                    <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Choisissez le service...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required><option value="">Choisissez l'objet...</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}</select>
                    {(() => {
                      const salles = [...new Set(selections.map(s => s.salle))];
                      if (salles.length === 1 && (salles[0].includes('Conseil') || salles[0].includes('Mariages'))) {
                         const info = sallesData.find(s => salles[0].includes(s.nom));
                         const isMariages = salles[0].includes('Mariages');
                         return (
                           <>
                             <select className="form-select disposition-select" value={formData.agencement} onChange={e => setFormData({...formData, agencement: e.target.value})} required><option value="">Disposition souhaitée *</option>{info.dispositions && info.dispositions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                             <input type="number" className="form-input" placeholder={`Nombre de personnes prévues (max ${isMariages ? 30 : 100}) *`} value={formData.nbPersonnes} onChange={e => setFormData({...formData, nbPersonnes: e.target.value})} required min="1" max={isMariages ? 30 : 100} />
                           </>
                         );
                      }
                      return null;
                    })()}
                    <textarea className="form-textarea" placeholder="Description (facultative)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <div className="recurrence-section-styled"><div className="recurrence-box"><input type="checkbox" id="recurrence" checked={formData.recurrence} onChange={e=>setFormData({...formData, recurrence:e.target.checked})} /><label htmlFor="recurrence">Réservation récurrente</label></div>
                    {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}><label>Jusqu'au :</label><input type="date" className="form-input" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(new Date())} required={formData.recurrence} /></div></div>)}</div>
                    <div className="form-actions"><button type="button" className="cancel-button" onClick={() => setSelections([])}>Annuler</button><button type="submit" className="submit-button" disabled={isSubmitting}>Valider</button></div>
                </form>
            </div>
          ) : (
            hoveredSalle ? (
              <>
                <SalleCard salle={hoveredSalle} />
                <div className="no-selection-message desktop-legend"><p>👆 Sélectionnez un ou plusieurs créneaux pour commencer votre réservation</p></div>
              </>
            ) : (
              <>
                <ColorLegend onHoverColor={setHoveredObjet} />
                <div className="no-selection-message desktop-legend"><p>👆 Sélectionnez un ou plusieurs créneaux pour commencer votre réservation</p></div>
              </>
            )
          )}
        </div>
      </div>

      {hoveredReservation && (
        <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{position:'fixed', left:popupPosition.x, top:popupPosition.y, transform:'translate(-50%, -100%)', zIndex:10001}}>
          <div className="popup-card-header"><span className="popup-icon">👤</span><span className="popup-name">{hoveredReservation.prenom} {hoveredReservation.nom}</span></div>
          <div className="popup-card-body">
            {hoveredReservation.email && <div className="popup-info-line"><span className="popup-info-icon">📧</span><span className="popup-info-text">{hoveredReservation.email}</span></div>}
            {hoveredReservation.service && <div className="popup-info-line"><span className="popup-info-icon">🏢</span><span className="popup-info-text">{hoveredReservation.service}</span></div>}
            <div className="popup-info-line"><span className="popup-info-icon">📅</span><span className="popup-info-text">{new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}</span></div>
            {(hoveredReservation.salle.includes('Conseil') || hoveredReservation.salle.includes('Mariages')) && (<>{hoveredReservation.agencement && (<div className="popup-info-line"><span className="popup-info-icon">🪑</span><span className="popup-info-text">Disposition : {hoveredReservation.agencement}</span></div>)}{hoveredReservation.nbPersonnes && (<div className="popup-info-line"><span className="popup-info-icon">👥</span><span className="popup-info-text">{hoveredReservation.nbPersonnes} pers.</span></div>)}</>)}
          </div>
        </div>
      )}

      {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><h2>Fermé</h2><p>Dimanche/Férié fermé.</p><button className="blocked-close-button" onClick={() => setBlockedDayModal(false)}>Fermer</button></div></div>}
      {adminPasswordModal.show && <div className="modal-overlay"><div className="modal-content"><h3>Admin</h3><input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" /><div className="modal-footer"><button className="cancel-button" onClick={() => setAdminPasswordModal({show:false, password:''})}>Annuler</button><button className="submit-button" onClick={handleAdminPasswordSubmit}>Valider</button></div></div></div>}
      {successModal.show && (<div className="success-modal-overlay" onClick={() => setSuccessModal({show:false, reservations:[], message:''})}><div className="success-modal" onClick={e => e.stopPropagation()}><div className="success-modal-header"><h2>{successModal.reservations.length > 1 ? "Réservations confirmées !" : "Réservation confirmée !"}</h2></div><div className="success-modal-body"><p className="success-subtitle"><b>{successModal.reservations.length} {successModal.reservations.length > 1 ? "créneaux confirmés" : "créneau confirmé"}</b></p><div className="reservations-list">{successModal.reservations.map((res, i) => (<div key={i} className="reservation-item-success"><span className="calendar-icon">📅 </span>{res.salle.split(' - ')[0]} - {new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin}</div>))}</div><div className="ical-download-section"><button className="download-ical-button" onClick={(e) => { e.stopPropagation(); icalService.generateAndDownload(successModal.reservations); }}>📥 Télécharger le fichier .ics</button></div></div><div className="success-modal-footer"><button className="close-modal-button" onClick={() => setSuccessModal({show:false, reservations:[], message:''})}>Fermer</button></div></div></div>)}
      {warningModal.show && <div className="modal-overlay"><div className="warning-modal"><div className="warning-modal-header"><h2>⚠️ Attention !</h2></div><div className="warning-modal-body"><p>{warningModal.conflicts.length > 1 ? "Les dates suivantes..." : "La date suivante..."}</p><ul className="conflict-list">{warningModal.conflicts.map((res, i) => (<li key={i}>{new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin}</li>))}</ul><p>Voulez-vous quand même poursuivre ?</p></div><div className="warning-modal-footer"><button className="cancel-button" onClick={() => setWarningModal({ show: false, conflicts: [], validReservations: [] })}>Non, annuler</button><button className="submit-button" onClick={() => finalizeReservation(warningModal.validReservations)}>Oui, poursuivre</button></div></div></div>}
    </div>
    </>
  );
}

export default ReservationGrid;