// src/components/ReservationGrid.js
// VERSION CORRIGÉE - Gestion complète des champs pour Google Sheets
import React, { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES, SALLES_ADMIN_ONLY, ADMINISTRATEURS, COULEURS_OBJETS, JOURS_FERIES } from '../config/googleSheets';
import { sallesData } from '../data/sallesData';
import ColorLegend from './ColorLegend';
import SalleCard from './SalleCard';
import './ReservationGrid.css';

// Debug: Forcer l'inclusion de COULEURS_OBJETS dans le build
console.log('COULEURS_OBJETS chargé:', Object.keys(COULEURS_OBJETS).length, 'couleurs');

function ReservationGrid({ selectedDate, editReservationId, onBack, onSuccess }) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]); // Array de sélections validées
  const [currentSelection, setCurrentSelection] = useState(null); // Sélection en cours de drag
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredObjet, setHoveredObjet] = useState(null); // Pour l'effet de survol de la légende
  const [hoveredSalle, setHoveredSalle] = useState(null); // Pour afficher la carte salle au survol
  const [hoveredReservation, setHoveredReservation] = useState(null); // Pour la popup info réservation
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 }); // Position de la popup
  const [loading, setLoading] = useState(true);
  const [successModal, setSuccessModal] = useState({ show: false, count: 0 });
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, salle: '', slot: null, password: '' });
  const [blockedDayModal, setBlockedDayModal] = useState(false); // Modal jour bloqué

  // États du formulaire
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: localStorage.getItem('userEmail') || '',
    telephone: '',
    service: SERVICES[0],
    objet: OBJETS_RESERVATION[0],
    description: '',
    recurrence: false,
    recurrenceFin: '',
    agencement: '' // Nouvel état pour l'agencement
  });

  // Fonction pour vérifier si un jour est bloqué (dimanche ou férié)
  const isDayBlocked = useCallback((date) => {
    const dayOfWeek = date.getDay(); // 0 = Dimanche
    const dateStr = googleSheetsService.formatDate(date);
    
    return dayOfWeek === 0 || JOURS_FERIES.includes(dateStr);
  }, []);

  // Charger les données
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Vérifier si le jour est bloqué
      if (isDayBlocked(currentDate)) {
        setBlockedDayModal(true);
      }
      
      const data = await googleSheetsService.getAllReservations();
      // Filtrer pour la date affichée
      const dateStr = googleSheetsService.formatDate(currentDate);
      const filtered = data.filter(res => res.dateDebut === dateStr);
      setReservations(filtered);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, isDayBlocked]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Si on est en mode édition, charger les données de la réservation
  useEffect(() => {
    const loadEditData = async () => {
      if (editReservationId) {
        try {
          const reservation = await googleSheetsService.getReservationById(editReservationId);
          if (reservation) {
            // Pré-remplir le formulaire
            setFormData({
              nom: reservation.nom,
              prenom: reservation.prenom,
              email: reservation.email,
              telephone: reservation.telephone,
              service: reservation.service,
              objet: reservation.objet,
              description: reservation.description,
              recurrence: reservation.recurrence,
              recurrenceJusquau: reservation.recurrenceJusquau || '',
              agencement: reservation.agencement || ''
            });
            
            // Pré-sélectionner le créneau
            setSelections([{
              salle: reservation.salle,
              date: reservation.dateDebut,
              heure: reservation.heureDebut,
              id: Date.now()
            }]);
          }
        } catch (error) {
          console.error("Erreur chargement édition:", error);
        }
      }
    };
    
    if (editReservationId) {
      loadEditData();
    }
  }, [editReservationId]);

  // Gestion de la navigation
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
    setSelections([]); // Reset sélections au changement de date
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
    setSelections([]);
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelections([]);
  };

  const handleWeekPrev = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
    setSelections([]);
  };

  const handleWeekNext = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
    setSelections([]);
  };

  // Gestion du Drag & Drop pour la sélection
  const handleMouseDown = (salle, heure) => {
    // 1. Vérifier si jour bloqué
    if (isDayBlocked(currentDate)) {
      setBlockedDayModal(true);
      return;
    }

    // 2. Vérifier si admin requis
    if (SALLES_ADMIN_ONLY.includes(salle) && !localStorage.getItem('adminAuthenticated')) {
      setAdminPasswordModal({
        show: true,
        salle: salle,
        slot: { salle, heure },
        password: ''
      });
      return;
    }

    setIsDragging(true);
    setCurrentSelection({
      salle: salle,
      start: parseInt(heure.split(':')[0]),
      end: parseInt(heure.split(':')[0])
    });
  };

  const handleMouseEnter = (salle, heure) => {
    if (isDragging && currentSelection && currentSelection.salle === salle) {
      const currentHour = parseInt(heure.split(':')[0]);
      setCurrentSelection(prev => ({
        ...prev,
        end: currentHour
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) {
      const start = Math.min(currentSelection.start, currentSelection.end);
      const end = Math.max(currentSelection.start, currentSelection.end);
      
      const newSelections = [];
      const dateStr = googleSheetsService.formatDate(currentDate);
      
      // Créer une sélection pour chaque heure
      for (let h = start; h <= end; h++) {
        const heureStr = `${h.toString().padStart(2, '0')}:00`;
        
        // Vérifier si déjà réservé
        const isReserved = reservations.some(res => 
          res.salle === currentSelection.salle && 
          res.heureDebut === heureStr &&
          res.statut === 'active'
        );
        
        // Vérifier si déjà sélectionné
        const isSelected = selections.some(sel => 
          sel.salle === currentSelection.salle && 
          sel.heure === heureStr
        );

        if (!isReserved && !isSelected) {
          newSelections.push({
            id: Date.now() + h,
            salle: currentSelection.salle,
            date: dateStr,
            heure: heureStr
          });
        }
      }

      setSelections(prev => [...prev, ...newSelections]);
    }
    setIsDragging(false);
    setCurrentSelection(null);
  };

  // Gestion spécifique pour les salles admin
  const handleAdminPasswordSubmit = () => {
    // Vérification simplifiée du mot de passe (à sécuriser en prod)
    if (adminPasswordModal.password === 'MAIRIE2024!') {
      localStorage.setItem('adminAuthenticated', 'true');
      setAdminPasswordModal({ show: false, salle: '', slot: null, password: '' });
      
      // Déclencher la sélection qui était bloquée
      if (adminPasswordModal.slot) {
        const { salle, heure } = adminPasswordModal.slot;
        const dateStr = googleSheetsService.formatDate(currentDate);
        setSelections(prev => [...prev, {
          id: Date.now(),
          salle: salle,
          date: dateStr,
          heure: heure
        }]);
      }
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const removeSelection = (id) => {
    setSelections(prev => prev.filter(sel => sel.id !== id));
  };

  // Soumission du formulaire
  const formatHeureFin = (heureDebut) => {
    const [h] = heureDebut.split(':');
    return `${parseInt(h) + 1}:00`.padStart(5, '0');
  };

  const handleReservationSubmit = async () => {
    if (!formData.nom || !formData.prenom || !formData.email) {
      alert('Veuillez remplir les champs obligatoires (Nom, Prénom, Email)');
      return;
    }

    // Sauvegarder l'email pour la prochaine fois
    localStorage.setItem('userEmail', formData.email);

    try {
      setLoading(true);

      // Pour chaque créneau sélectionné
      const promises = selections.map(sel => {
        // CORRECTION : Calcul de dateFin et transmission agencement
        const heureFinCalculated = formatHeureFin(sel.heure);
        
        const reservationData = {
          salle: sel.salle,
          dateDebut: sel.date,
          heureDebut: sel.heure,
          dateFin: sel.date, // CORRECTION : dateFin explicite
          heureFin: heureFinCalculated,
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone,
          service: formData.service,
          objet: formData.objet,
          description: formData.description,
          recurrence: formData.recurrence,
          recurrenceJusquau: formData.recurrenceFin,
          agencement: formData.agencement || '' // CORRECTION : agencement explicite
        };

        if (editReservationId) {
           return googleSheetsService.updateReservation(editReservationId, reservationData);
        } else {
           return googleSheetsService.addReservation(reservationData);
        }
      });

      const results = await Promise.all(promises);
      
      // Envoyer un seul email de confirmation groupé si possible (ici un par résa pour simplifier)
      if (results.length > 0) {
        // On envoie l'email pour la première réservation comme confirmation principale
        const firstRes = { ...formData, ...selections[0], id: results[0].id };
        // await emailService.sendConfirmation(firstRes); // Décommenter pour activer
      }

      setSuccessModal({ show: true, count: results.length });
      setSelections([]);
      loadData(); // Recharger la grille

    } catch (error) {
      console.error("Erreur lors de la réservation:", error);
      alert(`Erreur technique : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour le survol d'une réservation existante
  const handleReservationMouseEnter = (res, e) => {
    const rect = e.target.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + window.scrollX + (rect.width / 2),
      y: rect.top + window.scrollY
    });
    setHoveredReservation(res);
  };

  const handleReservationMouseLeave = () => {
    setHoveredReservation(null);
  };

  // Rendu des créneaux horaires
  const renderTimeSlot = (salle, heure) => {
    // 1. Vérifier si c'est la pause déjeuner (12h-14h)
    const h = parseInt(heure.split(':')[0]);
    const isLunchBreak = h >= 12 && h < 14;

    // 2. Vérifier si salle admin
    const isAdminRoom = SALLES_ADMIN_ONLY.includes(salle);
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated');
    
    // 3. Trouver une réservation existante
    const reservation = reservations.find(res => 
      res.salle === salle && 
      res.heureDebut === heure &&
      res.statut === 'active'
    );

    // 4. Vérifier si sélectionné
    const isSelected = selections.some(sel => sel.salle === salle && sel.heure === heure);
    const isDragSelected = currentSelection && 
      currentSelection.salle === salle && 
      h >= Math.min(currentSelection.start, currentSelection.end) &&
      h <= Math.max(currentSelection.start, currentSelection.end);

    // 5. Vérifier si jour bloqué
    const isBlocked = isDayBlocked(currentDate);

    // Classes CSS conditionnelles
    let className = 'time-slot';
    if (isBlocked) className += ' blocked';
    else if (reservation) {
      className += ' reserved';
      className += ' occupied'; // Pour le style plein
    }
    else if (isSelected || isDragSelected) className += ' selected';
    else if (isAdminRoom && !isAdminAuthenticated) className += ' admin-only-locked';
    if (isLunchBreak) className += ' lunch-break';

    // Style inline pour la couleur de l'objet
    const style = {};
    if (reservation) {
      const couleur = COULEURS_OBJETS[reservation.objet] || '#e0e0e0';
      style.backgroundColor = couleur;
      style.color = '#fff'; // Texte blanc sur fond coloré
    }

    // Gestion des événements
    const events = isBlocked || reservation ? {} : {
      onMouseDown: () => handleMouseDown(salle, heure),
      onMouseEnter: () => handleMouseEnter(salle, heure),
      onMouseUp: handleMouseUp
    };
    
    // Événements spécifiques pour le survol d'une réservation
    if (reservation) {
      events.onMouseEnter = (e) => handleReservationMouseEnter(reservation, e);
      events.onMouseLeave = handleReservationMouseLeave;
    }

    return (
      <div 
        key={`${salle}-${heure}`}
        className={className}
        style={style}
        {...events}
        title={reservation ? `${reservation.objet} (${reservation.nom})` : ''}
      >
        {reservation ? (
          <span className="reservation-label">
            {reservation.objet}
          </span>
        ) : (
          isAdminRoom && !isAdminAuthenticated && !isLunchBreak && <span className="lock-icon">🔒</span>
        )}
      </div>
    );
  };

  return (
    <div className="reservation-grid-container">
      {/* En-tête avec navigation */}
      <div className="grid-header">
        <button className="back-button-small" onClick={onBack}>
          ← Calendrier
        </button>
        
        <div className="date-navigation-full">
          <div className="nav-week-buttons">
            <button className="nav-week-button" onClick={handleWeekPrev} title="Semaine précédente">◀◀</button>
            <button className="nav-day-button" onClick={handlePrevDay} title="Jour précédent">◀</button>
          </div>
          
          <div className="date-display">
            <h2>
              {currentDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
          </div>
          
          <div className="nav-week-buttons">
            <button className="nav-day-button" onClick={handleNextDay} title="Jour suivant">▶</button>
            <button className="nav-week-button" onClick={handleWeekNext} title="Semaine suivante">▶▶</button>
          </div>
          
          <button className="nav-today-button" onClick={handleToday}>
            Aujourd'hui
          </button>
        </div>
      </div>

      <div className="reservation-content">
        {/* Colonne Gauche : Grille */}
        <div className="grid-column">
          <ColorLegend onHoverColor={setHoveredObjet} />
          
          <div className="reservation-grid">
            {/* En-tête des heures (coin vide) */}
            <div className="grid-corner">Horaires</div>
            
            {/* En-têtes des salles */}
            {SALLES.map(salle => {
              const data = sallesData.find(s => s.nom === salle);
              return (
                <div 
                  key={salle} 
                  className="salle-header"
                  onMouseEnter={() => setHoveredSalle(salle)}
                  onMouseLeave={() => setHoveredSalle(null)}
                >
                  <div className="salle-name" title={salle}>{salle}</div>
                  <div className="salle-capacity">{data ? `(${data.capacite} pers.)` : ''}</div>
                </div>
              );
            })}

            {/* Lignes horaires */}
            {Array.from({ length: HORAIRES.HEURE_FIN - HORAIRES.HEURE_DEBUT }).map((_, i) => {
              const heure = `${(HORAIRES.HEURE_DEBUT + i).toString().padStart(2, '0')}:00`;
              return (
                <React.Fragment key={heure}>
                  <div className="time-label">{heure}</div>
                  {SALLES.map(salle => renderTimeSlot(salle, heure))}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Colonne Droite : Formulaire */}
        <div className="form-column">
          {/* Carte Salle au survol */}
          {hoveredSalle && <SalleCard salle={hoveredSalle} />}
          
          <div className="reservation-form">
            <h3>
              <span className="form-title-line1">Nouvelle Réservation</span>
              <span className="form-title-line2">Complétez les informations</span>
            </h3>

            {/* Liste des créneaux sélectionnés */}
            {selections.length > 0 ? (
              <div className="selections-summary">
                <h4>{selections.length} créneau(x) sélectionné(s)</h4>
                {selections.map(sel => (
                  <div key={sel.id} className="selection-item">
                    <div className="selection-info">
                      <p>{sel.salle}</p>
                      <p>{sel.heure} - {parseInt(sel.heure)+1}:00</p>
                    </div>
                    <button className="remove-selection-btn" onClick={() => removeSelection(sel.id)}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="warning-message">
                👆 Sélectionnez des créneaux dans la grille pour commencer.
                <br/>
                Maintenez le clic pour sélectionner plusieurs heures.
              </div>
            )}

            <div className="form-group">
              <label>Service / Demandeur *</label>
              <select 
                value={formData.service} 
                onChange={e => setFormData({...formData, service: e.target.value})}
              >
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Nom *</label>
              <input 
                type="text" 
                value={formData.nom} 
                onChange={e => setFormData({...formData, nom: e.target.value})}
                placeholder="Votre nom"
              />
            </div>

            <div className="form-group">
              <label>Prénom *</label>
              <input 
                type="text" 
                value={formData.prenom} 
                onChange={e => setFormData({...formData, prenom: e.target.value})}
                placeholder="Votre prénom"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="email@mairie.fr"
              />
            </div>

            <div className="form-group">
              <label>Objet de la réunion *</label>
              <select 
                value={formData.objet} 
                onChange={e => setFormData({...formData, objet: e.target.value})}
                style={{ borderLeft: `5px solid ${COULEURS_OBJETS[formData.objet]}` }}
              >
                {OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Nouveau champ : Agencement */}
            <div className="form-group">
              <label>Disposition souhaitée</label>
              <div className="disposition-select">
                <select
                  value={formData.agencement}
                  onChange={e => setFormData({...formData, agencement: e.target.value})}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                >
                  <option value="">Standard (Selon salle)</option>
                  <option value="Table en U">Table en U</option>
                  <option value="Table en carré">Table en carré</option>
                  <option value="Conférence">Conférence</option>
                  <option value="Classe">Classe</option>
                  <option value="Vide">Vide</option>
                </select>
              </div>
            </div>

            <div className="checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.recurrence}
                  onChange={e => setFormData({...formData, recurrence: e.target.checked})}
                />
                Réunion récurrente ?
              </label>
            </div>

            {formData.recurrence && (
              <div className="form-group date-section">
                <label>Jusqu'au :</label>
                <input 
                  type="date" 
                  value={formData.recurrenceFin}
                  onChange={e => setFormData({...formData, recurrenceFin: e.target.value})}
                  min={googleSheetsService.formatDate(new Date())}
                />
              </div>
            )}

            <div className="form-actions">
              <button className="cancel-button" onClick={onBack}>Annuler</button>
              <button 
                className="submit-button" 
                onClick={handleReservationSubmit}
                disabled={selections.length === 0 || loading}
              >
                {loading ? 'Enregistrement...' : editReservationId ? 'Modifier' : 'Réserver'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Modal Succès */}
      {successModal.show && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-header">
              <h2>✅ Réservation réussie !</h2>
            </div>
            <div className="success-modal-body">
              <p className="success-subtitle">
                {successModal.count} créneau(x) ont été réservés avec succès.
              </p>
              
              <div className="ical-download-section">
                <p className="ical-info">Ajoutez ces dates à votre agenda personnel :</p>
                <button 
                  className="download-ical-button"
                  onClick={() => {
                    // Créer des objets factices pour l'export iCal
                    const resToExport = selections.map(s => ({
                      ...s,
                      dateDebut: s.date,
                      heureDebut: s.heure,
                      heureFin: formatHeureFin(s.heure),
                      objet: formData.objet,
                      description: formData.description,
                      salle: s.salle,
                      nom: formData.nom,
                      prenom: formData.prenom,
                      service: formData.service
                    }));
                    icalService.generateAndDownload(resToExport);
                  }}
                >
                  <span className="download-icon">📅</span> Télécharger pour Outlook/Agenda
                </button>
                <p className="ical-hint">Format .ics compatible Outlook, Google, Apple</p>
              </div>
            </div>
            <div className="success-modal-footer">
              <button 
                className="close-modal-button"
                onClick={() => {
                  setSuccessModal({ show: false, count: 0 });
                  if (onSuccess) onSuccess();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin Password */}
      {adminPasswordModal.show && (
        <div className="modal-overlay">
          <div className="modal-content admin-password-modal">
            <div className="modal-header">
              <h2>🔒 Accès Restreint</h2>
            </div>
            <div className="modal-body">
              <p className="admin-warning">Cette salle est réservée aux administrateurs.</p>
              <div className="password-input-group">
                <label>Mot de passe administrateur :</label>
                <input
                  type="password"
                  value={adminPasswordModal.password}
                  onChange={(e) => setAdminPasswordModal({...adminPasswordModal, password: e.target.value})}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setAdminPasswordModal({ show: false, salle: '', slot: null, password: '' })}>Annuler</button>
              <button className="submit-button" onClick={handleAdminPasswordSubmit}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Info Réservation au survol */}
      {hoveredReservation && (
        <div 
          className="reservation-popup-card"
          style={{
            position: 'absolute',
            left: popupPosition.x,
            top: popupPosition.y,
            zIndex: 1000
          }}
        >
          <div className="popup-card-content">
            <div className="popup-card-header">
              <span className="popup-icon">📅</span>
              <span className="popup-name">{hoveredReservation.objet}</span>
            </div>
            <div className="popup-card-body">
              <div className="popup-info-line">
                <span className="popup-info-icon">👤</span>
                <span className="popup-info-text">{hoveredReservation.prenom} {hoveredReservation.nom}</span>
              </div>
              <div className="popup-info-line">
                <span className="popup-info-icon">🏢</span>
                <span className="popup-info-text">{hoveredReservation.service}</span>
              </div>
              <div className="popup-info-line">
                <span className="popup-info-icon">🕐</span>
                <span className="popup-info-text">
                  {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Jour Bloqué */}
      {blockedDayModal && (
        <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}>
          <div className="blocked-modal">
            <div className="blocked-modal-header">
              <span className="blocked-icon">🚫</span>
              <h2>Journée Fermée</h2>
            </div>
            <div className="blocked-modal-body">
              <p>La mairie est fermée les dimanches et jours fériés.</p>
              <p>Aucune réservation n'est possible à cette date.</p>
            </div>
            <div className="blocked-modal-footer">
              <button className="blocked-close-button" onClick={() => setBlockedDayModal(false)}>Compris</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ReservationGrid;