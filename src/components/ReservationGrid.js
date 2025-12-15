// src/components/ReservationGrid.js
// VERSION MULTI-SÉLECTION - Permet de réserver plusieurs créneaux dans plusieurs salles en une fois
import React, { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
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
  const [successModal, setSuccessModal] = useState({
    show: false,
    reservations: [],
    message: ''
  });

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
      // Fonction pour générer les dates de récurrence
      const generateRecurrenceDates = (startDate, endDate) => {
        const dates = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 7); // Ajouter 7 jours (1 semaine)
        }
        
        return dates;
      };

      // Créer les réservations
      let reservationsToCreate = [];
      
      if (formData.recurrence && formData.recurrenceJusquau) {
        // Pour les récurrences : créer une réservation par occurrence
        const recurrenceDates = generateRecurrenceDates(selectedDate, new Date(formData.recurrenceJusquau));
        
        for (const date of recurrenceDates) {
          for (const sel of selections) {
            reservationsToCreate.push({
              salle: sel.salle,
              dateDebut: googleSheetsService.formatDate(date),
              heureDebut: googleSheetsService.formatTime(sel.startHour),
              dateFin: googleSheetsService.formatDate(date),
              heureFin: googleSheetsService.formatTime(sel.endHour),
              nom: formData.nom,
              prenom: formData.prenom,
              email: formData.email,
              service: formData.service,
              objet: formData.objet,
              recurrence: true,
              recurrenceJusquau: formData.recurrenceJusquau
            });
          }
        }
      } else {
        // Pour les réservations simples : une réservation par sélection
        reservationsToCreate = selections.map(sel => ({
          salle: sel.salle,
          dateDebut: googleSheetsService.formatDate(selectedDate),
          heureDebut: googleSheetsService.formatTime(sel.startHour),
          dateFin: googleSheetsService.formatDate(selectedDate),
          heureFin: googleSheetsService.formatTime(sel.endHour),
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          service: formData.service,
          objet: formData.objet,
          recurrence: false,
          recurrenceJusquau: null
        }));
      }

      // Vérifier les conflits pour toutes les réservations
      for (const reservation of reservationsToCreate) {
        const conflicts = await googleSheetsService.checkConflicts(reservation);
        if (conflicts.length > 0) {
          alert(`ERREUR: Conflit détecté pour ${reservation.salle} à ${reservation.heureDebut}.\n\nVeuillez rafraîchir la page et réessayer.`);
          loadReservations();
          return;
        }
      }

      // Ajouter toutes les réservations avec traitement par lots
      const results = [];
      const BATCH_SIZE = 5; // Traiter 5 réservations à la fois
      const DELAY_MS = 1000; // 1 seconde de délai entre chaque lot
      
      // Fonction pour attendre
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Afficher un message de progression UNIQUEMENT pour les grandes réservations (10+)
      if (reservationsToCreate.length >= 10) {
        alert(`⏳ Création de ${reservationsToCreate.length} réservations en cours...\n\nCela peut prendre ${Math.ceil(reservationsToCreate.length / BATCH_SIZE) * 2} secondes.\n\nMerci de patienter.`);
      }
      
      // Traiter par lots
      for (let i = 0; i < reservationsToCreate.length; i += BATCH_SIZE) {
        const batch = reservationsToCreate.slice(i, i + BATCH_SIZE);
        
        console.log(`Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(reservationsToCreate.length / BATCH_SIZE)}...`);
        
        // Créer toutes les réservations du lot
        for (const reservation of batch) {
          try {
            const result = await googleSheetsService.addReservation(reservation);
            if (!result || !result.id) {
              throw new Error(`La réservation pour ${reservation.salle} à ${reservation.heureDebut} a échoué : aucun ID retourné`);
            }
            results.push({
              ...reservation,
              id: result.id
            });
            console.log(`✅ Réservation ${results.length}/${reservationsToCreate.length} créée : ${reservation.salle} ${reservation.heureDebut}`);
          } catch (err) {
            console.error(`❌ Erreur pour ${reservation.salle} à ${reservation.heureDebut}:`, err);
            throw new Error(`Échec lors de la création de la réservation ${results.length + 1}/${reservationsToCreate.length} (${reservation.salle} ${reservation.heureDebut}). ${results.length} réservation(s) ont été créées avant l'erreur.`);
          }
        }
        
        // Attendre avant le prochain lot (sauf pour le dernier)
        if (i + BATCH_SIZE < reservationsToCreate.length) {
          console.log(`⏳ Pause de ${DELAY_MS}ms avant le prochain lot...`);
          await sleep(DELAY_MS);
        }
      }

      // Email de confirmation désactivé pour économiser le quota EmailJS
      // Seuls les emails d'annulation seront envoyés

      // Afficher une modale de succès avec bouton de téléchargement iCal
      const summary = selections.map(sel => 
        `${sel.salle} : ${googleSheetsService.formatTime(sel.startHour)} - ${googleSheetsService.formatTime(sel.endHour)}`
      ).join(', ');

      setSuccessModal({
        show: true,
        reservations: results,
        message: `${results.length} réservation${results.length > 1 ? 's' : ''} créée${results.length > 1 ? 's' : ''} avec succès !`
      });

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

      // onSuccess() sera appelé à la fermeture de la modale
    } catch (error) {
      console.error('Erreur détaillée:', error);
      
      // Message d'erreur plus explicite
      let errorMessage = 'Erreur lors de la réservation';
      
      if (error.message) {
        errorMessage = error.message; // Utilise directement le message d'erreur personnalisé
      } else if (error.result && error.result.error) {
        errorMessage += `: ${error.result.error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += `: ${error}`;
      } else if (error.status === 429) {
        errorMessage = 'Trop de requêtes simultanées. Veuillez patienter 30 secondes et réessayer avec moins de créneaux à la fois (maximum 10 recommandé).';
      } else if (error.status === 403) {
        errorMessage = 'Erreur d\'authentification. Veuillez rafraîchir la page et vous reconnecter.';
      } else if (!navigator.onLine) {
        errorMessage = 'Pas de connexion internet. Vérifiez votre connexion et réessayez.';
      } else {
        errorMessage = 'Erreur réseau ou timeout. Essayez avec moins de créneaux à la fois (5-10 maximum recommandé) ou réessayez dans quelques minutes.';
      }
      
      alert(`❌ ${errorMessage}\n\n💡 Conseil : Pour de grandes réservations (10+ créneaux), faites plusieurs groupes de 5-10 créneaux.`);
      
      // Rafraîchir les réservations pour voir celles qui ont été créées
      loadReservations();
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

      <div className="reservation-content">
        <div className="grid-column">
          <div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>
            {renderGrid()}
          </div>
        </div>

        {selections.length > 0 && (
          <div className="form-column">
            <div className="reservation-form">
              <h3>📝 Confirmer la réservation ({selections.length} créneau{selections.length > 1 ? 'x' : ''})</h3>
          
          {selections.length > 10 && (
            <div className="warning-message">
              <strong>⚠️ Attention :</strong> Vous avez sélectionné {selections.length} créneaux. 
              Pour des raisons de performance, il est recommandé de limiter à 10 créneaux par réservation. 
              Le traitement prendra environ {Math.ceil(selections.length / 5) * 2} secondes.
            </div>
          )}
          
          <div className="selections-summary">
            <h4>📍 Créneau{selections.length > 1 ? 'x' : ''} sélectionné{selections.length > 1 ? 's' : ''}</h4>
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
          </div>
        )}
      </div>

      {/* Modale de succès avec téléchargement iCal */}
      {successModal.show && (
        <div className="success-modal-overlay" onClick={() => {
          setSuccessModal({ show: false, reservations: [], message: '' });
          onSuccess();
        }}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-header">
              <span className="success-icon">✅</span>
              <h2>{successModal.message}</h2>
            </div>
            
            <div className="success-modal-body">
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
                  onSuccess();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationGrid;
