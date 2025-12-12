// src/components/ReservationGrid.js
// VERSION MULTI-SÉLECTION - Permet de réserver plusieurs créneaux dans plusieurs salles en une fois
import React, { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES } from '../config/googleSheets';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, onBack, onSuccess }) {
  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]); // Array de sélections validées
  const [currentSelection, setCurrentSelection] = useState(null); // Sélection en cours de drag
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    service: '',
    objet: '',
    recurrence: false,
    recurrenceJusquau: ''
  });
  const [loading, setLoading] = useState(true);

  const loadReservations = useCallback(async () => {
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      const dateStr = googleSheetsService.formatDate(selectedDate);
      
      // Filtrer les réservations pour la date sélectionnée
      const dayReservations = allReservations.filter(res => 
        res.dateDebut === dateStr || 
        (res.dateDebut <= dateStr && res.dateFin >= dateStr)
      );
      
      setReservations(dayReservations);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const isSlotReserved = (salle, hour) => {
    return reservations.some(res => {
      if (res.salle !== salle) return false;
      const startHour = parseInt(res.heureDebut.split(':')[0]);
      const endHour = parseInt(res.heureFin.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  // Récupérer l'email de l'agent qui a réservé un créneau
  const getReservationEmail = (salle, hour) => {
    const reservation = reservations.find(res => {
      if (res.salle !== salle) return false;
      const startHour = parseInt(res.heureDebut.split(':')[0]);
      const endHour = parseInt(res.heureFin.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
    return reservation ? reservation.email : '';
  };

  const handleMouseDown = (salle, hour) => {
    if (isSlotReserved(salle, hour)) {
      alert('Ce créneau est déjà réservé');
      return;
    }
    setIsDragging(true);
    setCurrentSelection({
      salle,
      startHour: hour,
      endHour: hour + 1
    });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !currentSelection) return;
    if (currentSelection.salle !== salle) return;

    // Vérifier que tous les créneaux entre le début et cette heure ne sont pas réservés
    const start = Math.min(currentSelection.startHour, hour);
    const end = Math.max(currentSelection.startHour, hour) + 1;
    
    for (let h = start; h < end; h++) {
      if (isSlotReserved(salle, h)) {
        return; // Ne pas étendre la sélection si un créneau est réservé
      }
    }

    setCurrentSelection({
      ...currentSelection,
      startHour: start,
      endHour: end
    });
  };

  const handleMouseUp = () => {
    if (isDragging && currentSelection) {
      // Ajouter la sélection actuelle à la liste des sélections
      setSelections([...selections, currentSelection]);
      setCurrentSelection(null);
    }
    setIsDragging(false);
  };

  // Support tactile pour mobile - Version améliorée
  const handleTouchStart = (salle, hour) => {
    if (isSlotReserved(salle, hour)) {
      alert('Ce créneau est déjà réservé');
      return;
    }
    setIsDragging(true);
    setCurrentSelection({
      salle,
      startHour: hour,
      endHour: hour + 1
    });
  };

  const handleTouchEnd = () => {
    if (currentSelection) {
      setSelections([...selections, currentSelection]);
      setCurrentSelection(null);
    }
    setIsDragging(false);
  };

  // Gestion globale du touchmove pour permettre la sélection multiple
  React.useEffect(() => {
    const handleGlobalTouchMove = (e) => {
      if (!isDragging || !currentSelection) return;
      
      // Empêcher le scroll pendant la sélection
      e.preventDefault();
      
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element && element.dataset.salle && element.dataset.hour) {
        const salle = element.dataset.salle;
        const hour = parseInt(element.dataset.hour);
        
        // Vérifier qu'on est dans la même salle
        if (salle !== currentSelection.salle) return;
        
        // Vérifier que tous les créneaux entre le début et cette heure ne sont pas réservés
        const start = Math.min(currentSelection.startHour, hour);
        const end = Math.max(currentSelection.startHour, hour) + 1;
        
        let hasReserved = false;
        for (let h = start; h < end; h++) {
          if (isSlotReserved(salle, h)) {
            hasReserved = true;
            break;
          }
        }
        
        if (!hasReserved) {
          setCurrentSelection({
            salle,
            startHour: start,
            endHour: end
          });
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      if (currentSelection) {
        setSelections([...selections, currentSelection]);
        setCurrentSelection(null);
      }
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, currentSelection, selections]);

  const isSlotSelected = (salle, hour) => {
    // Vérifier dans les sélections validées
    const inSelections = selections.some(sel => {
      if (sel.salle !== salle) return false;
      return hour >= sel.startHour && hour < sel.endHour;
    });
    
    // Vérifier dans la sélection en cours
    const inCurrentSelection = currentSelection && 
      currentSelection.salle === salle &&
      hour >= currentSelection.startHour &&
      hour < currentSelection.endHour;
    
    return inSelections || inCurrentSelection;
  };

  // Supprimer une sélection de la liste
  const removeSelection = (index) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selections.length === 0) {
      alert('Veuillez sélectionner au moins un créneau');
      return;
    }

    if (!formData.nom || !formData.prenom || !formData.email || !formData.service || !formData.objet) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Créer une réservation pour chaque sélection
      const reservationsToCreate = selections.map(sel => ({
        salle: sel.salle,
        dateDebut: googleSheetsService.formatDate(selectedDate),
        heureDebut: googleSheetsService.formatTime(sel.startHour),
        dateFin: formData.recurrence && formData.recurrenceJusquau 
          ? formData.recurrenceJusquau 
          : googleSheetsService.formatDate(selectedDate),
        heureFin: googleSheetsService.formatTime(sel.endHour),
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        service: formData.service,
        objet: formData.objet,
        recurrence: formData.recurrence,
        recurrenceJusquau: formData.recurrenceJusquau || null
      }));

      // Vérifier les conflits pour toutes les réservations
      for (const reservation of reservationsToCreate) {
        const conflicts = await googleSheetsService.checkConflicts(reservation);
        if (conflicts.length > 0) {
          alert(`ERREUR: Conflit détecté pour ${reservation.salle} à ${reservation.heureDebut}.\n\nVeuillez rafraîchir la page et réessayer.`);
          loadReservations();
          return;
        }
      }

      // Ajouter toutes les réservations
      const results = [];
      for (const reservation of reservationsToCreate) {
        const result = await googleSheetsService.addReservation(reservation);
        if (!result || !result.id) {
          throw new Error(`La réservation pour ${reservation.salle} a échoué : aucun ID retourné`);
        }
        results.push({
          ...reservation,
          id: result.id
        });
      }

      // Email de confirmation désactivé pour économiser le quota EmailJS
      // Seuls les emails d'annulation seront envoyés

      // Afficher un message de succès avec toutes les réservations
      const summary = selections.map(sel => 
        `📍 ${sel.salle} : ${googleSheetsService.formatTime(sel.startHour)} - ${googleSheetsService.formatTime(sel.endHour)}`
      ).join('\n');

      alert(`✅ ${selections.length} réservation${selections.length > 1 ? 's' : ''} créée${selections.length > 1 ? 's' : ''} avec succès !\n\n` +
            `📅 Date : ${googleSheetsService.formatDate(selectedDate)}\n\n` +
            summary);

      // Réinitialiser le formulaire
      setSelections([]);
      setCurrentSelection(null);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        service: '',
        objet: '',
        recurrence: false,
        recurrenceJusquau: ''
      });

      onSuccess();
    } catch (error) {
      console.error('Erreur détaillée:', error);
      
      // Message d'erreur plus explicite
      let errorMessage = 'Erreur lors de la réservation';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      } else if (error.result && error.result.error) {
        errorMessage += `: ${error.result.error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += `: ${error}`;
      } else {
        errorMessage += ': Erreur inconnue. Veuillez réessayer ou contacter l\'administrateur.';
      }
      
      alert(`❌ ${errorMessage}\n\nDétails techniques : ${JSON.stringify(error, null, 2).substring(0, 200)}`);
    }
  };

  const renderGrid = () => {
    const grid = [];
    
    // Ligne 1 : Coin + En-têtes des salles
    grid.push(
      <div key="corner" className="grid-corner">
        Heure
      </div>
    );
    
    SALLES.forEach((salle, salleIndex) => {
      grid.push(
        <div key={`salle-header-${salleIndex}`} className="salle-header" style={{ gridColumn: salleIndex + 2 }}>
          {salle}
        </div>
      );
    });

    // Lignes suivantes : Heure + créneaux pour chaque salle
    for (let hour = HORAIRES.HEURE_DEBUT; hour < HORAIRES.HEURE_FIN; hour++) {
      const rowNumber = hour - HORAIRES.HEURE_DEBUT + 2; // +2 car ligne 1 = headers
      
      // Colonne 1 : Label de l'heure
      grid.push(
        <div key={`time-${hour}`} className="time-label" style={{ gridRow: rowNumber }}>
          {googleSheetsService.formatTime(hour)}
        </div>
      );
      
      // Colonnes 2 à 10 : Créneaux pour chaque salle
      SALLES.forEach((salle, salleIndex) => {
        const reserved = isSlotReserved(salle, hour);
        const selected = isSlotSelected(salle, hour);
        const reservationEmail = reserved ? getReservationEmail(salle, hour) : '';
        
        grid.push(
          <div
            key={`slot-${salle}-${hour}`}
            className={`time-slot ${reserved ? 'reserved' : ''} ${selected ? 'selected' : ''}`}
            data-salle={salle}
            data-hour={hour}
            style={{ 
              gridColumn: salleIndex + 2,
              gridRow: rowNumber
            }}
            onMouseDown={() => handleMouseDown(salle, hour)}
            onMouseEnter={() => handleMouseEnter(salle, hour)}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleTouchStart(salle, hour);
            }}
          >
            {reserved && (
              <span className="reserved-indicator" title={reservationEmail}>
                {reservationEmail}
              </span>
            )}
          </div>
        );
      });
    }

    return grid;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des réservations...</p>
      </div>
    );
  }

  return (
    <div className="reservation-grid-container">
      <div className="grid-header">
        <button onClick={onBack} className="back-button">
          ◀ Retour au calendrier
        </button>
        <h2>
          Réservation pour le {selectedDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h2>
      </div>

      <div className="grid-instructions">
        <p>
          <strong>Instructions:</strong> Cliquez et glissez pour sélectionner un ou plusieurs créneaux dans différentes salles.
          Les cases grises sont déjà réservées et affichent l'email de l'agent.
        </p>
      </div>

      <div className="mobile-instruction">
        <strong>📱 Sur mobile :</strong> Faites glisser horizontalement pour voir toutes les salles. 
        Cliquez et maintenez pour sélectionner plusieurs créneaux. Relâchez pour valider chaque sélection.
      </div>

      <div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>
        {renderGrid()}
      </div>

      {selections.length > 0 && (
        <div className="reservation-form">
          <h3>📝 Confirmer la réservation ({selections.length} créneau{selections.length > 1 ? 'x' : ''})</h3>
          
          <div className="selections-summary">
            <h4>Créneaux sélectionnés :</h4>
            {selections.map((sel, index) => (
              <div key={index} className="selection-item">
                <div className="selection-info">
                  <p><strong>{sel.salle}</strong></p>
                  <p>{googleSheetsService.formatTime(sel.startHour)} - {googleSheetsService.formatTime(sel.endHour)} ({sel.endHour - sel.startHour}h)</p>
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
            ))}
            
            <div className="selection-date">
              <p><strong>📅 Date :</strong> {selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Service *</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                required
              >
                <option value="">-- Sélectionner un service --</option>
                {SERVICES.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Objet de la réservation *</label>
              <select
                value={formData.objet}
                onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                required
              >
                <option value="">-- Sélectionner un objet --</option>
                {OBJETS_RESERVATION.map(objet => (
                  <option key={objet} value={objet}>{objet}</option>
                ))}
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.checked })}
                />
                Réservation récurrente (chaque semaine)
              </label>
            </div>

            {formData.recurrence && (
              <div className="form-group">
                <label>Récurrence jusqu'au</label>
                <input
                  type="date"
                  value={formData.recurrenceJusquau}
                  onChange={(e) => setFormData({ ...formData, recurrenceJusquau: e.target.value })}
                  min={googleSheetsService.formatDate(selectedDate)}
                />
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={() => { setSelections([]); setCurrentSelection(null); }} className="cancel-button">
                Annuler toutes les sélections
              </button>
              <button type="submit" className="submit-button">
                ✓ Valider {selections.length > 1 ? `les ${selections.length} réservations` : 'la réservation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ReservationGrid;
