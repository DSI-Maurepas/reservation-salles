// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { JOURS_FERIES } from '../config/googleSheets';
import './CalendarView.css';

function CalendarView({ onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateAvailability, setDateAvailability] = useState({});
  const [loading, setLoading] = useState(false);

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
        const date = new Date(year, month, day);
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
    const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    // En-têtes des jours
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="calendar-day-header">
          {day}
        </div>
      );
    });

    // Espaces vides avant le premier jour
    const startDay = firstDay === 0 ? 6 : firstDay - 1; // Ajuster pour commencer le lundi
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Jours du mois
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = googleSheetsService.formatDate(date);
      const availability = dateAvailability[dateStr] || 'loading';
      const isToday = (year === todayYear && month === todayMonth && day === todayDay);

      days.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${availability} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(date)}
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
      <div className="calendar-header">
        <button onClick={handlePreviousMonth} className="nav-button">
          ◀ Mois précédent
        </button>
        <h2>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button onClick={handleNextMonth} className="nav-button">
          Mois suivant ▶
        </button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <span className="legend-color partial"></span>
          <span>Partiellement occupé</span>
        </div>
        <div className="legend-item">
          <span className="legend-color busy"></span>
          <span>Très occupé</span>
        </div>
        <div className="legend-item">
          <span className="legend-color full"></span>
          <span>Complet</span>
        </div>
        <div className="legend-item">
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
    </div>
  );
}

export default CalendarView;
