// src/components/RoomSelector.js
import React, { useState, useEffect } from 'react';
import { SALLES } from '../config/googleSheets';
import { getSalleData } from '../data/sallesData';
import googleSheetsService from '../services/googleSheetsService';
import './RoomSelector.css';

function RoomSelector({ onRoomSelect }) {
  const [roomAvailability, setRoomAvailability] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoomAvailability();
  }, []);

  const loadRoomAvailability = async () => {
    setLoading(true);
    try {
      // Charger toutes les réservations
      const allReservations = await googleSheetsService.getAllReservations();
      
      // Calculer disponibilité pour les 7 prochains jours pour chaque salle
      const today = new Date();
      const availability = {};

      SALLES.forEach(salle => {
        let totalSlots = 0;
        let availableSlots = 0;

        // Pour les 7 prochains jours
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          
          // Skip dimanches
          if (checkDate.getDay() === 0) continue;

          const dateStr = googleSheetsService.formatDate(checkDate);
          
          // 14 créneaux par jour (8h-22h)
          totalSlots += 14;

          // Compter créneaux réservés pour cette salle ce jour
          const reservationsForRoom = allReservations.filter(res =>
            res.salle === salle &&
            (res.dateDebut === dateStr || 
             (res.dateDebut <= dateStr && res.dateFin >= dateStr))
          );

          // Soustraire créneaux réservés
          reservationsForRoom.forEach(res => {
            const debut = parseInt(res.heureDebut.split(':')[0]);
            const fin = parseInt(res.heureFin.split(':')[0]);
            availableSlots -= (fin - debut);
          });
        }

        availableSlots = totalSlots + availableSlots; // Car on a soustrait

        availability[salle] = {
          available: Math.max(0, availableSlots),
          total: totalSlots
        };
      });

      setRoomAvailability(availability);
    } catch (error) {
      console.error('Erreur chargement disponibilités:', error);
    }
    setLoading(false);
  };

  const handleRoomClick = (salle) => {
    onRoomSelect(salle);
  };

  return (
    <div className="room-selector-container">
      <div className="room-tiles-grid">
        {SALLES.map((salle) => {
          const salleData = getSalleData(salle);
          const availability = roomAvailability[salle] || { available: 0, total: 0 };
          const availabilityPercent = availability.total > 0 
            ? (availability.available / availability.total) * 100 
            : 0;

          let statusColor = '#4caf50'; // Vert
          if (availabilityPercent < 30) statusColor = '#f44336'; // Rouge
          else if (availabilityPercent < 60) statusColor = '#ff9800'; // Orange

          return (
            <div
              key={salle}
              className="room-tile"
              onClick={() => handleRoomClick(salle)}
            >
              <div className="room-tile-image">
                <img
                  src={salleData?.photo || '/images/placeholder.jpg'}
                  alt={salleData?.nom || salle}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/200x150/e3f2fd/1976d2?text=' + 
                      encodeURIComponent(salleData?.nom || 'Salle');
                  }}
                />
                <div className="room-tile-overlay">
                  <span className="room-tile-icon">🏛️</span>
                </div>
              </div>
              <div className="room-tile-content">
                <h4 className="room-tile-name">{salleData?.nom || salle.split('-')[0].trim()}</h4>
                <p className="room-tile-capacity">👥 {salleData?.capacite || '?'} pers</p>
                {!loading && (
                  <div className="room-tile-availability">
                    <span className="availability-dot" style={{ backgroundColor: statusColor }}></span>
                    <span className="availability-text">
                      {availability.available}/{availability.total}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RoomSelector;
