// src/components/ReservationGrid.js
import React, { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { SALLES, SERVICES, OBJETS_RESERVATION, HORAIRES } from '../config/googleSheets';
import './ReservationGrid.css';

function ReservationGrid({ selectedDate, onBack, onSuccess }) {
  const [reservations, setReservations] = useState([]);
  const [selection, setSelection] = useState(null);
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

  const handleMouseDown = (salle, hour) => {
    if (isSlotReserved(salle, hour)) {
      alert('Ce créneau est déjà réservé');
      return;
    }
    setIsDragging(true);
    setSelection({
      salle,
      startHour: hour,
      endHour: hour + 1
    });
  };

  const handleMouseEnter = (salle, hour) => {
    if (!isDragging || !selection) return;
    if (selection.salle !== salle) return;

    // Vérifier que tous les créneaux entre le début et cette heure ne sont pas réservés
    const start = Math.min(selection.startHour, hour);
    const end = Math.max(selection.startHour, hour) + 1;
    
    for (let h = start; h < end; h++) {
      if (isSlotReserved(salle, h)) {
        return; // Ne pas étendre la sélection si un créneau est réservé
      }
    }

    setSelection({
      ...selection,
      startHour: start,
      endHour: end
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isSlotSelected = (salle, hour) => {
    if (!selection) return false;
    return (
      selection.salle === salle &&
      hour >= selection.startHour &&
      hour < selection.endHour
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selection) {
      alert('Veuillez sélectionner un créneau');
      return;
    }

    if (!formData.nom || !formData.prenom || !formData.email || !formData.service || !formData.objet) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const reservation = {
        salle: selection.salle,
        dateDebut: googleSheetsService.formatDate(selectedDate),
        heureDebut: googleSheetsService.formatTime(selection.startHour),
        dateFin: formData.recurrence && formData.recurrenceJusquau 
          ? formData.recurrenceJusquau 
          : googleSheetsService.formatDate(selectedDate),
        heureFin: googleSheetsService.formatTime(selection.endHour),
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        service: formData.service,
        objet: formData.objet,
        recurrence: formData.recurrence,
        recurrenceJusquau: formData.recurrenceJusquau || null
      };

      // Vérifier les conflits une dernière fois
      const conflicts = await googleSheetsService.checkConflicts(reservation);
      if (conflicts.length > 0) {
        alert('ERREUR: Un conflit de réservation a été détecté. Veuillez rafraîchir la page et réessayer.');
        loadReservations();
        return;
      }

      // Ajouter la réservation
      const result = await googleSheetsService.addReservation(reservation);
      reservation.id = result.id;

      // Envoyer l'email de confirmation
      try {
        await emailService.sendConfirmation(reservation);
      } catch (emailError) {
        console.error('Erreur email:', emailError);
        // Ne pas bloquer même si l'email échoue
      }

      // Réinitialiser le formulaire
      setSelection(null);
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
      alert(`Erreur lors de la réservation: ${error.message}`);
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
        
        grid.push(
          <div
            key={`slot-${salle}-${hour}`}
            className={`time-slot ${reserved ? 'reserved' : ''} ${selected ? 'selected' : ''}`}
            style={{ 
              gridColumn: salleIndex + 2,
              gridRow: rowNumber
            }}
            onMouseDown={() => handleMouseDown(salle, hour)}
            onMouseEnter={() => handleMouseEnter(salle, hour)}
            onMouseUp={handleMouseUp}
          >
            {reserved && (
              <span className="reserved-indicator">Réservé</span>
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
          <strong>Instructions:</strong> Cliquez et glissez pour sélectionner un créneau.
          Les cases grises sont déjà réservées.
        </p>
      </div>

      <div className="reservation-grid" onMouseLeave={() => setIsDragging(false)}>
        {renderGrid()}
      </div>

      {selection && (
        <div className="reservation-form">
          <h3>📝 Confirmer la réservation</h3>
          <div className="selection-summary">
            <p><strong>Salle:</strong> {selection.salle}</p>
            <p><strong>Horaire:</strong> {googleSheetsService.formatTime(selection.startHour)} - {googleSheetsService.formatTime(selection.endHour)}</p>
            <p><strong>Durée:</strong> {selection.endHour - selection.startHour}h</p>
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
              <button type="button" onClick={() => setSelection(null)} className="cancel-button">
                Annuler la sélection
              </button>
              <button type="submit" className="submit-button">
                ✓ Valider ma réservation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ReservationGrid;