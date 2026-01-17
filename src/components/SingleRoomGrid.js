// src/components/SingleRoomGrid.js
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
import emailService from '../services/emailService';
import { HORAIRES, SERVICES, OBJETS_RESERVATION, JOURS_FERIES, COULEURS_OBJETS, SALLES_ADMIN_ONLY, APP_CONFIG } from '../config/googleSheets';
import { getSalleData, sallesData } from '../data/sallesData';
import SalleCard from './SalleCard';
import './SingleRoomGrid.css';

function SingleRoomGrid({ selectedRoom, editingReservation, onBack, onSuccess }) {
  
  const getMondayOfWeek = (d) => { 
    const date = new Date(d); 
    const day = date.getDay(); 
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(date.setDate(diff)); 
    monday.setHours(0, 0, 0, 0); 
    return monday; 
  };

  const getInitialStartDate = () => {
    const today = new Date();
    if (editingReservation) return getMondayOfWeek(new Date(editingReservation.dateDebut));
    if (today.getDay() === 0) { 
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return getMondayOfWeek(tomorrow);
    }
    return getMondayOfWeek(today);
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getInitialStartDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [hasClearedEditingSelection, setHasClearedEditingSelection] = useState(false);

  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const sidebarRef = useRef(null);
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

  const isAdminOnlyRoom = (room) => {
    if (!room) return false;
    return SALLES_ADMIN_ONLY.some(adminRoom => room.includes(adminRoom) || adminRoom.includes(room));
  };

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

  useEffect(() => { loadWeekReservations(); }, [currentWeekStart, selectedRoom, editingReservation]);

  const loadWeekReservations = async () => { 
    setLoading(true); 
    try { 
      const allReservations = await googleSheetsService.getAllReservations(); 
      const weekEnd = new Date(currentWeekStart); 
      weekEnd.setDate(currentWeekStart.getDate() + 6); 
      
      const filtered = allReservations.filter(res => { 
        const resSalleName = res.salle.split(' - ')[0]; 
        if (resSalleName !== selectedRoom && res.salle !== selectedRoom) return false; 
        if (res.statut === 'cancelled') return false; 
        if (editingReservation && res.id === editingReservation.id) return false;
        const resDate = new Date(res.dateDebut); 
        return resDate >= currentWeekStart && resDate <= weekEnd; 
      }); 
      setReservations(filtered); 
    } catch (error) { console.error('Erreur chargement:', error); } 
    setLoading(false); 
  };
  
  const handleAdminPasswordSubmit = () => { 
    if (adminPasswordModal.password === APP_CONFIG.ADMIN_PASSWORD) { 
      setIsAdminUnlocked(true); 
      setAdminPasswordModal({ show: false, password: '' }); 
    } else { 
      alert('❌ Mot de passe incorrect'); 
      setAdminPasswordModal({ ...adminPasswordModal, password: '' }); 
    } 
  };

  const getDates = () => { const dates = []; for (let i = 0; i < 7; i++) { const date = new Date(currentWeekStart); date.setDate(currentWeekStart.getDate() + i); dates.push(date); } return dates; };
  const dates = getDates();
  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const timeSlots = []; for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h += 0.5) { timeSlots.push(h); }
  
  const handlePreviousWeek = () => { const d = new Date(currentWeekStart); d.setDate(currentWeekStart.getDate() - 7); setCurrentWeekStart(d); };
  const handleNextWeek = () => { const d = new Date(currentWeekStart); d.setDate(currentWeekStart.getDate() + 7); setCurrentWeekStart(d); };
  const handleCurrentWeek = () => { setCurrentWeekStart(getInitialStartDate()); };
  const handlePreviousMonth = () => { const d = new Date(currentWeekStart); d.setMonth(d.getMonth() - 1); setCurrentWeekStart(getMondayOfWeek(d)); };
  const handleNextMonth = () => { const d = new Date(currentWeekStart); d.setMonth(d.getMonth() + 1); setCurrentWeekStart(getMondayOfWeek(d)); };

  const isJourFerie = (date) => JOURS_FERIES.includes(googleSheetsService.formatDate(date));
  const isDimanche = (date) => date.getDay() === 0;
  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };
  
  const isSlotReserved = (dayIndex, slotStart) => { 
    const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = googleSheetsService.formatDate(date); 
    return reservations.some(res => { 
      if (res.dateDebut !== dateStr) return false; 
      const resStart = googleSheetsService.timeToFloat(res.heureDebut); 
      const resEnd = googleSheetsService.timeToFloat(res.heureFin); 
      return (slotStart < resEnd && slotEnd > resStart); 
    }); 
  };
  
  const getReservation = (dayIndex, slotStart) => { 
    const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = googleSheetsService.formatDate(date); 
    return reservations.find(res => { 
      if (res.dateDebut !== dateStr) return false; 
      const resStart = googleSheetsService.timeToFloat(res.heureDebut); 
      const resEnd = googleSheetsService.timeToFloat(res.heureFin); 
      return (slotStart < resEnd && slotEnd > resStart); 
    }); 
  };

  const isSlotSelected = (dayIndex, slot) => selections.some(sel => sel.dayIndex === dayIndex && sel.hour === slot);
  
  const handleMouseDown = (dayIndex, hour, date, event) => {
    if (isDimanche(date) || isJourFerie(date)) { setBlockedDayModal(true); return; }
    
    const dateStr = googleSheetsService.formatDate(date);
    const reservation = reservations.find(r => 
      r.salle.includes(selectedRoom.split(' - ')[0]) && 
      r.dateDebut === dateStr &&
      hour >= googleSheetsService.timeToFloat(r.heureDebut) && 
      hour < googleSheetsService.timeToFloat(r.heureFin)
    );
    
    if (reservation) {
      setHoveredReservation(reservation);
      setPopupPosition({ x: event.clientX, y: event.clientY });
      return;
    }
    
    if (isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked) { setAdminPasswordModal({ show: true, password: '' }); return; }
    if (isDateInPast(date)) return;
    
    if (editingReservation && !hasClearedEditingSelection) {
      setSelections([]);
      setHasClearedEditingSelection(true); 
    }

    setDragStart({ dayIndex, hour });
    setMouseDownPos({ dayIndex, hour, date });
  };

  const handleMouseEnter = (dayIndex, hour, date) => {
    if (!dragStart) return;
    let justStartedDragging = false;
    if (!isDragging && mouseDownPos) {
      if (dayIndex !== mouseDownPos.dayIndex || hour !== mouseDownPos.hour) {
        setIsDragging(true); justStartedDragging = true;
      } else { return; }
    }
    if (!isDragging && !justStartedDragging) return;
    if (isSlotReserved(dayIndex, hour) || isDimanche(date) || isJourFerie(date) || isDateInPast(date)) return;
    
    const newSelections = [...selections];
    const minDay = Math.min(dragStart.dayIndex, dayIndex);
    const maxDay = Math.max(dragStart.dayIndex, dayIndex);
    const minHour = Math.min(dragStart.hour, hour);
    const maxHour = Math.max(dragStart.hour, hour);
    
    for (let d = minDay; d <= maxDay; d++) {
      const dayDate = dates[d];
      if (!isDimanche(dayDate) && !isJourFerie(dayDate) && !isDateInPast(dayDate)) {
        for (let h = minHour; h <= maxHour; h += 0.5) {
          const exists = newSelections.some(sel => sel.dayIndex === d && sel.hour === h);
          if (!exists && !isSlotReserved(d, h)) {
            newSelections.push({ dayIndex: d, hour: h, date: dates[d] });
          }
        }
      }
    }
    setSelections(newSelections);
  };
  
  const handleMouseUp = () => { 
    if (!isDragging && mouseDownPos) { 
      const { dayIndex, hour, date } = mouseDownPos; 
      const alreadySelected = selections.some(sel => sel.dayIndex === dayIndex && sel.hour === hour); 
      if (alreadySelected) { 
        const newSelections = selections.filter(sel => !(sel.dayIndex === dayIndex && sel.hour === hour)); 
        setSelections(newSelections); 
        if (newSelections.length === 0) setShowForm(false); 
      } else { 
        setSelections([...selections, { dayIndex, hour, date }]); 
        setShowForm(true);
      } 
    } else if (isDragging && selections.length > 0) {
      setShowForm(true);
    }
    setIsDragging(false); setDragStart(null); setMouseDownPos(null); 
  };

  const handleCancelSelection = () => { setSelections([]); setShowForm(false); setFormData({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '', agencement: '', nbPersonnes: '' }); };
  
  const removeSelection = (index) => {
    const toRemove = mergedForDisplay[index];
    const selectionsToRemove = selections.filter(sel => sel.date && toRemove.date && sel.date.getTime() === toRemove.date.getTime() && sel.hour >= toRemove.hour && sel.hour < toRemove.endHour);
    const newSelections = selections.filter(sel => !selectionsToRemove.some(remove => sel.date && remove.date && sel.date.getTime() === remove.date.getTime() && Math.abs(sel.hour - remove.hour) < 0.01));
    setSelections(newSelections);
    if (newSelections.length === 0) setShowForm(false);
  };

  const preMergeSelections = (selections) => {
    if (selections.length === 0) return [];
    const byDate = {};
    selections.forEach(sel => {
      const dateKey = sel.date instanceof Date ? sel.date.toISOString().split('T')[0] : sel.date;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(sel);
    });
    const merged = [];
    for (const dateKey in byDate) {
      const slots = byDate[dateKey].sort((a, b) => a.hour - b.hour);
      let i = 0;
      while (i < slots.length) {
        const current = { date: slots[i].date, dayIndex: slots[i].dayIndex, hour: slots[i].hour, endHour: slots[i].hour + 0.5 };
        while (i + 1 < slots.length && Math.abs(current.endHour - slots[i + 1].hour) < 0.01) {
          current.endHour = slots[i + 1].hour + 0.5; i++;
        }
        merged.push(current); i++;
      }
    }
    return merged;
  };

  const generateRecurrenceDates = (startDate, endDate, type) => { 
    const dates = []; const current = new Date(startDate); const end = new Date(endDate); 
    if (type === 'monthly') current.setMonth(current.getMonth() + 1); 
    else if (type === 'biweekly') current.setDate(current.getDate() + 14); 
    else current.setDate(current.getDate() + 7); 
    while (current <= end) { 
        dates.push(new Date(current)); 
        if (type === 'monthly') current.setMonth(current.getMonth() + 1); 
        else if (type === 'biweekly') current.setDate(current.getDate() + 14); 
        else current.setDate(current.getDate() + 7); 
    } 
    return dates; 
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
    setWarningModal({ show: false, conflicts: [], validReservations: [] });

    setIsSubmitting(true); setSubmissionProgress({ current: 0, total: reservationsToSave.length }); 
    
    await new Promise(r => setTimeout(r, 10));

    try { 
        const createdReservations = []; 
        for (const res of reservationsToSave) { 
            const result = await googleSheetsService.addReservation(res); 
            createdReservations.push({ ...res, id: result.id }); 
            setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 })); 
            try { await emailService.sendConfirmation(res); } catch(e) { console.error("Mail error", e); }
        } 
        setSuccessModal({ show: true, reservations: createdReservations, message: '✅ Réservation confirmée !' }); 
        setSelections([]); setShowForm(false); loadWeekReservations(); 
    } catch (error) { alert('Erreur: ' + error.message); } 
    finally { setIsSubmitting(false); } 
  };

  const handleFormSubmit = async (e) => { 
    e.preventDefault(); 
    if (editingReservation) {
      try { await googleSheetsService.deleteReservation(editingReservation.id); } 
      catch (err) { alert('Erreur lors de la modification'); return; }
    }
    if (dispositions && !formData.agencement) return alert('⚠️ Veuillez choisir une disposition.'); 
    setIsSubmitting(true); 
    try { 
        const mergedSelections = preMergeSelections(selections); 
        let allCandidates = []; 
        mergedSelections.forEach(sel => { 
            const dateStr = googleSheetsService.formatDate(sel.date); 
            const baseRes = { salle: selectedRoom, service: formData.service, nom: formData.nom, prenom: formData.prenom, email: formData.email, telephone: formData.telephone, dateDebut: dateStr, dateFin: dateStr, heureDebut: googleSheetsService.formatTime(sel.hour), heureFin: googleSheetsService.formatTime(sel.endHour), objet: formData.objet, description: formData.description, recurrence: formData.recurrence ? 'OUI' : 'NON', recurrenceJusquau: formData.recurrenceJusquau, agencement: formData.agencement || '', nbPersonnes: formData.nbPersonnes, statut: 'active' }; 
            allCandidates.push(baseRes); 
            if (formData.recurrence && formData.recurrenceJusquau) { 
                const selDateObj = sel.date instanceof Date ? sel.date : new Date(sel.date); 
                const datesRecur = generateRecurrenceDates(selDateObj, new Date(formData.recurrenceJusquau), formData.recurrenceType); 
                datesRecur.forEach(date => { const dateRecurStr = googleSheetsService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); }); 
            } 
        }); 
        const allExisting = await googleSheetsService.getAllReservations(true); 
        const { conflicts, valid } = checkConflicts(allCandidates, allExisting); 
        
        setIsSubmitting(false); 
        
        if (conflicts.length > 0) { setWarningModal({ show: true, conflicts, validReservations: valid }); } 
        else { await finalizeReservation(valid); } 
    } catch (error) { alert('Erreur: ' + error.message); setIsSubmitting(false); } 
  };

  const mergedForDisplay = selections.length > 0 ? preMergeSelections(selections) : [];

  useEffect(() => {
    if (editingReservation) {
      setFormData({
        nom: editingReservation.nom || '', prenom: editingReservation.prenom || '',
        email: editingReservation.email || '', telephone: editingReservation.telephone || '',
        service: editingReservation.service || '', objet: editingReservation.objet || '',
        description: editingReservation.description || '', recurrence: false,
        recurrenceType: 'weekly', recurrenceJusquau: '',
        agencement: editingReservation.agencement || '', nbPersonnes: editingReservation.nbPersonnes || ''
      });
      const resDate = new Date(editingReservation.dateDebut);
      const dayOfWeek = resDate.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startHour = googleSheetsService.timeToFloat(editingReservation.heureDebut);
      const endHour = googleSheetsService.timeToFloat(editingReservation.heureFin);
      const newSelections = [];
      for (let h = startHour; h < endHour; h += 0.5) {
        newSelections.push({ dayIndex: dayIndex, hour: h, date: resDate });
      }
      setSelections(newSelections);
      setShowForm(true);
      setHasClearedEditingSelection(false); 
    }
  }, [editingReservation]);

  return (
    <>
      {successModal.show && createPortal(
        <div className="success-modal-overlay" onClick={() => setSuccessModal({ ...successModal, show: false })} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '70px' }}>
          <div className="success-modal" onClick={e => e.stopPropagation()}>
            <div className="success-modal-header">
                <h2>{successModal.reservations.length > 1 ? "✅ Réservations confirmées !" : "✅ Réservation confirmée !"}</h2>
            </div>
            <div className="success-modal-body">
              <p className="success-subtitle"><b>{successModal.reservations.length} {successModal.reservations.length > 1 ? "créneaux confirmés" : "créneau confirmé"}</b></p>
              <div className="reservations-list">
                {successModal.reservations.map((res, i) => ( <div key={i} className="reservation-item-success"><span className="calendar-icon">📅</span> {res.salle.split(' - ')[0]} - {new Date(res.dateDebut).toLocaleDateString('fr-FR')} : {res.heureDebut} - {res.heureFin}</div> ))}
              </div>
              
              <div className="ical-info-text" style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center', fontStyle: 'italic'}}>
                {successModal.reservations.length > 1 
                  ? "Intégration dans un agenda parallèle à transférer ensuite dans le votre" 
                  : "Intégration dans votre agenda"}
              </div>

              <div className="ical-download-section"><button className="download-ical-button" onClick={() => icalService.generateAndDownload(successModal.reservations)}>📥 Calendrier iCal</button></div>
            </div>
            
            <div className="success-modal-footer">
                <button className="close-modal-button" onClick={() => setSuccessModal({ ...successModal, show: false })}>Fermer</button>
            </div>
          </div>
        </div>, document.body
      )}

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
            <h3 className="week-date-display">{`${currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - ${new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate()+6)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ${currentWeekStart.getFullYear()}`}</h3>
            <button className="week-nav-btn" onClick={handleNextWeek}>▶</button>
            <button className="week-nav-btn" onClick={handleNextMonth}>▶▶</button>
          </div>
        </div>

        <div className="single-room-layout">
          <div className="room-sidebar" ref={sidebarRef}>
            {!showForm && (<><SalleCard salle={selectedRoom} /><div className="no-selection-message desktop-legend"><p>Sélectionnez un ou plusieurs créneaux pour commencer votre réservation 👆</p></div></>)}
            {showForm && selections.length > 0 && (
              <div className="room-form-container">
                <h3 className="form-title">{selections.length > 1 ? `Réservation de ${selections.length} créneaux` : 'Confirmer la réservation'}</h3>
                <div className="selections-summary">
                  {mergedForDisplay.map((sel, idx) => (<div key={idx} className="selection-item">{googleSheetsService.formatDate(sel.date)} : {googleSheetsService.formatTime(sel.hour)} - {googleSheetsService.formatTime(sel.endHour)}<button className="remove-selection-btn" onClick={() => removeSelection(idx)}>✕</button></div>))}
                </div>
                <form onSubmit={handleFormSubmit} className="room-form">
                  <div className="form-row"><input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} /><input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} /></div>
                  <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                  <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Choisissez le service...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required><option value="">Choisissez l'objet...</option>{OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  {dispositions && (
                    <><select className="form-select disposition-select" value={formData.agencement} onChange={e => setFormData({...formData, agencement: e.target.value})} required><option value="">Disposition souhaitée *</option>{dispositions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    {(selectedRoom.includes('Conseil') || selectedRoom.includes('Mariages')) && <input type="number" className="form-input" placeholder={`Nombre de personnes prévues (max ${selectedRoom.includes('Mariages') ? 30 : 100}) *`} value={formData.nbPersonnes} onChange={e => setFormData({...formData, nbPersonnes: e.target.value})} required min="1" max={selectedRoom.includes('Mariages') ? 30 : 100} />}</>
                  )}
                  <textarea className="form-textarea" placeholder="Description (facultative)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  <div className="recurrence-section-styled"><div className="recurrence-box"><input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} /><label>Réservation récurrente</label></div>
                  {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}>
                    {/* ✅ CORRECTION : Date min = date de la première sélection */}
                    <input type="date" className="form-input" placeholder="JJ/MM/AAAA" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(mergedForDisplay[0]?.date || new Date())} required={formData.recurrence} />
                  </div></div>)}</div>
                  <div className="form-actions"><button type="button" className="btn-cancel" onClick={handleCancelSelection}>Annuler</button><button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button></div>
                </form>
              </div>
            )}
          </div>
          <div className="week-grid-container">
            <table className="week-grid" onMouseLeave={() => setIsDragging(false)} onMouseUp={handleMouseUp}>
              <thead>
                <tr>
                  <th className="hour-header"></th>
                  {dates.map((date, idx) => (
                    <th key={idx} className="day-header">
                      <div className="day-name"><span className="name-full">{weekDays[idx]}</span><span className="name-short">{weekDays[idx].slice(0, 3)}</span></div>
                      <div className="day-date">{date.getDate()}/{date.getMonth() + 1}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{timeSlots.map(slot => (
                <tr key={slot}>
                  <td className={slot % 1 === 0 ? 'hour-cell-full' : 'hour-cell-half'}>{slot % 1 === 0 ? `${slot}h` : ''}</td>
                  {dates.map((date, dayIndex) => { 
                    const reserved = isSlotReserved(dayIndex, slot); 
                    const selected = isSlotSelected(dayIndex, slot); 
                    const blocked = isDimanche(date) || isJourFerie(date); 
                    const past = isDateInPast(date); 
                    const reservation = getReservation(dayIndex, slot); 
                    const isFullHour = slot % 1 === 0;
                    const isAdmin = isAdminOnlyRoom(selectedRoom);
                    
                    let bgStyle = {}; 
                    if (reserved && reservation) bgStyle.backgroundColor = COULEURS_OBJETS[reservation.objet] || '#ccc'; 
                    
                    let cellClass = `time-slot ${isFullHour ? ' full-hour-border' : ' half-hour-border'}`;
                    if (reserved) cellClass += ' occupied';
                    if (selected) cellClass += ' selected';
                    if (blocked && !reserved) cellClass += ' blocked';
                    if (past && !reserved) cellClass += ' past-date';
                    if (isAdmin && !isAdminUnlocked && !reserved) cellClass += ' admin-only-locked';
                    if (slot >= 12 && slot < 14) cellClass += ' lunch-break';

                    return (<td key={`${dayIndex}-${slot}`} className={cellClass} style={bgStyle} onMouseDown={(e) => handleMouseDown(dayIndex, slot, date, e)} onMouseEnter={() => handleMouseEnter(dayIndex, slot, date)}></td>); 
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        
        {/* ✅ CORRECTION : SUPPRESSION DES TITRES */}
        {hoveredReservation && (
          <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{ position: 'fixed', left: popupPosition.x, top: popupPosition.y, transform: popupPosition.transform, zIndex: 10001 }} onClick={() => setHoveredReservation(null)}>
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
        
        {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><div className="warning-modal-header"><span className="blocked-modal-emoji">🚫</span><h2 className="blocked-modal-title">Fermé</h2></div><p className="blocked-modal-message">Dimanche/Férié fermé.</p><button onClick={() => setBlockedDayModal(false)} className="blocked-close-button">Fermer</button></div></div>}
        
        {adminPasswordModal.show && <div className="modal-overlay"><div className="modal-content"><h3>🔑 Accès Administrateur</h3><input type="password" value={adminPasswordModal.password} onChange={e => setAdminPasswordModal({...adminPasswordModal, password:e.target.value})} className="form-input" autoFocus /><div className="form-actions"><button className="btn-cancel" onClick={() => setAdminPasswordModal({show:false, password:''})}>Annuler</button><button className="btn-submit" onClick={handleAdminPasswordSubmit}>Débloquer</button></div></div></div>}
        
        {/* ✅ CORRECTION : MODALE PROGRESSION AVEC COMPTEUR */}
        {isSubmitting && <div className="modal-overlay"><div className="modal-content"><h3>Enregistrement... ({submissionProgress.current} / {submissionProgress.total})</h3><div style={{width:'100%',background:'#eee',height:'10px',borderRadius:'5px'}}><div style={{width:`${(submissionProgress.current/submissionProgress.total)*100}%`,background:'#4caf50',height:'100%'}}></div></div></div></div>}
        
        {warningModal.show && <div className="modal-overlay"><div className="warning-modal"><div className="warning-modal-header"><h2>⚠️ Conflit</h2></div><div className="warning-modal-body"><p>{warningModal.conflicts.length} conflits détectés.</p></div><div className="warning-modal-footer"><button className="cancel-button" onClick={() => setWarningModal({show:false, conflicts:[], validReservations:[]})}>Annuler</button></div></div></div>}
      </div>
    </>
  );
}

export default SingleRoomGrid;