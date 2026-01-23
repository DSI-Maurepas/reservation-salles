// src/components/IAGrid.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { SERVICES, JOURS_FERIES, OBJETS_VEHICULE } from '../config/googleSheets';
import { IA_TOOLS } from '../data/iaData';
import './IAGrid.css';

// ✅ AJOUT PROP editingReservation
function IAGrid({ onBack, editingReservation }) {
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

  // --- GESTION SÉLECTION & DISPLAY ---
  const [selections, setSelections] = useState([]);
  const [sidebarMode, setSidebarMode] = useState('form'); 
  const [selectedInfoTool, setSelectedInfoTool] = useState(null); 
  
  const [isClosingInfo, setIsClosingInfo] = useState(false);
  const [popoverInfo, setPopoverInfo] = useState(null); 
  const [isClosingPopover, setIsClosingPopover] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  const [formData, setFormData] = useState({ 
    nom: '', prenom: '', email: '', service: '', objet: '', description: '',
    recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });
  
  const [successModal, setSuccessModal] = useState({ show: false, count: 0 });
  const [warningModal, setWarningModal] = useState({ show: false, conflicts: [], validReservations: [] });
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  useEffect(() => { loadIAReservations(); }, [currentWeekStart]);

  useEffect(() => { 
    if (selections.length > 0) {
      setSidebarMode('form');
      closePopover();
    }
  }, [selections]);

  // ✅ EFFET POUR CHARGER L'ÉDITION
  useEffect(() => {
    if (editingReservation) {
      // 1. Pré-remplir le formulaire
      setFormData({
        nom: editingReservation.nom,
        prenom: editingReservation.prenom,
        email: editingReservation.email,
        service: editingReservation.service,
        objet: editingReservation.objet, // Nouveau champ motif
        description: editingReservation.description || '',
        recurrence: false,
        recurrenceType: 'weekly',
        recurrenceJusquau: ''
      });

      // 2. Positionner le calendrier
      const dateRes = new Date(editingReservation.dateDebut);
      setCurrentWeekStart(getMonday(dateRes));

      // 3. Sélectionner le créneau (Surbrillance)
      const tool = IA_TOOLS.find(t => t.id === editingReservation.toolId);
      if (tool) {
        const periodName = editingReservation.heureDebut === '08:00' ? 'Matin' : 'Après-midi';
        const toolIndex = IA_TOOLS.indexOf(tool);
        
        const newSelections = [{
          toolIndex: toolIndex,
          toolId: tool.id,
          toolName: tool.nom,
          date: dateRes,
          dateStr: editingReservation.dateDebut,
          period: periodName,
          periodIndex: periodName === 'Matin' ? 0 : 1
        }];
        setSelections(newSelections);
        setSidebarMode('form');
      }
    }
  }, [editingReservation]);

  useEffect(() => {
    if (popoverInfo) {
      const timer = setTimeout(() => { closePopover(); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [popoverInfo]);

  useEffect(() => {
    if (selectedInfoTool) {
      const timer = setTimeout(() => { closeInfoPanel(); }, 14000); 
      return () => clearTimeout(timer);
    }
  }, [selectedInfoTool]);

  const loadIAReservations = async () => {
    setLoading(true);
    try {
      const res = await googleSheetsService.getAllIAReservations();
      // En mode édition, on filtre la réservation en cours pour ne pas la marquer comme occupée
      if (editingReservation) {
        setReservations(res.filter(r => r.id !== editingReservation.id));
      } else {
        setReservations(res);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- NAVIGATION ---
  const changeWeek = (days) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + days);
    setCurrentWeekStart(newDate);
    setSelections([]);
    closePopover();
  };

  const changeMonth = (months) => {
    const newDate = new Date(currentWeekStart);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentWeekStart(getMonday(newDate));
    setSelections([]);
    closePopover();
  };

  const resetToToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
    setSelections([]);
    closePopover();
  };

  const handleToolHeaderClick = (tool) => {
    setSelectedInfoTool(tool);
    setSidebarMode('info');
    setIsClosingInfo(false); 
    closePopover(); 
  };

  const closeInfoPanel = () => {
    if (selectedInfoTool) {
      setIsClosingInfo(true);
      setTimeout(() => {
        setSelectedInfoTool(null);
        setIsClosingInfo(false);
        setSidebarMode('form'); 
      }, 800); 
    }
  };

  const closePopover = () => {
    if (popoverInfo) {
      setIsClosingPopover(true);
      setTimeout(() => {
        setPopoverInfo(null);
        setIsClosingPopover(false);
      }, 190); 
    }
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getReservation = (toolId, dateStr, period) => {
    return reservations.find(res => 
      res.toolId === toolId && 
      res.dateDebut === dateStr && 
      res.statut !== 'cancelled' &&
      (period === 'Matin' ? res.heureDebut === '08:00' : res.heureDebut === '12:30')
    );
  };

  const isOccupied = (toolId, dateStr, period) => {
    return !!getReservation(toolId, dateStr, period);
  };

  const checkIfPast = (date, period) => {
    const now = new Date();
    const slotStart = new Date(date);
    if (period === 'Matin') {
        slotStart.setHours(8, 0, 0, 0);
    } else {
        slotStart.setHours(12, 30, 0, 0); 
    }
    return now > slotStart;
  };

  const getReservationRangeInfo = (res) => {
    if (!res) return null;
    const userRes = reservations.filter(r => 
      r.toolId === res.toolId && r.nom === res.nom && r.prenom === res.prenom && r.statut !== 'cancelled'
    ).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));
    const index = userRes.findIndex(r => r.id === res.id);
    if (index === -1) return null;
    let start = index;
    while (start > 0) {
      const curr = new Date(userRes[start].dateDebut);
      const prev = new Date(userRes[start - 1].dateDebut);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) start--; else break;
    }
    let end = index;
    while (end < userRes.length - 1) {
      const curr = new Date(userRes[end].dateDebut);
      const next = new Date(userRes[end + 1].dateDebut);
      const diffDays = (next - curr) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) end++; else break;
    }
    const first = userRes[start];
    const last = userRes[end];
    const d1 = new Date(first.dateDebut).toLocaleDateString('fr-FR');
    const p1 = first.heureDebut === '08:00' ? 'AM' : 'PM';
    const d2 = new Date(last.dateDebut).toLocaleDateString('fr-FR');
    const p2 = last.heureDebut === '08:00' ? 'AM' : 'PM';
    if (first.id === last.id) return `Le ${d1} ${p1}`;
    else return `Du ${d1} ${p1} au ${d2} ${p2}`;
  };

  const handleMouseDown = (e, toolIndex, dayIndex, periodIndex) => {
    e.preventDefault(); 
    e.stopPropagation();
    const tool = IA_TOOLS[toolIndex];
    const date = weekDates[dayIndex];
    const dateStr = googleSheetsService.formatDate(date);
    const period = periodIndex === 0 ? 'Matin' : 'Après-midi';
    
    const existingRes = getReservation(tool.id, dateStr, period);
    if (existingRes) {
      const rangeText = getReservationRangeInfo(existingRes);
      setPopoverInfo({
        data: { ...existingRes, rangeText },
        x: e.clientX,
        y: e.clientY
      });
      setIsClosingPopover(false);
      return;
    }
    if (checkIfPast(date, period)) return;
    setSidebarMode('form');
    closePopover(); 
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
    const start = dragStart;
    const current = dragCurrent;
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    const minTool = Math.min(start.toolIndex, current.toolIndex);
    const maxTool = Math.max(start.toolIndex, current.toolIndex);
    const minDay = Math.min(start.dayIndex, current.dayIndex);
    const maxDay = Math.max(start.dayIndex, current.dayIndex);
    
    if (minTool === maxTool && minDay === maxDay && start.periodIndex === current.periodIndex) {
        const tool = IA_TOOLS[minTool];
        const date = weekDates[minDay];
        const dateStr = googleSheetsService.formatDate(date);
        const period = start.periodIndex === 0 ? 'Matin' : 'Après-midi';
        const existingIndex = selections.findIndex(s => 
            s.toolId === tool.id && s.dateStr === dateStr && s.period === period
        );
        if (existingIndex !== -1) {
            removeSelection(existingIndex);
            return;
        }
    }
    
    let newSelections = [...selections];
    const tempSelections = [];

    const startV = start.toolIndex * 2 + start.periodIndex;
    const currentV = current.toolIndex * 2 + current.periodIndex;
    const minV = Math.min(startV, currentV);
    const maxV = Math.max(startV, currentV);

    for (let t = 0; t < IA_TOOLS.length; t++) {
      for (let d = minDay; d <= maxDay; d++) { 
        for (let p = 0; p <= 1; p++) {
          const vIndex = t * 2 + p;
          if (vIndex >= minV && vIndex <= maxV) {
            const tool = IA_TOOLS[t];
            const date = weekDates[d];
            const periodName = p === 0 ? 'Matin' : 'Après-midi';
            const dateStr = googleSheetsService.formatDate(date);
            if (!isOccupied(tool.id, dateStr, periodName) && !checkIfPast(date, periodName)) {
              if (!newSelections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === periodName)) {
                 tempSelections.push({ toolIndex: t, toolId: tool.id, toolName: tool.nom, date: date, dateStr: dateStr, period: periodName, periodIndex: p });
              }
            }
          }
        }
      }
    }
    validateAndAddSelections(newSelections, tempSelections);
  };

  const validateAndAddSelections = (currentSels, newSels) => {
    const combined = [...currentSels, ...newSels];
    const uniqueTools = new Set(combined.map(s => s.toolId));
    if (uniqueTools.size > 2) {
      setErrorModal({ show: true, message: "⛔ Vous ne pouvez pas réserver plus de 2 outils IA différents simultanément." });
      return;
    }
    if (combined.length > 0) {
      const dates = combined.map(s => s.date.getTime()).sort((a,b) => a-b);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 6) {
        setErrorModal({ show: true, message: "⛔ La période de réservation ne peut pas dépasser 7 jours consécutifs." });
        return;
      }
    }
    setSelections(combined.sort((a,b) => {
        if (a.toolIndex !== b.toolIndex) return a.toolIndex - b.toolIndex;
        if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
        return (a.period === 'Matin' ? -1 : 1);
    }));
  };

  const removeSelection = (index) => {
    const newSels = [...selections];
    newSels.splice(index, 1);
    setSelections(newSels);
  };

  const removeGroupSelection = (itemsToRemove) => {
    const newSels = selections.filter(s => 
      !itemsToRemove.some(rem => rem.toolId === s.toolId && rem.dateStr === s.dateStr && rem.period === s.period)
    );
    setSelections(newSels);
  };

  const isSlotInSelection = (tIdx, dIdx, pIdx) => {
    if (!isDragging || !dragStart || !dragCurrent) return false;
    const startV = dragStart.toolIndex * 2 + dragStart.periodIndex;
    const currentV = dragCurrent.toolIndex * 2 + dragCurrent.periodIndex;
    const minV = Math.min(startV, currentV);
    const maxV = Math.max(startV, currentV);
    const minD = Math.min(dragStart.dayIndex, dragCurrent.dayIndex);
    const maxD = Math.max(dragStart.dayIndex, dragCurrent.dayIndex);
    const currentVIdx = tIdx * 2 + pIdx;
    return currentVIdx >= minV && currentVIdx <= maxV && dIdx >= minD && dIdx <= maxD; 
  };

  const getDaysCount = () => {
    const dates = new Set(selections.map(s => s.dateStr));
    return dates.size;
  };

  const getDisplayList = () => {
    const grouped = {};
    selections.forEach(sel => {
      const key = `${sel.toolId}_${sel.dateStr}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sel);
    });
    const list = [];
    Object.values(grouped).forEach(group => {
      if (group.length === 2) {
        list.push({ isGroup: true, toolName: group[0].toolName, date: group[0].date, label: 'Journée', items: group });
      } else {
        group.forEach(item => {
          list.push({ isGroup: false, toolName: item.toolName, date: item.date, label: item.period === 'Matin' ? 'AM' : 'PM', items: [item] });
        });
      }
    });
    return list.sort((a, b) => {
      const nameCompare = a.toolName.localeCompare(b.toolName);
      if (nameCompare !== 0) return nameCompare;
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.label.localeCompare(b.label);
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionProgress({ current: 0, total: selections.length });
    try {
      let allCandidates = [];
      selections.forEach(sel => {
        const baseRes = {
          toolId: sel.toolId, salle: sel.toolName, dateDebut: sel.dateStr,
          heureDebut: sel.period === 'Matin' ? '08:00' : '12:30',
          heureFin: sel.period === 'Matin' ? '12:30' : '17:30',
          // ✅ ENVOI DU MOTIF CHOISI DANS 'objet'
          ...formData, telephone: '', objet: formData.objet
        };
        allCandidates.push(baseRes);
        if (formData.recurrence && formData.recurrenceJusquau) {
           let nextDate = new Date(sel.date);
           const endDate = new Date(formData.recurrenceJusquau);
           endDate.setHours(23, 59, 59, 999);
           while (true) {
             if (formData.recurrenceType === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
             else if (formData.recurrenceType === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
             else if (formData.recurrenceType === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
             if (nextDate > endDate) break;
             const dStr = googleSheetsService.formatDate(nextDate);
             allCandidates.push({ ...baseRes, dateDebut: dStr });
           }
        }
      });
      setSubmissionProgress({ current: 0, total: allCandidates.length });
      const allExisting = await googleSheetsService.getAllIAReservations(true);
      const conflicts = [];
      const valid = [];
      allCandidates.forEach(cand => {
        const isConflict = allExisting.some(exist => 
          exist.statut !== 'cancelled' && exist.toolId === cand.toolId &&
          exist.dateDebut === cand.dateDebut && exist.heureDebut === cand.heureDebut
        );
        if (isConflict) conflicts.push(cand); else valid.push(cand);
      });
      if (conflicts.length > 0) {
        setIsSubmitting(false);
        setWarningModal({ show: true, conflicts, validReservations: valid });
        return;
      }
      await finalizeReservation(valid);
    } catch (error) { alert('Erreur: ' + error.message); setIsSubmitting(false); }
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
      // Reset form including objet
      setFormData({ nom: '', prenom: '', email: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '' });
    } catch(e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleCancelSelection = () => { 
    setSelections([]); 
    setFormData({ nom: '', prenom: '', email: '', service: '', objet: '', description: '', recurrence: false, recurrenceType: 'weekly', recurrenceJusquau: '' });
    // ✅ RETOUR ARRIÈRE SÉCURISÉ
    if (editingReservation && onBack) {
      onBack();
    }
  };

  const displaySelections = getDisplayList();

  return (
    <div className="ia-grid-container" onMouseUp={handleMouseUp}>
      
      <div className="ia-nav-bar">
        {/* ✅ MODIFICATION : Bouton Retour + Titre IA alignés */}
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <button className="back-button-original" onClick={onBack}>← Retour</button>
          <h2 className="ia-title-inline">
            <span style={{fontSize:'1.5rem'}}>🤖</span> IA 
            {/* ✅ INDICATEUR MODIFICATION */}
            {editingReservation && <span style={{fontSize:'0.8em', color:'#ef5350', marginLeft:'8px'}}>(Modification)</span>}
          </h2>
        </div>

        <div className="ia-nav-center">
          <button className="ia-nav-btn secondary" onClick={() => changeMonth(-1)}>◀◀ <span className="ia-nav-label"></span></button>
          <button className="ia-nav-btn primary" onClick={() => changeWeek(-7)}>◀ <span className="ia-nav-label"></span></button>
          <button className="ia-nav-btn secondary" onClick={resetToToday}><span className="ia-nav-label">Cette semaine</span></button>
          
          {/* ✅ MODIFICATION AFFICHAGE DATE : RANGE */}
          <div className="ia-central-date">
            {currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate()+6)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} {currentWeekStart.getFullYear()}
          </div>
          
          <button className="ia-nav-btn primary" onClick={() => changeWeek(7)}><span className="ia-nav-label"></span> ▶</button>
          <button className="ia-nav-btn secondary" onClick={() => changeMonth(1)}><span className="ia-nav-label"></span> ▶▶</button>
        </div>
        <div style={{width:'100px'}}></div>
      </div>

      <div className="ia-layout">
        <div className="ia-sidebar">
          
          <div 
            className={`ia-info-panel ${selectedInfoTool ? 'visible' : ''} ${isClosingInfo ? 'fade-out' : ''}`}
            onClick={closeInfoPanel}
          >
             {selectedInfoTool ? (
                <div className="ia-detail-card">
                  <div className="ia-detail-image" style={{ backgroundImage: `url(${process.env.PUBLIC_URL + selectedInfoTool.image})` }}></div>
                  <div className="ia-detail-content">
                    <h3>{selectedInfoTool.nom}</h3>
                    <p><strong>Description :</strong> {selectedInfoTool.description}</p>
                    <div className="ia-extra-info">
                      <h4>🔍 Cas d'usage recommandés :</h4>
                      <ul>
                        {selectedInfoTool.useCases ? selectedInfoTool.useCases.map((useCase, idx) => (<li key={idx}>{useCase}</li>)) : <li>Analyse et synthèse de documents.</li>}
                      </ul>
                      <p style={{marginTop:'1rem', fontSize:'0.9rem'}}><em>L'utilisation de cet outil est soumise à la charte informatique de la ville. Aucune donnée personnelle sensible (RGPD) ne doit être saisie dans les prompts.</em></p>
                    </div>
                  </div>
                </div>
             ) : (
               <div className="ia-placeholder-msg">Cliquez sur la photo d'une IA dans la grille (colonne de gauche) pour afficher sa fiche détaillée.</div>
             )}
          </div>

          <div className={`ia-form-wrapper ${sidebarMode === 'form' ? 'visible' : ''}`}>
            <div className="ia-form-container">
              <h3 className="form-title-ia">Nouvelle Réservation</h3>
              <div className="selections-summary-ia">
                <div className="summary-header"><strong>{selections.length} créneaux</strong> sur <strong>{getDaysCount()} jour(s)</strong></div>
                <div className="summary-list">
                  {displaySelections.map((item, idx) => (
                    <div key={idx} className="summary-item">
                      <span>{item.toolName} • {item.date.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric'})} ({item.label})</span>
                      <button className="remove-btn" onClick={() => removeGroupSelection(item.items)}>✕</button>
                    </div>
                  ))}
                  {selections.length === 0 && <span style={{fontSize:'0.8rem', fontStyle:'italic', color:'#666'}}>Aucun créneau sélectionné. Cliquez ou glissez sur la grille.</span>}
                </div>
              </div>
              <div className="form-content-scroll">
                <form onSubmit={handleFormSubmit} id="ia-booking-form">
                  <div className="form-row">
                    <input className="form-input" placeholder="Nom *" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                    <input className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                  </div>
                  <input className="form-input" placeholder="Email *" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <select className="form-select" required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>
                    <option value="">Service *</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                  {/* ✅ NOUVEAU CHAMP MOTIF OBLIGATOIRE */}
                  <select className="form-select" required value={formData.objet} onChange={e => setFormData({...formData, objet: e.target.value})}>
                    <option value="">Motif *</option>
                    {['Déplacement dans Maurepas', 'Déplacement hors de Maurepas'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>

                  <textarea className="form-textarea" placeholder="Commentaire (facultatif)" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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
                    <button type="button" className="btn-cancel" onClick={handleCancelSelection}>Annuler</button>
                    <button type="submit" form="ia-booking-form" className="btn-submit" disabled={isSubmitting || selections.length === 0}>Valider</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="ia-grid-section" onMouseLeave={() => setIsDragging(false)}>
          <table className="ia-table">
            <thead>
              <tr>
                <th style={{minWidth:'100px'}}>IA</th>
                {weekDates.map((d, i) => (<th key={i}>{weekDays[i]} <br/> <small>{d.getDate()}/{d.getMonth()+1}</small></th>))}
              </tr>
            </thead>
            <tbody>
              {IA_TOOLS.map((tool, tIdx) => (
                <tr key={tool.id}>
                  <td className="ia-row-image-cell" onClick={() => handleToolHeaderClick(tool)} title="Cliquez pour voir les détails">
                    <div className="ia-row-thumb" style={{ backgroundImage: `url(${process.env.PUBLIC_URL + tool.image})` }}></div>
                  </td>
                  {weekDates.map((date, dIdx) => {
                    const dateStr = googleSheetsService.formatDate(date);
                    const matinOcc = isOccupied(tool.id, dateStr, 'Matin');
                    const amOcc = isOccupied(tool.id, dateStr, "Après-midi");
                    const isMatinSel = selections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === 'Matin');
                    const isAmSel = selections.some(s => s.toolId === tool.id && s.dateStr === dateStr && s.period === 'Après-midi');
                    const isMatinDrag = isSlotInSelection(tIdx, dIdx, 0);
                    const isAmDrag = isSlotInSelection(tIdx, dIdx, 1);
                    const matinPast = checkIfPast(date, 'Matin');
                    const amPast = checkIfPast(date, 'Après-midi');

                    // ✅ MODIFICATION : Vérification "isMatinSel" + "editingReservation" pour appliquer la classe
                    let matinClass = `ia-slot ${matinOcc ? 'occupied' : matinPast ? 'past' : isMatinSel || isMatinDrag ? 'selected' : 'free'}`;
                    if (isMatinSel && editingReservation) matinClass += ' editing-pulse';

                    let amClass = `ia-slot ${amOcc ? 'occupied' : amPast ? 'past' : isAmSel || isAmDrag ? 'selected' : 'free'}`;
                    if (isAmSel && editingReservation) amClass += ' editing-pulse';

                    return (
                      <td key={dIdx}>
                        <div className="ia-sub-row">
                          <div className={matinClass}
                            onMouseDown={(e) => handleMouseDown(e, tIdx, dIdx, 0)} onMouseEnter={() => handleMouseEnter(tIdx, dIdx, 0)}>
                            <span className="ia-time-label">AM</span>{matinOcc ? 'Réservé' : ''}
                          </div>
                          <div className={amClass}
                            onMouseDown={(e) => handleMouseDown(e, tIdx, dIdx, 1)} onMouseEnter={() => handleMouseEnter(tIdx, dIdx, 1)}>
                            <span className="ia-time-label">PM</span>{amOcc ? 'Réservé' : ''}
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

      {popoverInfo && createPortal(
        <div 
          className={`ia-popover-card ${isClosingPopover ? 'fade-out' : ''}`}
          style={{ top: popoverInfo.y, left: popoverInfo.x }}
          onClick={closePopover}
        >
          <div className="ia-popover-header">
            👤 {popoverInfo.data.prenom} {popoverInfo.data.nom}
          </div>
          <div className="ia-popover-body">
            <div className="ia-popover-row">🏢 {popoverInfo.data.service}</div>
            <div className="ia-popover-row">📧 {popoverInfo.data.email}</div>
            <div className="ia-popover-time">
              📅 {popoverInfo.data.rangeText}
            </div>
          </div>
        </div>,
        document.body
      )}

      {errorModal.show && createPortal(<div className="blocked-modal-overlay" onClick={() => setErrorModal({show:false, message:''})}><div className="blocked-modal"><div className="warning-modal-header" style={{background:'#ef5350'}}><span className="blocked-modal-emoji">⛔</span><h2 className="blocked-modal-title">Attention</h2></div><p className="blocked-modal-message">{errorModal.message}</p><button className="blocked-close-button" onClick={() => setErrorModal({show:false, message:''})}>Compris</button></div></div>, document.body)}
      {warningModal.show && createPortal(<div className="modal-overlay"><div className="warning-modal"><div className="warning-modal-header"><h2>⚠️ Conflit de réservation</h2></div><div className="warning-modal-body"><p>{warningModal.conflicts.length} créneaux sont déjà réservés :</p><div className="conflict-list">{warningModal.conflicts.map((c, i) => (<li key={i}>{c.salle} • {new Date(c.dateDebut).toLocaleDateString()} ({c.heureDebut === '08:00' ? 'Matin' : 'PM'})</li>))}</div></div><div className="warning-modal-footer"><button className="btn-cancel" onClick={() => setWarningModal({show:false, conflicts:[], validReservations:[]})}>Annuler</button>{warningModal.validReservations.length > 0 && (<button className="btn-submit" onClick={() => finalizeReservation(warningModal.validReservations)}>Valider les {warningModal.validReservations.length} disponibles</button>)}</div></div></div>, document.body)}
      {isSubmitting && createPortal(<div className="modal-overlay"><div className="modal-content"><h3>Enregistrement... ({submissionProgress.current} / {submissionProgress.total})</h3><div style={{width:'100%',background:'#eee',height:'10px',borderRadius:'5px'}}><div style={{width:`${(submissionProgress.current/submissionProgress.total)*100}%`,background:'#0f6aba',height:'100%',transition:'width 0.3s ease'}}></div></div></div></div>, document.body)}
      {successModal.show && createPortal(<div className="success-modal-overlay" onClick={() => setSuccessModal({show:false, count:0})}><div className="success-modal"><div className="success-modal-header" style={{background:'#4caf50'}}><h2>✅ Réservation confirmée !</h2></div><div className="success-modal-body"><p style={{textAlign:'center', fontSize:'1.1rem'}}>{successModal.count} créneau(x) enregistré(s) avec succès.</p></div><div className="success-modal-footer"><button className="close-modal-button" onClick={() => setSuccessModal({show:false, count:0})}>Fermer</button></div></div></div>, document.body)}
    </div>
  );
}

export default IAGrid;