// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { JOURS_FERIES } from '../config/googleSheets';
import ViewToggle from './ViewToggle';
import RoomSelector from './RoomSelector';
import './CalendarView.css';

function CalendarView({ onDateSelect, onRoomSelect, isDateInPast }) {
  const [viewMode, setViewMode] = useState('date'); // 'date' ou 'room'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateAvailability, setDateAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  // Fonction utilitaire pour créer une date locale sans risque de décalage
  const createLocalDate = (year, month, day) => {
    const date = new Date(year, month, day, 12, 0, 0, 0); // Midi pour éviter les décalages
    return date;
  };

  // Fonction pour obtenir la date d'aujourd'hui de manière fiable
  const getTodayLocal = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
  };

  useEffect(() => {
    loadMonthAvailability();
  }, [currentMonth]);

  const loadMonthAvailability = async () => {
    setLoading(true);
    try {
      const availability = {};
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Charger TOUTES les réservations une seule fois
      const allReservations = await googleSheetsService.getAllReservations();

      // Calculer la disponibilité pour chaque jour du mois
      for (let day = 1; day <= daysInMonth; day++) {
        const date = createLocalDate(year, month, day);
        const dateStr = googleSheetsService.formatDate(date);
        
        // Vérifier si c'est un dimanche ou jour férié
        if (date.getDay() === 0 || JOURS_FERIES.includes(dateStr)) {
          availability[dateStr] = 'closed';
          continue;
        }

        // Compter les créneaux réservés pour cette date
        const reservationsDuJour = allReservations.filter(res => 
          res.dateDebut === dateStr || 
          (res.dateDebut <= dateStr && res.dateFin >= dateStr)
        );

        if (reservationsDuJour.length === 0) {
          availability[dateStr] = 'available';
          continue;
        }

        // Calculer le taux d'occupation
        const nbSalles = 9;
        const nbCreneaux = 14; // 8h-22h
        const totalCreneauxPossibles = nbSalles * nbCreneaux;

        let creneauxReserves = 0;
        reservationsDuJour.forEach(res => {
          const debut = parseInt(res.heureDebut.split(':')[0]);
          const fin = parseInt(res.heureFin.split(':')[0]);
          creneauxReserves += (fin - debut);
        });

        const tauxOccupation = creneauxReserves / totalCreneauxPossibles;

        if (tauxOccupation >= 1) {
          availability[dateStr] = 'full';
        } else if (tauxOccupation > 0.7) {
          availability[dateStr] = 'busy';
        } else if (tauxOccupation > 0.3) {
          availability[dateStr] = 'partial';
        } else {
          availability[dateStr] = 'available';
        }
      }

      setDateAvailability(availability);
    } catch (error) {
      console.error('Erreur lors du chargement de la disponibilité:', error);
    }
    setLoading(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    // BLOQUER d'abord si date passée (avec vérification que la fonction existe)
    if (typeof isDateInPast === 'function' && isDateInPast(date)) {
      alert('⚠️ Impossible de réserver une date passée !\n\nVeuillez sélectionner une date à partir d\'aujourd\'hui.');
      return;
    }
    
    const dateStr = googleSheetsService.formatDate(date);
    const availability = dateAvailability[dateStr];
    
    if (availability === 'closed' || availability === 'full') {
      alert('Cette date n\'est pas disponible pour la réservation.');
      return;
    }
    
    onDateSelect(date);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Commencer par Lundi au lieu de Dimanche
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // En-têtes des jours
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="calendar-day-header">
          {day}
        </div>
      );
    });

    // Espaces vides avant le premier jour
    // Convertir getDay() (0=Dim, 1=Lun, ..., 6=Sam) en position dans notre tableau (0=Lun, ..., 6=Dim)
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Jours du mois
    // Obtenir la date actuelle de manière fiable
    const todayInfo = getTodayLocal();
    const todayYear = todayInfo.year;
    const todayMonth = todayInfo.month;
    const todayDay = todayInfo.day;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = createLocalDate(year, month, day);
      const dateStr = googleSheetsService.formatDate(date);
      const availability = dateAvailability[dateStr] || 'loading';
      const isToday = (year === todayYear && month === todayMonth && day === todayDay);
      const isPast = (typeof isDateInPast === 'function') ? isDateInPast(date) : false;

      days.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${availability} ${isToday ? 'today' : ''} ${isPast ? 'past-date' : ''}`}
          onClick={() => handleDateClick(date)}
          style={{
            cursor: isPast ? 'not-allowed' : 'pointer'
          }}
        >
          <span className="day-number">{day}</span>
          {availability !== 'loading' && (
            <span className="availability-indicator"></span>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="calendar-view">
      <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />

      {viewMode === 'date' ? (
        <>
          <div className="calendar-header">
            <button onClick={handlePreviousMonth} className="nav-button" title="Mois précédent">
              ◀
            </button>
            
            <div className="date-selectors">
              <select 
                value={currentMonth.getMonth()} 
                onChange={(e) => setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))}
                className="month-selector"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
              
              <select 
                value={currentMonth.getFullYear()} 
                onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))}
                className="year-selector"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            
            <button onClick={handleNextMonth} className="nav-button" title="Mois suivant">
              ▶
            </button>
          </div>

          <div className="calendar-legend">
            <div className="legend-item" title="🟢 Disponible (0 réservation)">
              <span className="legend-color available"></span>
              <span>Disponible</span>
            </div>
            <div className="legend-item" title="🟡 Partiellement occupé (1-3 réservations)">
              <span className="legend-color partial"></span>
              <span>Partiellement occupé</span>
            </div>
            <div className="legend-item" title="🟠 Très occupé (4-6 réservations)">
              <span className="legend-color busy"></span>
              <span>Très occupé</span>
            </div>
            <div className="legend-item" title="🔴 Complet (7+ réservations)">
              <span className="legend-color full"></span>
              <span>Complet</span>
            </div>
            <div className="legend-item" title="⚫ Fermé (hors plages horaires)">
              <span className="legend-color closed"></span>
              <span>Fermé</span>
            </div>
          </div>

          {loading ? (
            <div className="calendar-loading">
              <div className="spinner"></div>
              <p>Chargement du calendrier...</p>
            </div>
          ) : (
            <div className="calendar-grid">
              {renderCalendar()}
            </div>
          )}

          <div className="calendar-instructions">
            <h3>📋 Instructions</h3>
            <ul>
              <li>Cliquez sur une date pour accéder au tableau de réservation</li>
              <li>Les couleurs indiquent la disponibilité des salles</li>
              <li>Les dimanches et jours fériés sont fermés</li>
              <li>Horaires d'ouverture : 8h - 22h (Lundi - Samedi)</li>
            </ul>
          </div>
        </>
      ) : (
        <RoomSelector onRoomSelect={onRoomSelect} />
      )}
    </div>
  );
}

export default CalendarView;
