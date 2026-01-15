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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [blockedDayModal, setBlockedDayModal] = useState(false);
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  const [successModal, setSuccessModal] = useState({
    show: false,
    reservations: [],
    message: ''
  });
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    service: '',
    objet: '',
    description: '',
    recurrence: false,
    recurrenceType: 'weekly',
    recurrenceJusquau: '',
    agencement: ''
  });

  const salleData = getSalleData(selectedRoom);
  const salleInfo = sallesData.find(s => s.nom === salleData?.nom);
  const dispositions = salleInfo?.dispositions || null;

  useEffect(() => {
    loadWeekReservations();
  }, [currentWeekStart, selectedRoom]);

  const loadWeekReservations = async () => {
    setLoading(true);
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const filtered = allReservations.filter(res => {
        const resSalleName = res.salle.split(' - ')[0];
        if (resSalleName !== selectedRoom && res.salle !== selectedRoom) return false;
        const resDate = new Date(res.dateDebut);
        return resDate >= currentWeekStart && resDate <= weekEnd;
      });
      
      setReservations(filtered);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    }
    setLoading(false);
  };
  
  const isAdminOnlyRoom = (room) => {
    return SALLES_ADMIN_ONLY.includes(room);
  };

  const canUserBookRoom = (room, email) => {
    if (!isAdminOnlyRoom(room)) return true;
    if (isAdminUnlocked) return true;
    return ADMINISTRATEURS.includes(email?.toLowerCase());
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPasswordModal.password === 'Maurepas2025') {
      setIsAdminUnlocked(true);
      setAdminPasswordModal({ show: false, password: '' });
    } else {
      alert('❌ Mot de passe incorrect');
      setAdminPasswordModal({ ...adminPasswordModal, password: '' });
    }
  };

  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDates();
  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const formatWeekRange = () => {
    const start = currentWeekStart;
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 6);
    
    const options = { day: 'numeric', month: 'long' };
    const startStr = start.toLocaleDateString('fr-FR', options);
    const endStr = end.toLocaleDateString('fr-FR', options);
    
    return `${startStr} - ${endStr} ${start.getFullYear()}`;
  };

  const isJourFerie = (date) => {
    const dateStr = googleSheetsService.formatDate(date);
    return JOURS_FERIES.includes(dateStr);
  };

  const isDimanche = (date) => {
    return date.getDay() === 0;
  };

  const isSlotReserved = (dayIndex, hour) => {
    const date = dates[dayIndex];
    const dateStr = googleSheetsService.formatDate(date);
    return reservations.some(res => 
      res.dateDebut === dateStr &&
      parseInt(res.heureDebut) <= hour &&
      hour < parseInt(res.heureFin)
    );
  };

  const getReservation = (dayIndex, hour) => {
    const date = dates[dayIndex];
    const dateStr = googleSheetsService.formatDate(date);
    return reservations.find(res => 
      res.dateDebut === dateStr &&
      parseInt(res.heureDebut) <= hour &&
      hour < parseInt(res.heureFin)
    );
  };

  const isSlotSelected = (dayIndex, hour) => {
    return selections.some(sel => sel.dayIndex === dayIndex && sel.hour === hour);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  /* ==============================================================================
     LOGIQUE SOURIS (CORRIGÉE : Variable 'd' remplacée par 'dayIndex')
     ============================================================================== */

  const handleMouseDown = (dayIndex, hour, date) => {
    if (isDimanche(date) || isJourFerie(date)) {
      setBlockedDayModal(true);
      return;
    }
    
    if (isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked) {
      setAdminPasswordModal({ show: true, password: '' });
      return;
    }
    
    if (isSlotReserved(dayIndex, hour)) return;
    
    setIsDragging(false);
    setDragStart({ dayIndex, hour });
    setMouseDownPos({ dayIndex, hour, date });
  };

  const handleMouseEnter = (dayIndex, hour, date) => {
    if (!dragStart) return;
    
    if (!isDragging && mouseDownPos) {
      if (dayIndex !== mouseDownPos.dayIndex || hour !== mouseDownPos.hour) {
        setIsDragging(true);
      } else {
        return;
      }
    }
    
    if (!isDragging) return;
    if (isSlotReserved(dayIndex, hour)) return;
    if (isDimanche(date) || isJourFerie(date)) return;
    
    const newSelections = [...selections];
    
    // CAS 1: DIAGONAL/RECTANGLE (Jours différents ET Heures différentes)
    if (dayIndex !== dragStart.dayIndex && hour !== dragStart.hour) {
      const minDay = Math.min(dragStart.dayIndex, dayIndex);
      const maxDay = Math.max(dragStart.dayIndex, dayIndex);
      const minHour = Math.min(dragStart.hour, hour);
      const maxHour = Math.max(dragStart.hour, hour);
      
      for (let d = minDay; d <= maxDay; d++) {
        const dayDate = dates[d];
        if (!isDimanche(dayDate) && !isJourFerie(dayDate)) {
          for (let h = minHour; h <= maxHour; h++) {
            const exists = newSelections.some(sel => sel.dayIndex === d && sel.hour === h);
            if (!exists && !isSlotReserved(d, h)) {
              newSelections.push({ dayIndex: d, hour: h, date: dates[d] });
            }
          }
        }
      }
    } 
    // CAS 2: VERTICAL (Même jour, Heures différentes)
    else if (dayIndex === dragStart.dayIndex) {
      const minHour = Math.min(dragStart.hour, hour);
      const maxHour = Math.max(dragStart.hour, hour);
      
      for (let h = minHour; h <= maxHour; h++) {
        const exists = newSelections.some(sel => sel.dayIndex === dayIndex && sel.hour === h);
        if (!exists && !isSlotReserved(dayIndex, h)) {
          // CORRECTION ICI : 'dayIndex' utilisé explicitement
          newSelections.push({ dayIndex: dayIndex, hour: h, date: dates[dayIndex] });
        }
      }
    } 
    // CAS 3: HORIZONTAL (Jours différents, Même heure)
    else if (hour === dragStart.hour) {
      const minDay = Math.min(dragStart.dayIndex, dayIndex);
      const maxDay = Math.max(dragStart.dayIndex, dayIndex);
      
      for (let d = minDay; d <= maxDay; d++) {
        const dayDate = dates[d];
        if (!isDimanche(dayDate) && !isJourFerie(dayDate)) {
          const exists = newSelections.some(sel => sel.dayIndex === d && sel.hour === hour);
          if (!exists && !isSlotReserved(d, hour)) {
            newSelections.push({ dayIndex: d, hour: hour, date: dates[d] });
          }
        }
      }
    }
    
    setSelections(newSelections);
  };

  const handleMouseUp = () => {
    if (!isDragging && mouseDownPos) {
      const { dayIndex, hour, date } = mouseDownPos;
      
      const alreadySelected = selections.some(
        sel => sel.dayIndex === dayIndex && sel.hour === hour
      );
      
      if (alreadySelected) {
        const newSelections = selections.filter(
          sel => !(sel.dayIndex === dayIndex && sel.hour === hour)
        );
        setSelections(newSelections);
        if (newSelections.length === 0) {
          setShowForm(false);
        }
      } else {
        setSelections([...selections, { dayIndex, hour, date }]);
        setShowForm(true);
      }
    } else if (isDragging && selections.length > 0) {
      setShowForm(true);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setMouseDownPos(null);
  };

  /* ============================================================================== */

  const handleCancelSelection = () => {
    setSelections([]);
    setShowForm(false);
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      service: '',
      objet: '',
      description: '',
      recurrence: false,
      recurrenceType: 'weekly',
      recurrenceJusquau: '',
      agencement: ''
    });
  };

  const removeSelection = (index) => {
    const newSelections = selections.filter((_, i) => i !== index);
    setSelections(newSelections);
    if (newSelections.length === 0) {
      setShowForm(false);
    }
  };

  const preMergeSelections = (selections) => {
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
        const current = { 
          date: slots[i].date,
          hour: slots[i].hour,
          endHour: slots[i].hour + 1
        };
        
        while (i + 1 < slots.length && current.endHour === slots[i + 1].hour) {
          current.endHour = slots[i + 1].hour + 1;
          i++;
        }
        
        merged.push(current);
        i++;
      }
    }
    
    return merged;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (dispositions && !formData.agencement) {
      alert('⚠️ Veuillez choisir une disposition pour cette salle.');
      return;
    }
    
    if (!canUserBookRoom(selectedRoom, formData.email)) {
      alert('⚠️ Vous n\'êtes pas autorisé à réserver cette salle.');
      return;
    }

    setIsSubmitting(true);

    try {
      const reservationsToCreate = [];

      if (formData.recurrence) {
        const startDate = new Date(selections[0].date);
        const endDate = new Date(formData.recurrenceJusquau);
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          if (currentDate.getDay() !== 0 && !isJourFerie(currentDate)) {
            const mergedSelections = preMergeSelections(selections);
            
            for (const sel of mergedSelections) {
              const dateStr = googleSheetsService.formatDate(currentDate);
              reservationsToCreate.push({
                salle: selectedRoom,
                service: formData.service,
                nom: formData.nom,
                prenom: formData.prenom,
                email: formData.email,
                telephone: formData.telephone,
                dateDebut: dateStr,
                dateFin: dateStr,
                heureDebut: googleSheetsService.formatTime(sel.hour),
                heureFin: googleSheetsService.formatTime(sel.endHour),
                objet: formData.objet,
                description: formData.description,
                nombrePersonnes: '',
                agencement: formData.agencement || ''
              });
            }
          }

          if (formData.recurrenceType === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (formData.recurrenceType === 'biweekly') {
            currentDate.setDate(currentDate.getDate() + 14);
          } else if (formData.recurrenceType === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }
      } else {
        const mergedSelections = preMergeSelections(selections);
        
        for (const sel of mergedSelections) {
          const dateStr = googleSheetsService.formatDate(sel.date);
          reservationsToCreate.push({
            salle: selectedRoom,
            service: formData.service,
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            telephone: formData.telephone,
            dateDebut: dateStr,
            dateFin: dateStr,
            heureDebut: googleSheetsService.formatTime(sel.hour),
            heureFin: googleSheetsService.formatTime(sel.endHour),
            objet: formData.objet,
            description: formData.description,
            nombrePersonnes: '',
            agencement: formData.agencement || ''
          });
        }
      }

      for (const reservation of reservationsToCreate) {
        const conflicts = await googleSheetsService.checkConflicts(reservation);
        if (conflicts.length > 0) {
          alert(`ERREUR: Conflit détecté pour ${reservation.salle} le ${reservation.dateDebut} à ${reservation.heureDebut}.\n\nVeuillez rafraîchir la page et réessayer.`);
          setIsSubmitting(false);
          return;
        }
      }
      
      setSubmissionProgress({ current: 0, total: reservationsToCreate.length });

      for (let i = 0; i < reservationsToCreate.length; i++) {
        await googleSheetsService.addReservation(reservationsToCreate[i]);
        setSubmissionProgress({ current: i + 1, total: reservationsToCreate.length });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setSuccessModal({
        show: true,
        reservations: reservationsToCreate,
        message: '✅ Réservation confirmée !'
      });

      handleCancelSelection();
      await loadWeekReservations();

    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      alert('❌ Erreur lors de la réservation. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hours = [];
  for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h++) {
    hours.push(h);
  }
  
  const gridRows = hours.map(hour => {
    const cells = dates.map((date, dayIndex) => {
      const reserved = isSlotReserved(dayIndex, hour);
      const selected = isSlotSelected(dayIndex, hour);
      const blocked = isDimanche(date) || isJourFerie(date);
      const reservation = getReservation(dayIndex, hour);

      return {
        hour,
        dayIndex,
        date,
        reserved,
        selected,
        blocked,
        reservation,
        occupied: reserved
      };
    });

    return { hour, cells };
  });

  const mergedForDisplay = selections.length > 0 ? preMergeSelections(selections) : [];
  const displayText = mergedForDisplay.length === 1 
    ? `créneau (${mergedForDisplay[0].hour}h-${mergedForDisplay[0].endHour}h)` 
    : `créneaux`;

  // --- CONTENU DU MODAL DE SUCCÈS À PORTALISER ---
  // VERSION CORRIGÉE : POSITIONNEMENT FIXE ENTRE HEADER ET FOOTER
  const successModalContent = successModal.show ? (
    <div 
      className="success-modal-overlay" 
      onClick={() => {
        setSuccessModal({ show: false, reservations: [], message: '' });
        if (onSuccess) onSuccess();
      }}
      style={{ 
        position: 'fixed',
        top: '90px',    // Header Height
        bottom: '60px', // Footer Height
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 9000, 
        paddingBottom: '40px' 
      }}
    >
      <div 
        className="success-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          margin: '0', 
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden' 
        }}
      >
        <div className="success-modal-header">
          <h2>{successModal.message}</h2>
        </div>
        <div 
          className="success-modal-body"
          style={{ overflowY: 'auto' }}
        >
          <p className="success-subtitle">
            📅 {successModal.reservations.length} créneau{successModal.reservations.length > 1 ? 'x' : ''} confirmé{successModal.reservations.length > 1 ? 's' : ''}
          </p>
          <div className="reservations-list">
            {successModal.reservations.map((res, index) => (
              <div key={index} className="reservation-item-success">
                <span className="room-badge">{res.salle}</span>
                <span className="time-info">
                  {res.dateDebut} · {res.heureDebut} - {res.heureFin}
                </span>
              </div>
            ))}
          </div>
          <div className="ical-download-section">
            <p className="ical-info">
              📲 Ajoutez ces réservations à votre agenda Outlook, Google Calendar ou Apple Calendar
            </p>
            <button 
              className="download-ical-button"
              onClick={() => {
                const filename = icalService.generateFilename(successModal.reservations);
                icalService.generateAndDownload(successModal.reservations, filename);
              }}
            >
              <span className="download-icon">📥</span>
              Télécharger le fichier .ics
            </button>
            <p className="ical-hint">
              Le fichier .ics s'ouvrira automatiquement dans votre application de calendrier
            </p>
          </div>
        </div>
        <div className="success-modal-footer">
          <button 
            className="close-modal-button"
            onClick={() => {
              setSuccessModal({ show: false, reservations: [], message: '' });
              if (onSuccess) onSuccess();
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* MODAL VIA PORTAIL */}
      {successModal.show && createPortal(successModalContent, document.body)}

      {isSubmitting && (
        <div className="submission-modal-overlay">
          <div className="submission-modal">
            <h3>⏳ Création en cours...</h3>
            <p>Veuillez patienter, ne fermez pas cette fenêtre.</p>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${(submissionProgress.current / submissionProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="progress-text">
              {submissionProgress.current} / {submissionProgress.total} réservations créées
            </p>
          </div>
        </div>
      )}

    <div className="single-room-container">
      <div className="single-room-header">
        <button onClick={onBack} className="back-button">← Retour</button>
        <h2>🏛️ {salleData?.nom || selectedRoom}</h2>
      </div>

      <div className="week-navigation">
        <button onClick={handlePreviousWeek} className="week-nav-btn">◀ Semaine précédente</button>
        <h3>{formatWeekRange()}</h3>
        <button onClick={handleNextWeek} className="week-nav-btn">Semaine suivante ▶</button>
      </div>

      <div className="single-room-layout">
        <div className="room-sidebar">
          {!showForm && <SalleCard salle={selectedRoom} />}
          
          {showForm && selections.length > 0 && (
            <div className="room-form-container">
              <h3 className="form-title">
                <span className="form-icon">📝</span>
                Réservation de {mergedForDisplay.length} {displayText}
              </h3>

              <div className="selections-summary">
                <h4>📍 Créneau{mergedForDisplay.length > 1 ? 'x' : ''} sélectionné{mergedForDisplay.length > 1 ? 's' : ''}</h4>
                {mergedForDisplay.map((sel, index) => {
                  const dateStr = googleSheetsService.formatDate(sel.date);
                  const duration = sel.endHour - sel.hour;
                  
                  return (
                    <div key={index} className="selection-item">
                      <div className="selection-info">
                        <p><strong>{selectedRoom}</strong></p>
                        <p>{dateStr} · {googleSheetsService.formatTime(sel.hour)} - {googleSheetsService.formatTime(sel.endHour)} ({duration}h)</p>
                      </div>
                      <button 
                        type="button" 
                        className="remove-selection-btn"
                        onClick={() => removeSelection(index)}
                        title="Supprimer cette sélection"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleFormSubmit} className="room-form">
                <div className="form-row">
                  <input 
                    type="text" 
                    placeholder="Nom *" 
                    value={formData.nom} 
                    onChange={(e) => setFormData({...formData, nom: e.target.value})} 
                    required 
                    className="form-input"
                  />
                  <input 
                    type="text" 
                    placeholder="Prénom" 
                    value={formData.prenom} 
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})} 
                    className="form-input"
                  />
                </div>
                
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  className="form-input"
                />
                
                <input 
                  type="tel" 
                  placeholder="Téléphone" 
                  value={formData.telephone} 
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})} 
                  className="form-input"
                />
                
                <select 
                  value={formData.service} 
                  onChange={(e) => setFormData({...formData, service: e.target.value})} 
                  required
                  className="form-select"
                >
                  <option value="">Sélectionnez un service *</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                
                <select 
                  value={formData.objet} 
                  onChange={(e) => setFormData({...formData, objet: e.target.value})} 
                  required
                  className="form-select"
                >
                  <option value="">Objet de la réservation *</option>
                  {OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                
                {dispositions && (
                  <div className="form-group disposition-group">
                    <select
                      value={formData.agencement}
                      onChange={(e) => setFormData({ ...formData, agencement: e.target.value })}
                      required
                      className="disposition-select"
                    >
                      <option value="">Sélectionnez une disposition *</option>
                      {dispositions.map((disp, index) => (
                        <option key={index} value={disp}>{disp}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <textarea 
                  placeholder="Description (optionnelle)" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  rows="3"
                  className="form-textarea"
                />
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.recurrence}
                      onChange={(e) => setFormData({...formData, recurrence: e.target.checked})}
                    />
                    Réservation récurrente
                  </label>
                </div>

                {formData.recurrence && (
                  <>
                    <div className="form-group">
                      <select
                        value={formData.recurrenceType}
                        onChange={(e) => setFormData({...formData, recurrenceType: e.target.value})}
                        className="form-select"
                      >
                        <option value="weekly">Chaque semaine</option>
                        <option value="biweekly">Une semaine sur 2</option>
                        <option value="monthly">Chaque mois</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input
                        type="date"
                        placeholder="Récurrence jusqu'au"
                        value={formData.recurrenceJusquau}
                        onChange={(e) => setFormData({...formData, recurrenceJusquau: e.target.value})}
                        min={selections.length > 0 ? googleSheetsService.formatDate(selections[0].date) : new Date().toISOString().split('T')[0]}
                        max={selections.length > 0 ? new Date(new Date(selections[0].date).setFullYear(new Date(selections[0].date).getFullYear() + 2)).toISOString().split('T')[0] : new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]}
                        required
                        className="form-input"
                      />
                    </div>
                  </>
                )}
                
                <div className="form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">
                    Annuler
                  </button>
                  <button type="submit" className="btn-submit" disabled={selections.length === 0}>
                    Valider la réservation
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="week-grid-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <table className="week-grid">
            <thead>
              <tr>
                <th className="hour-header">Heure</th>
                {dates.map((date, idx) => (
                  <th key={`header-${idx}`} className="day-header">
                    <div className="day-name">{weekDays[idx]}</div>
                    <div className="day-date">{date.getDate()}/{date.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRows.map(row => (
                <tr key={`row-${row.hour}`}>
                  <td className="hour-cell">{row.hour}h</td>
                  {row.cells.map((cell, idx) => {
                    const backgroundColor = cell.reservation && cell.reservation.objet && COULEURS_OBJETS[cell.reservation.objet]
                      ? COULEURS_OBJETS[cell.reservation.objet]
                      : 'white';
                    
                    return (
                      <td
                        key={`cell-${row.hour}-${idx}`}
                        className={`time-slot 
                          ${cell.occupied ? 'occupied' : ''} 
                          ${cell.selected ? 'selected' : ''} 
                          ${cell.blocked ? 'blocked' : ''}
                          ${(cell.hour === 12 || cell.hour === 13) ? 'lunch-break' : ''}
                          ${isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked && !cell.occupied ? 'admin-only-locked' : ''}
                        `}
                        style={{
                          background: (cell.occupied && (cell.hour === 12 || cell.hour === 13) && cell.reservation?.objet && COULEURS_OBJETS[cell.reservation.objet])
                            ? `repeating-linear-gradient(45deg, ${COULEURS_OBJETS[cell.reservation.objet]}, ${COULEURS_OBJETS[cell.reservation.objet]} 8px, ${COULEURS_OBJETS[cell.reservation.objet]}dd 8px, ${COULEURS_OBJETS[cell.reservation.objet]}dd 16px)`
                            : (cell.occupied && cell.reservation?.objet && COULEURS_OBJETS[cell.reservation.objet]
                              ? COULEURS_OBJETS[cell.reservation.objet]
                              : 'white')
                        }}
                        onMouseDown={() => !cell.occupied && !cell.blocked && handleMouseDown(cell.dayIndex, cell.hour, cell.date)}
                        onMouseEnter={(e) => {
                          handleMouseEnter(cell.dayIndex, cell.hour, cell.date);
                          if (cell.occupied && cell.reservation) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredReservation(cell.reservation);
                            setPopupPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredReservation(null);
                        }}
                      >
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {blockedDayModal && (
        <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}>
          <div className="blocked-modal" onClick={(e) => e.stopPropagation()}>
            <div className="blocked-modal-header">
              <span className="blocked-icon">🚫</span>
              <h2>Réservation impossible</h2>
            </div>
            <div className="blocked-modal-body">
              <p>Les réservations ne sont pas autorisées les <strong>dimanches</strong> et <strong>jours fériés</strong>.</p>
            </div>
            <div className="blocked-modal-footer">
              <button className="blocked-close-button" onClick={() => setBlockedDayModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredReservation && (
        <div 
          className="reservation-popup-card"
          style={{
            position: 'fixed',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10001
          }}
        >
          <div className="popup-card-content">
            <div className="popup-card-header">
              <span className="popup-icon">👤</span>
              <span className="popup-name">
                {hoveredReservation.prenom ? `${hoveredReservation.prenom} ` : ''}
                {hoveredReservation.nom || 'Anonyme'}
              </span>
            </div>
            <div className="popup-card-body">
              {hoveredReservation.email && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">📧</span>
                  <span className="popup-info-text">{hoveredReservation.email}</span>
                </div>
              )}
              {hoveredReservation.service && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">🏢</span>
                  <span className="popup-info-text">{hoveredReservation.service}</span>
                </div>
              )}
              <div className="popup-info-line">
                <span className="popup-info-icon">📅</span>
                <span className="popup-info-text">
                  {hoveredReservation.dateDebut} · {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}
                </span>
              </div>
              {hoveredReservation.objet && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">📋</span>
                  <span className="popup-info-text">{hoveredReservation.objet}</span>
                </div>
              )}
              {hoveredReservation.agencement && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">🪑</span>
                  <span className="popup-info-text">{hoveredReservation.agencement}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {adminPasswordModal.show && (
        <div className="modal-overlay" onClick={() => setAdminPasswordModal({ show: false, password: '' })}>
          <div className="modal-content admin-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔒 Accès Salle Réservée</h2>
            </div>
            
            <div className="modal-body">
              <p className="admin-warning">
                La salle <strong>{selectedRoom}</strong> est réservée aux administrateurs.
              </p>
              <p className="admin-instruction">
                Veuillez saisir le mot de passe administrateur pour accéder à cette salle.
              </p>
              
              <div className="password-input-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={adminPasswordModal.password}
                  onChange={(e) => setAdminPasswordModal({ ...adminPasswordModal, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminPasswordSubmit()}
                  placeholder="Entrez le mot de passe"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setAdminPasswordModal({ show: false, password: '' })}
              >
                Annuler
              </button>
              <button 
                className="submit-button"
                onClick={handleAdminPasswordSubmit}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default SingleRoomGrid;