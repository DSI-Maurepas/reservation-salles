// src/components/IAGrid.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import icalService from '../services/icalService';
import { SERVICES, OBJETS_RESERVATION, JOURS_FERIES } from '../config/googleSheets';
import { IA_TOOLS } from '../data/iaData';
import './IAGrid.css';

function IAGrid({ onBack }) {
  // --- GESTION DATE & DONNÉES ---
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- GESTION SÉLECTION (DRAG & DROP) ---
  const [selections, setSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  // --- INTERFACE ---
  const [activeDesc, setActiveDesc] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // --- FORMULAIRE & MODALS ---
  const [formData, setFormData] = useState({ 
    nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  
  // Modals
  const [successModal, setSuccessModal] = useState({ show: false, count: 0 });
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [] });
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  // Chargement initial
  useEffect(() => { loadIAReservations(); }, [currentWeekStart]);

  // Affichage du formulaire si sélection
  useEffect(() => { setShowForm(selections.length > 0); }, [selections]);

  const loadIAReservations = async () => {
    setLoading(true);
    try {
      const res = await googleSheetsService.getAllIAReservations();
      setReservations(res);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- NAVIGATION ---
  const changeWeek = (days) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + days);
    setCurrentWeekStart(newDate);
    setSelections([]);
  };

  const changeMonth = (months) => {
    const newDate = new Date(currentWeekStart);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentWeekStart(getMonday(newDate));
    setSelections([]);
  };

  // --- LOGIQUE DRAG & DROP ---
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const isOccupied = (toolId, dateStr, period) => {
    return reservations.some(res => 
      res.toolId === toolId && 
      res.dateDebut === dateStr && 
      res.statut !== 'cancelled' &&
      (period === 'Matin' ? res.heureDebut === '08:00' : res.heureDebut === '12:30')
    );
  };

  const handleMouseDown = (toolIndex, dayIndex, periodIndex) => {
    const tool = IA_TOOLS[toolIndex];
    const date = weekDates[dayIndex];
    const period = periodIndex === 0 ? 'Matin' : 'Après-midi';
    if (isOccupied(tool.id, googleSheetsService.formatDate(date), period)) return;

    setIsDragging(true);
    setDragStart({ toolIndex, dayIndex, periodIndex });
    setDragCurrent({ toolIndex, dayIndex, periodIndex });
  };

  const handleMouseEnter = (toolIndex, dayIndex, periodIndex) => {
    if (isDragging) {
      setDragCurrent({ toolIndex, dayIndex, periodIndex });
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent) return;
    setIsDragging(false);

    const minTool = Math.min(dragStart.toolIndex, dragCurrent.toolIndex);
    const maxTool = Math.max(dragStart.toolIndex, dragCurrent.toolIndex);
    const minDay = Math.min(dragStart.dayIndex, dragCurrent.dayIndex);
    const maxDay = Math.max(dragStart.dayIndex, dragCurrent.dayIndex);
    
    let newSelections = [...selections];
    const tempSelections = [];

    for (let t = minTool; t <= maxTool; t++) {
      for (let d = minDay; d <= maxDay; d++) {
        let pStart = 0; 
        let pEnd = 1;
        if (minDay === maxDay) {
            pStart = Math.min(dragStart.periodIndex, dragCurrent.periodIndex);
            pEnd = Math.max(dragStart.periodIndex, dragCurrent.periodIndex);
        }

        for (let p = pStart; p <= pEnd; p++) {
          const tool = IA_TOOLS[t];
          const date = weekDates[d];
          const period = p === 0 ? 'Matin' : 'Après-midi';
          const dateStr = googleSheetsService.formatDate(date);

          if (!isOccupied(tool.id, dateStr, period)) {
            if (!newSelections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === period)) {
               tempSelections.push({
                 toolId: tool.id,
                 toolName: tool.nom,
                 date: date,
                 dateStr: dateStr,
                 period: period,
               });
            }
          }
        }
      }
    }

    validateAndAddSelections(newSelections, tempSelections);
    setDragStart(null);
    setDragCurrent(null);
  };

  const validateAndAddSelections = (currentSels, newSels) => {
    const combined = [...currentSels, ...newSels];
    
    // 1. Contrainte : Max 2 IA différentes
    const uniqueTools = new Set(combined.map(s => s.toolId));
    if (uniqueTools.size > 2) {
      setErrorModal({ show: true, message: "⛔ Vous ne pouvez pas réserver plus de 2 outils IA différents simultanément." });
      return;
    }

    // 2. Contrainte : Max 7 jours d'écart (période glissante)
    if (combined.length > 0) {
      const dates = combined.map(s => s.date.getTime()).sort((a,b) => a-b);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 6) { // > 6 signifie que l'écart est de 7 jours ou plus (ex: Lundi au Lundi suivant = interdit)
        setErrorModal({ show: true, message: "⛔ La période de réservation ne peut pas dépasser 7 jours consécutifs." });
        return;
      }
    }

    setSelections(combined.sort((a,b) => a.date.getTime() - b.date.getTime() || (a.period === 'Matin' ? -1 : 1)));
  };

  const removeSelection = (index) => {
    const newSels = [...selections];
    newSels.splice(index, 1);
    setSelections(newSels);
  };

  // --- LOGIQUE VALIDATION FORMULAIRE ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionProgress({ current: 0, total: selections.length });

    try {
      let allCandidates = [];
      
      selections.forEach(sel => {
        const baseRes = {
          toolId: sel.toolId,
          salle: sel.toolName,
          dateDebut: sel.dateStr,
          heureDebut: sel.period === 'Matin' ? '08:00' : '12:30',
          heureFin: sel.period === 'Matin' ? '12:30' : '17:30',
          ...formData
        };
        allCandidates.push(baseRes);

        if (formData.recurrence && formData.recurrenceJusquau) {
           const datesRecur = icalService.generateRecurrenceDates(
             sel.date, 
             new Date(formData.recurrenceJusquau), 
             formData.recurrenceType
           );
           datesRecur.forEach(d => {
             const dStr = googleSheetsService.formatDate(d);
             allCandidates.push({ ...baseRes, dateDebut: dStr });
           });
        }
      });

      setSubmissionProgress({ current: 0, total: allCandidates.length });

      const allExisting = await googleSheetsService.getAllIAReservations(true);
      const conflicts = [];
      const valid = [];

      allCandidates.forEach(cand => {
        const isConflict = allExisting.some(exist => 
          exist.statut !== 'cancelled' &&
          exist.toolId === cand.toolId &&
          exist.dateDebut === cand.dateDebut &&
          exist.heureDebut === cand.heureDebut
        );
        if (isConflict) conflicts.push(cand);
        else valid.push(cand);
      });

      if (conflicts.length > 0) {
        setIsSubmitting(false);
        setWarningModal({ show: true, conflicts, validReservations: valid });
        return;
      }

      await finalizeReservation(valid);

    } catch (error) {
      alert('Erreur: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const finalizeReservation = async (reservationsToSave) => {
    setWarningModal({ show: false, conflicts: [], validReservations: [] });
    setIsSubmitting(true);
    
    try {
      let count = 0;
      for (const res of reservationsToSave) {
        await googleSheetsService.addIAReservation(res);
        count++;
        setSubmissionProgress(prev => ({ ...prev, current: count }));
        try { await emailService.sendConfirmation(res); } catch(e){}
      }
      
      setSuccessModal({ show: true, count: reservationsToSave.length });
      loadIAReservations();
      setSelections([]);
      setFormData({ nom: '', prenom: '', email: '', telephone: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '' });
    } catch(e) { console.error(e); } 
    finally { setIsSubmitting(false); }
  };

  const isSlotInSelection = (tIdx, dIdx, pIdx) => {
    if (!isDragging || !dragStart || !dragCurrent) return false;
    const minT = Math.min(dragStart.toolIndex, dragCurrent.toolIndex);
    const maxT = Math.max(dragStart.toolIndex, dragCurrent.toolIndex);
    const minD = Math.min(dragStart.dayIndex, dragCurrent.dayIndex);
    const maxD = Math.max(dragStart.dayIndex, dragCurrent.dayIndex);
    return tIdx >= minT && tIdx <= maxT && dIdx >= minD && dIdx <= maxD; 
  };

  const getDaysCount = () => {
    const dates = new Set(selections.map(s => s.dateStr));
    return dates.size;
  };

  return (
    <div className="ia-grid-container" onMouseUp={handleMouseUp}>
      
      <div className="ia-nav-bar">
        <div style={{display:'flex', gap:'10px'}}>
          <button className="back-button-original" onClick={onBack}>← Retour</button>
        </div>
        
        <div className="ia-nav-center">
          <button className="ia-nav-btn secondary" onClick={() => changeMonth(-1)}>◀◀ Mois</button>
          <button className="ia-nav-btn primary" onClick={() => changeWeek(-7)}>◀ Semaine</button>
          
          <div className="ia-central-date">
            Semaine du {currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          
          <button className="ia-nav-btn primary" onClick={() => changeWeek(7)}>Semaine ▶</button>
          <button className="ia-nav-btn secondary" onClick={() => changeMonth(1)}>Mois ▶▶</button>
        </div>
        
        <div style={{width:'100px'}}></div>
      </div>

      <div className="ia-layout">
        
        <div className="ia-sidebar">
          <div className={`ia-photos-grid ${showForm ? 'faded' : ''}`}>
            {IA_TOOLS.map(tool => (
              <div 
                key={tool.id} 
                className={`ia-photo-card ${activeDesc === tool.id ? 'active-desc' : ''}`}
                onClick={() => setActiveDesc(activeDesc === tool.id ? null : tool.id)}
                style={{ 
                  backgroundColor: tool.imageColor,
                  backgroundImage: `url(${process.env.PUBLIC_URL + tool.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="ia-photo-placeholder" style={{ opacity: 0 }}>{tool.nom}</div>
                <div className="ia-photo-overlay">
                  <div className="ia-desc-title">{tool.nom}</div>
                  <div className="ia-desc-text">{tool.description}</div>
                </div>
                <div className="ia-card-footer-title">{tool.nom}</div>
              </div>
            ))}
          </div>

          <div className={`ia-form-wrapper ${showForm ? 'visible' : ''}`}>
            <div className="ia-form-container">
              <h3 className="form-title-ia">Nouvelle Réservation</h3>
              
              <div className="selections-summary-ia">
                <div className="summary-header">
                  <strong>{selections.length} créneaux</strong> sur <strong>{getDaysCount()} jour(s)</strong>
                </div>
                <div className="summary-list">
                  {selections.map((sel, idx) => (
                    <div key={idx} className="summary-item">
                      <span>{sel.toolName} • {sel.date.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric'})} ({sel.period})</span>
                      <button className="remove-btn" onClick={() => removeSelection(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="form-row">
                  <input className="form-input" placeholder="Nom *" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                  <input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
                <input className="form-input" placeholder="Email *" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <select className="form-select" required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>
                  <option value="">Service *</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-select" required value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})}>
                  <option value="">Motif *</option>
                  {OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                
                <textarea 
                  className="form-textarea" 
                  placeholder="Commentaire (facultatif)" 
                  rows="2" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />

                <div className="recurrence-section-styled">
                  <div className="recurrence-box">
                    <input type="checkbox" checked={formData.recurrence} onChange={e => setFormData({...formData, recurrence: e.target.checked})} />
                    <label>Réservation récurrente</label>
                  </div>
                  {formData.recurrence && (
                    <div className="recurrence-options slide-down">
                      <div className="form-group">
                        <select className="form-select" value={formData.recurrenceType} onChange={e => setFormData({...formData, recurrenceType: e.target.value})}>
                          <option value="weekly">Chaque semaine</option>
                          <option value="biweekly">Une semaine sur 2</option>
                          <option value="monthly">Chaque mois</option>
                        </select>
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <input type="date" className="form-input" value={formData.recurrenceJusquau} onChange={e => setFormData({...formData, recurrenceJusquau: e.target.value})} min={googleSheetsService.formatDate(new Date())} required={formData.recurrence} />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setSelections([]); setShowForm(false); }}>Annuler</button>
                  <button type="submit" className="btn-submit" disabled={isSubmitting} style={{background:'#6200ea'}}>Confirmer</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="ia-grid-section" onMouseLeave={() => setIsDragging(false)}>
          <table className="ia-table">
            <thead>
              <tr>
                <th>Outil IA</th>
                {weekDates.map((d, i) => (
                  <th key={i}>
                    {weekDays[i]} <br/> <small>{d.getDate()}/{d.getMonth()+1}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IA_TOOLS.map((tool, tIdx) => (
                <tr key={tool.id}>
                  <td className="ia-row-header">{tool.nom}</td>
                  {weekDates.map((date, dIdx) => {
                    const dateStr = googleSheetsService.formatDate(date);
                    const matinOcc = isOccupied(tool.id, dateStr, 'Matin');
                    const amOcc = isOccupied(tool.id, dateStr, "Après-midi");
                    
                    const isMatinSel = selections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === 'Matin');
                    const isAmSel = selections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === 'Après-midi');
                    
                    const isMatinDrag = isSlotInSelection(tIdx, dIdx, 0);
                    const isAmDrag = isSlotInSelection(tIdx, dIdx, 1);

                    return (
                      <td key={dIdx}>
                        <div className="ia-sub-row">
                          <div 
                            className={`ia-slot ${matinOcc ? 'occupied' : isMatinSel || isMatinDrag ? 'selected' : ''}`}
                            onMouseDown={() => handleMouseDown(tIdx, dIdx, 0)}
                            onMouseEnter={() => handleMouseEnter(tIdx, dIdx, 0)}
                          >
                            <span className="ia-time-label">Matin</span>
                            {matinOcc ? 'Occupé' : 'Libre'}
                          </div>
                          <div 
                            className={`ia-slot ${amOcc ? 'occupied' : isAmSel || isAmDrag ? 'selected' : ''}`}
                            onMouseDown={() => handleMouseDown(tIdx, dIdx, 1)}
                            onMouseEnter={() => handleMouseEnter(tIdx, dIdx, 1)}
                          >
                            <span className="ia-time-label">A.M.</span>
                            {amOcc ? 'Occupé' : 'Libre'}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {errorModal.show && createPortal(
        <div className="blocked-modal-overlay" onClick={() => setErrorModal({show:false, message:''})}>
          <div className="blocked-modal">
            <div className="warning-modal-header" style={{background:'#ef5350'}}>
              <span className="blocked-modal-emoji">⛔</span>
              <h2 className="blocked-modal-title">Attention</h2>
            </div>
            <p className="blocked-modal-message">{errorModal.message}</p>
            <button className="blocked-close-button" onClick={() => setErrorModal({show:false, message:''})}>Compris</button>
          </div>
        </div>, document.body
      )}

      {warningModal.show && createPortal(
        <div className="modal-overlay">
          <div className="warning-modal">
            <div className="warning-modal-header"><h2>⚠️ Conflit de réservation</h2></div>
            <div className="warning-modal-body">
              <p>{warningModal.conflicts.length} créneaux sont déjà réservés :</p>
              <div className="conflict-list">
                {warningModal.conflicts.map((c, i) => (
                  <li key={i}>{c.salle} • {new Date(c.dateDebut).toLocaleDateString()} ({c.heureDebut === '08:00' ? 'Matin' : 'A.M.'})</li>
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
        </div>, document.body
      )}

      {isSubmitting && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Enregistrement... ({submissionProgress.current} / {submissionProgress.total})</h3>
            <div style={{width:'100%',background:'#eee',height:'10px',borderRadius:'5px'}}>
              <div style={{width:`${(submissionProgress.current/submissionProgress.total)*100}%`,background:'#6200ea',height:'100%',transition:'width 0.3s ease'}}></div>
            </div>
          </div>
        </div>, document.body
      )}

      {successModal.show && createPortal(
        <div className="success-modal-overlay" onClick={() => setSuccessModal({show:false, count:0})}>
          <div className="success-modal">
            <div className="success-modal-header" style={{background:'#00bfa5'}}>
              <h2>✅ Réservation confirmée !</h2>
            </div>
            <div className="success-modal-body">
              <p style={{textAlign:'center', fontSize:'1.1rem'}}>
                {successModal.count} créneau(x) enregistré(s) avec succès.
              </p>
            </div>
            <div className="success-modal-footer">
              <button className="close-modal-button" onClick={() => setSuccessModal({show:false, count:0})}>Fermer</button>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}

export default IAGrid;