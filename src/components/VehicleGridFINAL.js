// src/components/VehicleGrid.js
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import apiService from '../services/apiService';
import icalService from '../services/icalService';
import emailService from '../services/emailService';
// Import de OBJETS_VEHICULE depuis la config centralisée
import { HORAIRES, SERVICES, OBJETS_VEHICULE, JOURS_FERIES, COULEURS_OBJETS } from '../config/googleSheets';
import { getSalleData } from '../data/sallesData';
import './VehicleGrid.css';

// ✅ AJOUT PROP editingReservation
function VehicleGrid({ onBack, editingReservation }) {
  const selectedRoom = "CLIO"; 

  const getMondayOfWeek = (d) => { 
    const date = new Date(d); 
    const day = date.getDay(); 
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(date.setDate(diff)); 
    monday.setHours(0, 0, 0, 0); 
    return monday; 
  };

  // ✅ HELPER POUR DATE STRICTE
  const toISODate = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  const getInitialStartDate = () => {
    const today = new Date();
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
  
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const sidebarRef = useRef(null);
  const [blockedDayModal, setBlockedDayModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  const [successModal, setSuccessModal] = useState({ show: false, reservations: [], message: '' });
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [], conflictDetails: [] });
  const [confirmModal, setConfirmModal] = useState({ show: false, reservations: [] });
  // PermisAttestation dans state
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', permisAttestation: false, recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '', agencement: '', nbPersonnes: '' });
  
  const vehicleData = getSalleData(selectedRoom);
  const vehicleImage = vehicleData ? vehicleData.photo : null;

  // ✅ EFFET POUR CHARGER L'ÉDITION
  useEffect(() => {
    if (editingReservation) {
      // 1. Pré-remplir le formulaire
      setFormData({
        nom: editingReservation.nom,
        prenom: editingReservation.prenom,
        email: editingReservation.email,
        telephone: editingReservation.telephone || '',
        service: editingReservation.service,
        objet: editingReservation.objet,
        description: editingReservation.description || '',
        permisAttestation: true, // Suppose vrai si déjà réservé
        recurrence: false,
        recurrenceType: 'weekly',
        recurrenceJusquau: '',
        agencement: '',
        nbPersonnes: ''
      });

      // 2. Positionner le calendrier sur la bonne semaine
      const dateRes = new Date(editingReservation.dateDebut);
      setCurrentWeekStart(getMondayOfWeek(dateRes));

      // 3. Mettre en surbrillance (Sélection)
      const startSlot = apiService.timeToFloat(editingReservation.heureDebut);
      const endSlot = apiService.timeToFloat(editingReservation.heureFin);
      
      const newSelections = [];
      for (let h = startSlot; h < endSlot; h += 0.5) {
        newSelections.push({
          dayIndex: -1,
          hour: h,
          date: dateRes
        });
      }
      setSelections(newSelections);
    }
  }, [editingReservation]);

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

  useEffect(() => { loadWeekReservations(); }, [currentWeekStart]);

  const loadWeekReservations = async () => { 
    setLoading(true); 
    try { 
      const allReservations = await apiService.getAllReservations(); 
      const weekEnd = new Date(currentWeekStart); 
      weekEnd.setDate(currentWeekStart.getDate() + 6); 
      
      const filtered = allReservations.filter(res => { 
        if (res.salle !== selectedRoom) return false; 
        if (res.statut === 'cancelled') return false;
        // EXCLURE LA RÉSERVATION EN COURS D'ÉDITION pour qu'elle n'apparaisse pas comme "occupée" (rouge) mais "sélectionnée" (bleue)
        if (editingReservation && res.id === editingReservation.id) return false;

        const resDate = new Date(res.dateDebut); 
        return resDate >= currentWeekStart && resDate <= weekEnd; 
      }); 
      setReservations(filtered); 
    } catch (error) { console.error('Erreur chargement:', error); } 
    setLoading(false); 
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

  const isJourFerie = (date) => JOURS_FERIES.includes(apiService.formatDate(date));
  const isDimanche = (date) => date.getDay() === 0;
  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };
  
  const isSlotReserved = (dayIndex, slotStart) => { 
    const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = apiService.formatDate(date); 
    return reservations.some(res => { 
      if (res.dateDebut !== dateStr) return false; 
      const resStart = apiService.timeToFloat(res.heureDebut); 
      const resEnd = apiService.timeToFloat(res.heureFin); 
      return (slotStart < resEnd && slotEnd > resStart); 
    }); 
  };
  
  const getReservation = (dayIndex, slotStart) => { 
    const slotEnd = slotStart + 0.5; const date = dates[dayIndex]; const dateStr = apiService.formatDate(date); 
    return reservations.find(res => { 
      if (res.dateDebut !== dateStr) return false; 
      const resStart = apiService.timeToFloat(res.heureDebut); 
      const resEnd = apiService.timeToFloat(res.heureFin); 
      return (slotStart < resEnd && slotEnd > resStart); 
    }); 
  };

  // ✅ CORRECTION CRÉNEAUX FANTÔMES
  const isSlotSelected = (dayIndex, slot) => {
    const currentCellDateStr = toISODate(dates[dayIndex]);
    return selections.some(sel => {
      const selDateStr = toISODate(sel.date instanceof Date ? sel.date : new Date(sel.date));
      return sel.hour === slot && selDateStr === currentCellDateStr;
    });
  };
  
  const handleMouseDown = (dayIndex, hour, date, event) => {
    if (isDimanche(date) || isJourFerie(date)) { setBlockedDayModal(true); return; }
    
    const dateStr = apiService.formatDate(date);
    const reservation = reservations.find(r => 
      r.salle === selectedRoom && 
      r.dateDebut === dateStr &&
      hour >= apiService.timeToFloat(r.heureDebut) && 
      hour < apiService.timeToFloat(r.heureFin)
    );
    
    if (reservation) {
      setHoveredReservation(reservation);
      setPopupPosition({ x: event.clientX, y: event.clientY });
      return;
    }
    
    if (isDateInPast(date)) return;
    
    // ✅ SI ON COMMENCE UNE NOUVELLE SÉLECTION ALORS QU'ON ÉTAIT EN ÉDITION, ON VIDE L'ANCIENNE
    if (editingReservation) {
      setSelections([]);
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
          const exists = isSlotSelected(d, h);
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
      const alreadySelected = isSlotSelected(dayIndex, hour); 
      if (alreadySelected) { 
        const dateStr = toISODate(date);
        const newSelections = selections.filter(sel => 
          !(sel.hour === hour && toISODate(sel.date) === dateStr)
        ); 
        setSelections(newSelections); 
      } else { 
        setSelections([...selections, { dayIndex, hour, date }]); 
      } 
    }
    setIsDragging(false); setDragStart(null); setMouseDownPos(null); 
  };

  const handleCancelSelection = () => { 
    setSelections([]); 
    setFormData({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', permisAttestation: false, recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '', agencement: '', nbPersonnes: '' });
    // ✅ RETOUR ARRIÈRE EN CAS D'ÉDITION
    if (editingReservation && onBack) {
      onBack();
    }
  };
  
  const removeSelection = (index) => {
    const toRemove = mergedForDisplay[index];
    const selectionsToRemove = selections.filter(sel => sel.date && toRemove.date && sel.date.getTime() === toRemove.date.getTime() && sel.hour >= toRemove.hour && sel.hour < toRemove.endHour);
    const newSelections = selections.filter(sel => !selectionsToRemove.includes(sel));
    setSelections(newSelections);
  };

  const preMergeSelections = (selections) => {
    if (selections.length === 0) return [];
    const byDate = {};
    selections.forEach(sel => {
      const dateKey = toISODate(sel.date);
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
    const conflicts = []; const valid = []; const conflictDetails = [];
    candidates.forEach(candidate => { 
        const candidateStart = new Date(`${candidate.dateDebut}T${candidate.heureDebut}`); 
        const candidateEnd = new Date(`${candidate.dateFin}T${candidate.heureFin}`); 
        const blockedBy = allExistingReservations.find(existing => { 
            if (existing.statut === 'cancelled') return false; 
            if (editingReservation && existing.id === editingReservation.id) return false;
            if (existing.salle !== candidate.salle && existing.salle.split(' - ')[0] !== candidate.salle) return false; 
            const existingStart = new Date(`${existing.dateDebut}T${existing.heureDebut}`); 
            const existingEnd = new Date(`${existing.dateFin || existing.dateDebut}T${existing.heureFin}`); 
            return (candidateStart < existingEnd && candidateEnd > existingStart); 
        }); 
        if (blockedBy) { conflicts.push(candidate); conflictDetails.push({ candidate, blockedBy }); }
        else valid.push(candidate); 
    }); 
    return { conflicts, valid, conflictDetails }; 
  };

  const finalizeReservation = async (reservationsToSave) => { 
    setWarningModal({ show: false, conflicts: [], validReservations: [], conflictDetails: [] });
    setConfirmModal({ show: false, reservations: [] });
    setIsSubmitting(true); setSubmissionProgress({ current: 0, total: reservationsToSave.length }); 
    try { 
        if (editingReservation) {
          await apiService.deleteReservation(editingReservation.id);
        }
        const createdReservations = []; 
        for (const res of reservationsToSave) { 
            const result = await apiService.addReservation(res); 
            createdReservations.push({ ...res, id: result.id }); 
            setSubmissionProgress(prev => ({ ...prev, current: prev.current + 1 })); 
            try { await emailService.sendConfirmation(res); } catch(e) { console.error("Mail error", e); }
        } 
        setSuccessModal({ show: true, reservations: createdReservations, message: '✅ Réservation confirmée !' }); 
        setSelections([]); loadWeekReservations(); 
    } catch (error) { alert('Erreur: ' + error.message); } 
    finally { setIsSubmitting(false); } 
  };

  const handleFormSubmit = async (e) => { 
    e.preventDefault(); 
    if (selections.length === 0) {
      return alert('Veuillez sélectionner au moins un créneau dans la grille.');
    }

    if (!formData.permisAttestation) {
      return alert('Vous devez attester être titulaire du permis B pour valider la réservation.');
    }

    setIsSubmitting(true); 
    try { 
        const mergedSelections = preMergeSelections(selections); 
        let allCandidates = []; 
        mergedSelections.forEach(sel => { 
            const dateStr = apiService.formatDate(sel.date); 
            const baseRes = { salle: selectedRoom, service: formData.service, nom: formData.nom, prenom: formData.prenom, email: formData.email, telephone: formData.telephone, dateDebut: dateStr, dateFin: dateStr, heureDebut: apiService.formatTime(sel.hour), heureFin: apiService.formatTime(sel.endHour), objet: formData.objet, description: formData.description, recurrence: formData.recurrence ? 'OUI' : 'NON', recurrenceJusquau: formData.recurrenceJusquau, agencement: formData.agencement || '', nbPersonnes: formData.nbPersonnes, statut: 'active' }; 
            allCandidates.push(baseRes); 
            if (formData.recurrence && formData.recurrenceJusquau) { 
                const selDateObj = sel.date instanceof Date ? sel.date : new Date(sel.date); 
                const datesRecur = generateRecurrenceDates(selDateObj, new Date(formData.recurrenceJusquau), formData.recurrenceType); 
                datesRecur.forEach(date => { const dateRecurStr = apiService.formatDate(date); allCandidates.push({ ...baseRes, dateDebut: dateRecurStr, dateFin: dateRecurStr }); }); 
            } 
        }); 
        const allExisting = await apiService.getAllReservations(true); 
        const { conflicts, valid, conflictDetails } = checkConflicts(allCandidates, allExisting); 
        setIsSubmitting(false); 
        if (conflicts.length > 0) { setWarningModal({ show: true, conflicts, validReservations: valid, conflictDetails }); } 
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
      const startHour = apiService.timeToFloat(editingReservation.heureDebut);
      const endHour = apiService.timeToFloat(editingReservation.heureFin);
      const newSelections = [];
      
      for (let h = startHour; h < endHour; h += 0.5) {
        newSelections.push({ 
          dayIndex: -1, 
          hour: h, 
          date: resDate 
        });
      }
      setSelections(newSelections);
    }
  }, [editingReservation]);

  // ✅ LOGIQUE DE TITRE PERSONNALISÉE
  const getFormTitle = () => {
    if (selections.length === 0) return "Sélectionnez un créneau";

    // Trier les sélections par date puis par heure pour vérifier la contiguïté
    const sorted = [...selections].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.hour - b.hour;
    });

    let blocks = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1];
      const curr = sorted[i];
      const prevDate = toISODate(prev.date);
      const currDate = toISODate(curr.date);

      // Si jour différent OU trou dans les heures (> 0.51 pour gérer les float)
      if (prevDate !== currDate || Math.abs(curr.hour - prev.hour) > 0.51) {
        blocks++;
      }
    }

    if (blocks > 1) return `Confirmez les ${blocks} réservations`;
    return "Confirmez la réservation";
  };

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

      <div className="vehicle-grid-container">
        <div className="week-navigation">
          <div className="nav-group-left">
            <button onClick={onBack} className="back-button-inline">← Retour</button>
            <h2 className="room-title-inline" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src={`${process.env.PUBLIC_URL}/images/32x32.png`} 
                alt="Auto" 
                style={{ height: '28px', width: 'auto' }} 
              />
              {selectedRoom} {editingReservation && <span style={{fontSize:'0.8em', color:'#ef5350'}}>(Modification)</span>}
            </h2>
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

        {/* ✅ CLASS CORRIGÉE POUR ALIGNEMENT */}
        <div className="vehicle-layout">
          <div className="room-sidebar" ref={sidebarRef}>
            <div className="room-form-container">
              <div className="vehicle-form-header-image">
                <img src={vehicleImage || "https://images.caradisiac.com/logos-ref/modele/modele--renault-clio-5/S0-modele--renault-clio-5.jpg"} alt="Clio" />
              </div>

              {/* ✅ TITRE DYNAMIQUE */}
              <h3 className="form-title">
                {getFormTitle()}
              </h3>
              
              <div className="selections-summary">
                {selections.length === 0 && <p style={{color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic'}}>Aucun créneau sélectionné.</p>}
                {mergedForDisplay.map((sel, idx) => (<div key={idx} className="selection-item">{apiService.formatDate(sel.date)} : {apiService.formatTime(sel.hour)} - {apiService.formatTime(sel.endHour)}<button className="remove-selection-btn" onClick={() => removeSelection(idx)}>✕</button></div>))}
              </div>
              
              <form onSubmit={handleFormSubmit} className="room-form">
                <div className="form-row"><input className="form-input" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{flex:1}} /><input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} style={{flex:1}} /></div>
                <input className="form-input" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <select className="form-select" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Choisissez le service *</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                
                <select className="form-select" value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})} required>
                  <option value="">Choisissez le motif *</option>
                  {OBJETS_VEHICULE.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                
                <div className="attestation-box">
                  <input 
                    type="checkbox" 
                    id="permisAttestation"
                    checked={formData.permisAttestation} 
                    onChange={e => setFormData({...formData, permisAttestation: e.target.checked})} 
                    required 
                  />
                  <label htmlFor="permisAttestation">J'atteste être titulaire du permis B et avoir les points nécessaires</label>
                </div>

                <textarea className="form-textarea" placeholder="Commentaire" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="recurrence-section-styled"><div className="recurrence-box"><input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} /><label>Réservation récurrente</label></div>
                {formData.recurrence && (<div className="recurrence-options slide-down"><div className="form-group"><select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}><option value="weekly">Chaque semaine</option><option value="biweekly">Une semaine sur 2</option><option value="monthly">Chaque mois</option></select></div><div className="form-group" style={{marginBottom:0}}>
                  <input type="date" className="form-input" placeholder="JJ/MM/AAAA" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={apiService.formatDate(mergedForDisplay[0]?.date || new Date())} required={formData.recurrence} />
                </div></div>)}</div>
                <div className="form-actions"><button type="button" className="btn-cancel" onClick={handleCancelSelection}>Annuler</button><button type="submit" className="btn-submit" disabled={isSubmitting}>Valider</button></div>
              </form>
            </div>
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
              <tbody>{timeSlots.map(slot => {
                const isFullHour = slot % 1 === 0;
                
                return (
                  <tr key={slot}>
                    <td className={isFullHour ? 'hour-cell-full' : 'hour-cell-half'}>{isFullHour ? `${slot}h` : ''}</td>
                    {dates.map((date, dayIndex) => { 
                      const reserved = isSlotReserved(dayIndex, slot); 
                      const selected = isSlotSelected(dayIndex, slot); 
                      const blocked = isDimanche(date) || isJourFerie(date); 
                      const past = isDateInPast(date); 
                      const reservation = getReservation(dayIndex, slot); 
                      
                      let bgStyle = {}; 
                      if (reserved && reservation) bgStyle.backgroundColor = COULEURS_OBJETS[reservation.objet] || '#ccc'; 
                      
                      let cellClass = `time-slot ${isFullHour ? ' full-hour-border' : ' half-hour-border'}`;
                      if (reserved) cellClass += ' occupied';
                      if (selected) cellClass += ' selected';
                      if (blocked && !reserved) cellClass += ' blocked';
                      if (past && !reserved) cellClass += ' past-date';
                      if (slot >= 12 && slot < 14) cellClass += ' lunch-break';

                      // ✅ MODIFICATION : Ajout de la classe d'animation si en mode édition et case sélectionnée
                      if (selected && editingReservation) cellClass += ' editing-pulse';

                      return (<td key={`${dayIndex}-${slot}`} className={cellClass} style={bgStyle} onMouseDown={(e) => handleMouseDown(dayIndex, slot, date, e)} onMouseEnter={() => handleMouseEnter(dayIndex, slot, date)}></td>); 
                    })}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
        
        {/* ✅ POPUP FICHE RÉSERVATION */}
        {hoveredReservation && (
          <div className={`reservation-popup-card ${isFading ? 'fading-out' : ''}`} style={{ position: 'fixed', left: popupPosition.x, top: popupPosition.y, transform: 'translate(-50%, -50%)', zIndex: 10001 }} onClick={() => setHoveredReservation(null)}>
            <div className="popup-card-header">
              <span className="popup-icon">👤</span> 
              {hoveredReservation.prenom} {hoveredReservation.nom}
            </div>
            <div className="popup-card-body">
              <div className="popup-info-line"><span className="popup-info-icon">🏢</span> {hoveredReservation.service}</div>
              <div className="popup-info-line"><span className="popup-info-icon">📧</span> {hoveredReservation.email}</div>
              <div className="popup-info-line"><span className="popup-info-icon">📝</span> {hoveredReservation.objet}</div>
              <div className="popup-info-line"><span className="popup-info-icon">📅</span> {new Date(hoveredReservation.dateDebut).toLocaleDateString('fr-FR')} - {hoveredReservation.heureDebut} à {hoveredReservation.heureFin}</div>
            </div>
          </div>
        )}
        
        {blockedDayModal && <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}><div className="blocked-modal"><div className="warning-modal-header"><span className="blocked-modal-emoji">🚫</span><h2 className="blocked-modal-title">Pas de réservation le dimanche et les jours fériés</h2></div><p className="blocked-modal-message"></p><button onClick={() => setBlockedDayModal(false)} className="blocked-close-button">Fermer</button></div></div>}
        
        {isSubmitting && <div className="modal-overlay"><div className="modal-content"><h3>Enregistrement... ({submissionProgress.current} / {submissionProgress.total})</h3><div style={{width:'100%',background:'#eee',height:'10px',borderRadius:'5px'}}><div style={{width:`${(submissionProgress.current/submissionProgress.total)*100}%`,background:'#4caf50',height:'100%'}}></div></div></div></div>}
        
        {warningModal.show && createPortal(
          <div className="modal-overlay" onClick={() => setWarningModal({ show: false, conflicts: [], validReservations: [], conflictDetails: [] })}>
            <div className="warning-modal warning-modal-large" onClick={e => e.stopPropagation()}>
              <div className="warning-modal-header">
                <h2>⚠️ {warningModal.conflicts.length > 1 ? 'Conflits détectés' : 'Conflit détecté'}</h2>
                <p className="warning-modal-subtitle">
                  {warningModal.conflicts.length} créneau{warningModal.conflicts.length > 1 ? 'x' : ''} en conflit
                  {warningModal.validReservations.length > 0 && ` · ${warningModal.validReservations.length} créneau${warningModal.validReservations.length > 1 ? 'x' : ''} disponible${warningModal.validReservations.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="warning-modal-body">
                <div className="conflict-section">
                  <div className="conflict-section-title">
                    <span className="conflict-section-icon">🚫</span>
                    <span>{warningModal.conflicts.length > 1 ? 'Créneaux bloqués' : 'Créneau bloqué'} ({warningModal.conflicts.length})</span>
                  </div>
                  <div className="conflict-list-new">
                    {warningModal.conflictDetails.map((detail, i) => (
                      <div key={i} className="conflict-item">
                        <div className="conflict-item-date">
                          📅 {new Date(detail.candidate.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          <span className="conflict-item-hours"> · {detail.candidate.heureDebut} – {detail.candidate.heureFin}</span>
                        </div>
                        <div className="conflict-item-blocked-by">
                          Occupé par : <strong>{detail.blockedBy.prenom} {detail.blockedBy.nom}</strong>
                          {detail.blockedBy.service && <span className="conflict-item-service"> — {detail.blockedBy.service}</span>}
                          <span className="conflict-item-hours"> ({detail.blockedBy.heureDebut} – {detail.blockedBy.heureFin})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {warningModal.validReservations.length > 0 && (
                  <div className="valid-section">
                    <div className="valid-section-title">
                      <span className="valid-section-icon">✅</span>
                      <span>{warningModal.validReservations.length > 1 ? 'Créneaux disponibles' : 'Créneau disponible'} ({warningModal.validReservations.length})</span>
                    </div>
                    <div className="valid-list">
                      {warningModal.validReservations.map((res, i) => (
                        <div key={i} className="valid-item">
                          📅 {new Date(res.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          <span className="conflict-item-hours"> · {res.heureDebut} – {res.heureFin}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="warning-modal-footer">
                <button className="btn-conflict-reject" onClick={() => setWarningModal({ show: false, conflicts: [], validReservations: [], conflictDetails: [] })}>
                  ✕ Annuler toute la série
                </button>
                {warningModal.validReservations.length > 0 && (
                  <button className="btn-conflict-validate" onClick={() => {
                    setWarningModal({ show: false, conflicts: [], validReservations: [], conflictDetails: [] });
                    setConfirmModal({ show: true, reservations: warningModal.validReservations });
                  }}>
                    ✓ {warningModal.validReservations.length > 1 ? `Valider les ${warningModal.validReservations.length} créneaux disponibles` : 'Valider le créneau disponible'}
                  </button>
                )}
              </div>
            </div>
          </div>, document.body
        )}

        {confirmModal.show && createPortal(
          <div className="modal-overlay" onClick={() => setConfirmModal({ show: false, reservations: [] })}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="confirm-modal-header">
                <h2>✅ Confirmer la réservation</h2>
                <p className="confirm-modal-subtitle">
                  Les {confirmModal.reservations.length} créneau{confirmModal.reservations.length > 1 ? 'x' : ''} suivant{confirmModal.reservations.length > 1 ? 's' : ''} seront enregistré{confirmModal.reservations.length > 1 ? 's' : ''} :
                </p>
              </div>
              <div className="confirm-modal-body">
                <div className="confirm-list">
                  {confirmModal.reservations.map((res, i) => (
                    <div key={i} className="confirm-item">
                      📅 <strong>{new Date(res.dateDebut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      <span className="conflict-item-hours"> · {res.heureDebut} – {res.heureFin}</span>
                      {res.salle && <span className="confirm-item-salle"> — {res.salle.split(' - ')[0]}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="confirm-modal-footer">
                <button className="btn-confirm-back" onClick={() => setConfirmModal({ show: false, reservations: [] })}>◀ Retour</button>
                <button className="btn-confirm-ok" onClick={() => finalizeReservation(confirmModal.reservations)}>✓ Confirmer et enregistrer</button>
              </div>
            </div>
          </div>, document.body
        )}
      </div>
    </>
  );
}

export default VehicleGrid;