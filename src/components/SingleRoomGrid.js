// src/components/SingleRoomGrid.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
import { HORAIRES, SERVICES, OBJETS_RESERVATION, JOURS_FERIES, COULEURS_OBJETS, SALLES_ADMIN_ONLY, ADMINISTRATEURS } from '../config/googleSheets';
import { getSalleData, sallesData } from '../data/sallesData';
import SalleCard from './SalleCard';
import './SingleRoomGrid.css';

function SingleRoomGrid({ selectedRoom, onBack, onSuccess }) {
  const getMondayOfWeek = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); const monday = new Date(date.setDate(diff)); monday.setHours(0, 0, 0, 0); return monday; };
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  // État pour l'animation de dissolution
  const [isFading, setIsFading] = useState(false);

  const [blockedDayModal, setBlockedDayModal] = useState(false);
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  const [successModal, setSuccessModal] = useState({ show: false, reservations: [], message: '' });
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [] });
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '', agencement: '', nbPersonnes: '' });
  const salleData = getSalleData(selectedRoom);
  const salleInfo = sallesData.find(s => s.nom === salleData?.nom);
  const dispositions = salleInfo?.dispositions || null;
  useEffect(() => { loadWeekReservations(); }, [currentWeekStart, selectedRoom]);
  const loadWeekReservations = async () => { setLoading(true); try { const allReservations = await googleSheetsService.getAllReservations(); const weekEnd = new Date(currentWeekStart); weekEnd.setDate(currentWeekStart.getDate() + 6); const filtered = allReservations.filter(res => { const resSalleName = res.salle.split(' - ')[0]; if (resSalleName !== selectedRoom && res.salle !== selectedRoom) return false; if (res.statut === 'cancelled') return false; const resDate = new Date(res.dateDebut); return resDate >= currentWeekStart && resDate <= weekEnd; }); setReservations(filtered); } catch (error) { console.error('Erreur chargement:', error); } setLoading(false); };
  const isAdminOnlyRoom = (room) => SALLES_ADMIN_ONLY.includes(room);
  const handleAdminPasswordSubmit = () => { if (adminPasswordModal.password === 'Maurepas2025') { setIsAdminUnlocked(true); setAdminPasswordModal({ show: false, password: '' }); } else { alert('❌ Mot de passe incorrect'); setAdminPasswordModal({ ...adminPasswordModal, password: '' }); } };
  const getDates = () => { const dates = []; for (let i = 0; i < 7; i++) { const date = new Date(currentWeekStart); date.setDate(currentWeekStart.getDate() + i); dates.push(date); } return dates; };
  const dates = getDates();
  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const timeSlots = []; for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) { timeSlots.push(h); }
  const formatWeekRange = () => { const start = currentWeekStart; const end = new Date(currentWeekStart); end.setDate(currentWeekStart.getDate() + 6); return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ${start.getFullYear()}`; };
  const handlePreviousWeek = () => { const d = new Date(currentWeekStart); d.setDate(currentWeekStart.getDate() - 7); setCurrentWeekStart(d); };
  const handleNextWeek = () => { const d = new Date(currentWeekStart); d.setDate(currentWeekStart.getDate() + 7); setCurrentWeekStart(d); };
  const handlePreviousMonth = () => { const d = new Date(currentWeekStart); d.setMonth(d.getMonth() - 1); setCurrentWeekStart(getMondayOfWeek(d)); };
  const handleNextMonth = () => { const d = new Date(currentWeekStart); d.setMonth(d.getMonth() + 1); setCurrentWeekStart(getMondayOfWeek(d)); };
  const handleCurrentWeek = () => { setCurrentWeekStart(getMondayOfWeek(new Date())); };
  const isJourFerie = (date) => JOURS_FERIES.includes(googleSheetsService.formatDate(date));
  const isDimanche = (date) => date.getDay() === 0;
  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };
  const isSlotReserved = (dayIndex, slotStart) => { const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = googleSheetsService.formatDate(date); return reservations.some(res => { if (res.dateDebut !== dateStr) return false; const resStart = googleSheetsService.timeToFloat(res.heureDebut); const resEnd = googleSheetsService.timeToFloat(res.heureFin); return (slotStart < resEnd && slotEnd > resStart); }); };
  const getReservation = (dayIndex, slotStart) => { const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = googleSheetsService.formatDate(date); return reservations.find(res => { if (res.dateDebut !== dateStr) return false; const resStart = googleSheetsService.timeToFloat(res.heureDebut); const resEnd = googleSheetsService.timeToFloat(res.heureFin); return (slotStart < resEnd && slotEnd > resStart); }); };
  const isSlotSelected = (dayIndex, slot) => selections.some(sel => sel.dayIndex === dayIndex && sel.hour === slot);
  const handleMouseDown = (dayIndex, hour, date) => { if (isDateInPast(date)) return; if (isDimanche(date) || isJourFerie(date)) { setBlockedDayModal(true); return; } if (isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked) { setAdminPasswordModal({ show: true, password: '' }); return; } if (isSlotReserved(dayIndex, hour)) return; setIsDragging(false); setDragStart({ dayIndex, hour }); setMouseDownPos({ dayIndex, hour, date }); };
  const handleMouseEnter = (dayIndex, hour, date) => { if (!dragStart) return; if (!isDragging && mouseDownPos) { if (dayIndex !== mouseDownPos.dayIndex || hour !== mouseDownPos.hour) setIsDragging(true); else return; } if (!isDragging) return; if (isSlotReserved(dayIndex, hour) || isDimanche(date) || isJourFerie(date) || isDateInPast(date)) return; const newSelections = [...selections]; const minDay = Math.min(dragStart.dayIndex, dayIndex); const maxDay = Math.max(dragStart.dayIndex, dayIndex); const minHour = Math.min(dragStart.hour, hour); const maxHour = Math.max(dragStart.hour, hour); for (let d = minDay; d <= maxDay; d++) { const dayDate = dates[d]; if (!isDimanche(dayDate) && !isJourFerie(dayDate) && !isDateInPast(dayDate)) { for (let h = minHour; h <= maxHour; h += 0.5) { const exists = newSelections.some(sel => sel.dayIndex === d && sel.hour === h); if (!exists && !isSlotReserved(d, h)) newSelections.push({ dayIndex: d, hour: h, date: dates[d] }); } } } setSelections(newSelections); };
  const handleMouseUp = () => { if (!isDragging && mouseDownPos) { const { dayIndex, hour, date } = mouseDownPos; const alreadySelected = selections.some(sel => sel.dayIndex === dayIndex && sel.hour === hour); if (alreadySelected) { const newSelections = selections.filter(sel => !(sel.dayIndex === dayIndex && sel.hour === hour)); setSelections(newSelections); if (newSelections.length === 0) setShowForm(false); } else { setSelections([...selections, { dayIndex, hour, date }]); setShowForm(true); } } else if (isDragging && selections.length > 0) setShowForm(true); setIsDragging(false); setDragStart(null); setMouseDownPos(null); };
  const handleCancelSelection = () => { setSelections([]); setShowForm(false); setFormData({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '', agencement: '', nbPersonnes: '' }); };
  const removeSelection = (index) => { const newSelections = selections.filter((_, i) => i !== index); setSelections(newSelections); if (newSelections.length === 0) setShowForm(false); };
  const preMergeSelections = (selections) => { const byDate = {}; selections.forEach(sel => { const dateKey = sel.date instanceof Date ? sel.date.toISOString().split('T')[0] : sel.date; if (!byDate[dateKey]) byDate[dateKey] = []; byDate[dateKey].push(sel); }); const merged = []; for (const dateKey in byDate) { const slots = byDate[dateKey].sort((a, b) => a.hour - b.hour); let i = 0; while (i < slots.length) { const current = { date: slots[i].date, hour: slots[i].hour, endHour: slots[i].hour + 0.5 }; while (i + 1 < slots.length && Math.abs(current.endHour - slots[i + 1].startHour) < 0.001) { current.endHour = slots[i + 1].hour + 0.5; i++; } merged.push(current); i++; } } return merged; };
  const generateRecurrenceDates = (startDate, endDate, type) => { const dates = []; const current = new Date(startDate); const end = new Date(endDate); if (type === 'monthly') current.setMonth(current.getMonth() + 1); else if (type === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); while (current <= end) { dates.push(new Date(current)); if (type === 'monthly') current.setMonth(current.getMonth() + 1); else if (type === 'biweekly') current.setDate(current.getDate() + 14); else current.setDate(current.getDate() + 7); } return dates; };
  const checkConflicts = (candidates, allExistingReservations) => { const conflicts = []; const valid = []; candidates.forEach(candidate => { const candidateStart = new Date(`${candidate.dateDebut}T${candidate.heureDebut}`); const candidateEnd = new Date(`${candidate.dateFin}T${candidate.heureFin}`); const hasConflict = allExistingReservations.some(existing => { if (existing.statut === 'cancelled') return false; if (existing.salle !== candidate.salle && existing.salle.split(' - ')[0] !== candidate.salle) return false; const existingStart = new Date(`${existing.dateDebut}T${existing.heureDebut}`); const existingEnd = new Date(`${existing.dateFin || existing.dateDebut}T${existing.heureFin}`); return (candidateStart < existingEnd && candidateEnd > existingStart); }); if (hasConflict) conflicts.push(candidate); else valid.push(candidate); }); return { conflicts, valid }; };
  const finalizeReservation = async (reservationsToSave) => { setIsSubmitting(true); setSubmissionProgress({ current: 0, total: reservationsToSave.length }); setWarningModal({ show: false, conflicts: [], validReservations: [] }); try { const createdReservations = []; for (const res of reservationsToSave) { const result = await googleSheetsService.addReservation(res); createdReservations.push({ ...res, id: result.id }); setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 })); } setSuccessModal({ show: true, reservations: createdReservations, message: '✅ Réservation confirmée !' }); setSelections([]); setShowForm(false); loadWeekReservations(); } catch (error) { alert('Erreur: ' + error.message); } finally { setIsSubmitting(false); } };
  
  const handleFormSubmit = async (e) => { 
    e.preventDefault();
    
    // --- VALIDATION AGENCEMENT ET CAPACITÉ ---
    const isConseil = selectedRoom.includes('Conseil');
    const isMariages = selectedRoom.includes('Mariages');

    if (isConseil || isMariages) {
        if (!formData.agencement) return alert('⚠️ Veuillez choisir une disposition.');
        if (!formData.nbPersonnes) return alert('⚠️ Veuillez indiquer le nombre de personnes.');
        
        const nb = parseInt(formData.nbPersonnes, 10);
        const max = isMariages ? 30 : 100;
        
        if (nb > max) {
          return alert(`⚠️ La capacité maximale pour la salle ${isMariages ? 'des Mariages' : 'du Conseil'} est de ${max} personnes.`);
        }
    }
    // ------------------------------------------

    setIsSubmitting(true); try { const mergedSelections = preMergeSelections(selections); let allCandidates = []; mergedSelections.forEach(sel => { const dateStr = googleSheetsService.formatDate(sel.date); const baseRes = { salle: selectedRoom, service: formData.service, nom: formData.nom, prenom: formData.prenom, email: formData.email, telephone: formData.telephone, dateDebut: dateStr, dateFin: dateStr, heureDebut: googleSheetsService.formatTime(sel.hour), heureFin: googleSheetsService.formatTime(sel.endHour), objet: formData.objet, description: formData.description, recurrence: formData.recurrence ? 'OUI' : 'NON', recurrenceJusquau: formData.recurrenceJusquau, agencement: formData.agencement || '', nbPersonnes: formData.nbPersonnes, statut: 'active' }; allCandidates.push(baseRes); if (formData.recurrence && formData.recurrenceJusquau) { const selDateObj = sel.date instanceof Date ? sel.date : new Date(sel.date); const dates = generateRecurrenceDates(selDateObj, new Date(formData.recurrenceJusquau), formData.recurrenceType); dates.forEach(date => { const dateRecurStr = googleSheetsService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); }); } }); const allExisting = await googleSheetsService.getAllReservations(); const { conflicts, valid } = checkConflicts(allCandidates, allExisting); setIsSubmitting(false); if (conflicts.length > 0) { setWarningModal({ show: true, conflicts, validReservations: valid }); } else { await finalizeReservation(valid); } } catch (error) { alert('Erreur: ' + error.message); setIsSubmitting(false); } 
  };
  
  const mergedForDisplay = selections.length > 0 ? preMergeSelections(selections) : [];
  const successModalContent = successModal.show ? ( <div className="success-modal-overlay" onClick={() => setSuccessModal({ ...successModal, show: false })} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '70px' }}> <div className="success-modal" onClick={e => e.stopPropagation()}> <div className="success-modal-header"><h2>{successModal.reservations.length > 1 ? "Réservations confirmées !" : "Réservation confirmée !"}</h2></div> <div className="success-modal-body"> <p className="success-subtitle"><b>{successModal.reservations.length} {successModal.reservations.length > 1 ? "créneaux confirmés" : "créneau confirmé"}</b></p> <div className="reservations-list"> {successModal.reservations.map((res, i) => ( <div key={i} className="reservation-item-success"> <span className="calendar-icon">📅</span> {res.salle.split(' - ')[0]} - {new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin} </div> ))} </div> <div className="ical-download-section"> <button className="download-ical-button" onClick={() => icalService.generateAndDownload(successModal.reservations)}>📥 Télécharger .ics</button> </div> </div> <div className="success-modal-footer"><button className="close-modal-button" onClick={() => setSuccessModal({ ...successModal, show: false })}>Fermer</button></div> </div> </div> ) : null;

  // --- GESTION DU TIMER DE DISPARITION (4 SECONDES) ---
  useEffect(() => {
    let fadeTimer;
    let removeTimer;

    if (hoveredReservation) {
      setIsFading(false); // Reset

      fadeTimer = setTimeout(() => {
        setIsFading(true); // Fade out start
        removeTimer = setTimeout(() => {
          setHoveredReservation(null);
          setIsFading(false);
        }, 400); // Wait for transition
      }, 4000); // 4 sec delay
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [hoveredReservation]);

  return (
    <>
      {successModal.show && createPortal(successModalContent, document.body)}
      <div className="single-room-container">
        <div className="week-navigation">
          <div className="nav-group-left">
            <button onClick={onBack} className="back-button-inline">← Retour</button>
            <h2 className="room-title-inline">🏛️ {salleData?.nom || selectedRoom}</h2>
          </div>
          <div className="nav-group-center">
            <button className="week-nav-btn" onClick={handlePreviousMonth}>◀◀</button>
            <button className="week-nav-btn" onClick={handlePreviousWeek}>◀</button>
            <button className="week-nav-btn" style={{padding: '0.6rem 1.2rem', fontSize: '0.9rem'}} onClick={handleCurrentWeek}>Cette semaine</button>
            <h3 className="week-date-display">{formatWeekRange()}</h3>
            <button className="week-nav-btn" onClick={handleNextWeek}>▶</button>
            <button className="week-nav-btn" onClick={handleNextMonth}>▶▶</button>
          </div>
          <div className="nav-group-right-spacer"></div>
        </div>

        {/* INSTRUCTION MOBILE AJOUTÉE (Caché sur Desktop via CSS) */}
        <div className="mobile-instruction">
          <p>Cliquez sur un créneau pour le sélectionner</p>
        </div>

        <div className="single-room-layout">
          <div className="room-sidebar">
            {!showForm && (
              <>
                <SalleCard salle={selectedRoom} />
                {/* INSTRUCTION BUREAU (Caché sur Mobile via CSS) */}
                <div className="no-selection-message desktop-legend"><p>👆 Sélectionnez un ou plusieurs créneaux pour commencer votre réservation</p></div>
              </>
            )}
            {showForm && selections.length > 0 && (
              <div className="room-form-container">
                <h3 className="form-title">{selections.length > 1 ? `Réservation de ${selections.length} créneaux` : 'Confirmer la réservation'}</h3>
                <div className="selections-summary">
                  {mergedForDisplay.map((sel, idx) => (
                    <div key={idx} className="selection-item">{googleSheetsService.formatDate(sel.date)} : {googleSheetsService.formatTime(sel.hour)} - {googleSheetsService.formatTime(sel.endHour)}<button className="remove-selection-btn" onClick={() => removeSelection(idx)}>✕</button></div>
                  ))}
                </div>
                <form onSubmit={handleFormSubmit} className="room-form">
                  <div className="form-row"><input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} /><input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} /></div>
                  <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                  <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Choisissez le service...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required><option value="">Choisissez l'objet...</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  {dispositions && (
                    <>
                      {/* VALIDATION: Ajout de 'required' */}
                      <select className="form-select disposition-select" value={formData.agencement} onChange={e => setFormData({...formData, agencement: e.target.value})} required><option value="">Disposition souhaitée *</option>{dispositions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      {/* VALIDATION: Ajout de 'required', 'min' et 'max' dynamique */}
                      {(selectedRoom.includes('Conseil') || selectedRoom.includes('Mariages')) && <input type="number" className="form-input" placeholder={`Nombre de personnes prévues (max ${selectedRoom.includes('Mariages') ? 30 : 100}) *`} value={formData.nbPersonnes} onChange={e => setFormData({...formData, nbPersonnes: e.target.value})} required min="1" max={selectedRoom.includes('Mariages') ? 30 : 100} />}
                    </>
                  )}
                  <textarea className="form-textarea" placeholder="Description (facultative)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  <div className="recurrence-section-styled"><div className="recurrence-box"><input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} /><label>Réservation récurrente</label></div>
                  {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}><label>Jusqu'au :</label><input type="date" className="form-input" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(new Date())} required={formData.recurrence} /></div></div>)}</div>
                  <div className="form-actions"><button type="button" className="btn-cancel" onClick={handleCancelSelection}>Annuler</button><button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button></div>
                </form>
              </div>
            )}
          </div>
          <div className="week-grid-container">
            <table className="week-grid" onMouseLeave={() => { /* Rien ici */ }} onMouseUp={handleMouseUp}>
              <thead>
                <tr>
                  <th className="hour-header">Heure</th>
                  {dates.map((date, idx) => (
                    <th key={idx} className="day-header">
                      <div className="day-name">
                        <span className="name-full">{weekDays[idx]}</span>
                        <span className="name-short">{weekDays[idx].slice(0, 3)}</span>
                      </div>
                      <div className="day-date">{date.getDate()}/{date.getMonth() + 1}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{timeSlots.map(slot => (
                <tr key={slot}>
                  <td className={slot % 1 === 0 ? 'hour-cell-full' : 'hour-cell-half'}>
                    {slot % 1 === 0 ? `${slot}h` : ''}
                  </td>
                  {dates.map((date, dayIndex) => { 
                    const reserved = isSlotReserved(dayIndex, slot); 
                    const selected = isSlotSelected(dayIndex, slot); 
                    const blocked = isDimanche(date) || isJourFerie(date); 
                    const past = isDateInPast(date); 
                    const reservation = getReservation(dayIndex, slot); 
                    const isFullHour = slot % 1 === 0;
                    
                    let bgStyle = {}; 
                    if (reserved && reservation) bgStyle.backgroundColor = COULEURS_OBJETS[reservation.objet] || '#ccc'; 
                    
                    let cellClass = `time-slot`;
                    cellClass += isFullHour ? ' full-hour-border' : ' half-hour-border';
                    
                    if (reserved) cellClass += ' occupied';
                    if (selected) cellClass += ' selected';
                    if (blocked) cellClass += ' blocked';
                    if (past) cellClass += ' past-date';
                    if (slot >= 12 && slot < 14) cellClass += ' lunch-break';

                    return (
                      <td 
                        key={`${dayIndex}-${slot}`} 
                        className={cellClass} 
                        style={bgStyle} 
                        onMouseDown={() => handleMouseDown(dayIndex, slot, date)} 
                        onMouseEnter={(e) => { 
                          handleMouseEnter(dayIndex, slot, date); 
                          if (reserved && reservation) { 
                            const rect = e.currentTarget.getBoundingClientRect(); 
                            setHoveredReservation(reservation); 
                            // MODIFICATION : POSITIONNEMENT RELATIF À LA SOURIS (Base à 50px au-dessus)
                            setPopupPosition({ x: e.clientX, y: e.clientY - 50 }); 
                          } 
                        }} 
                        // On retire le onMouseLeave ici pour laisser le timer gérer
                      >
                      </td>
                    ); 
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        
        {hoveredReservation && (
          // CLASSE DYNAMIQUE POUR L'ANIMATION DE DISPARITION
          <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{position:'fixed', left:popupPosition.x, top:popupPosition.y, transform:'translate(-50%, -100%)', zIndex:10001}}>
            <div className="popup-card-header"><span className="popup-icon">👤</span><span className="popup-name">{hoveredReservation.prenom} {hoveredReservation.nom}</span></div>
            <div className="popup-card-body">{hoveredReservation.email && <div className="popup-info-line"><span className="popup-info-icon">📧</span><span className="popup-info-text">{hoveredReservation.email}</span></div>}{hoveredReservation.service && <div className="popup-info-line"><span className="popup-info-icon">🏢</span><span className="popup-info-text">{hoveredReservation.service}</span></div>}<div className="popup-info-line"><span className="popup-info-icon">📅</span><span className="popup-info-text">{new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}</span></div>{(hoveredReservation.salle.includes('Conseil') || hoveredReservation.salle.includes('Mariages')) && (<>{hoveredReservation.agencement && (<div className="popup-info-line"><span className="popup-info-icon">🪑</span><span className="popup-info-text">Disposition : {hoveredReservation.agencement}</span></div>)}{hoveredReservation.nbPersonnes && (<div className="popup-info-line"><span className="popup-info-icon">👥</span><span className="popup-info-text">{hoveredReservation.nbPersonnes} pers.</span></div>)}</>)}</div>
          </div>
        )}
        
        {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><h2>Fermé</h2><p>Dimanche/Férié fermé.</p><button className="blocked-close-button" onClick={() => setBlockedDayModal(false)}>Fermer</button></div></div>}
        {adminPasswordModal.show && <div className="modal-overlay"><div className="modal-content"><h3>Admin</h3><input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" /><button className="btn-submit" onClick={handleAdminPasswordSubmit}>Valider</button></div></div>}
        {isSubmitting && <div className="modal-overlay"><div className="modal-content"><h3>Enregistrement...</h3><div className="progress-bar-container" style={{width:'100%', height:'10px', background:'#eee', borderRadius:'5px', margin:'1rem 0', overflow:'hidden'}}><div style={{width: `${(submissionProgress.current / submissionProgress.total) * 100}%`, height:'100%', background:'#4caf50', transition:'width 0.3s'}}></div></div><p>{submissionProgress.current} / {submissionProgress.total} créneaux traités</p></div></div>}
        {warningModal.show && <div className="modal-overlay"><div className="warning-modal"><div className="warning-modal-header"><h2>⚠️ Attention !</h2></div><div className="warning-modal-body"><p>{warningModal.conflicts.length > 1 ? "Les dates suivantes..." : "La date suivante..."}</p><ul className="conflict-list">{warningModal.conflicts.map((res, i) => (<li key={i}>{new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin}</li>))}</ul><p>Voulez-vous quand même poursuivre ?</p></div><div className="warning-modal-footer"><button className="cancel-button" onClick={() => setWarningModal({ show: false, conflicts: [], validReservations: [] })}>Non, annuler</button><button className="submit-button" onClick={() => finalizeReservation(warningModal.validReservations)}>Oui, poursuivre</button></div></div></div>}
      </div>
    </>
  );
}

export default SingleRoomGrid;