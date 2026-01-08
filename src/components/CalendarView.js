// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css';
import SalleCard from './SalleCard';
import { SALLES } from '../config/googleSheets';

function CalendarView({ onDateSelect, onRoomSelect, isDateInPast, defaultTab = 'dates' }) {
  // Initialise l'onglet avec la valeur passée par App.js
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [date, setDate] = useState(new Date());

  // IMPORTANT : Met à jour l'onglet si App.js change la prop (ex: clic bouton retour)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    if (onDateSelect) onDateSelect(newDate);
  };

  // Liste simple des noms de salles (sans capacité pour l'affichage grille)
  const roomList = SALLES.map(s => s.split(' - ')[0]);

  return (
    <div className="calendar-view-container">
      <div className="view-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dates' ? 'active' : ''}`}
          onClick={() => setActiveTab('dates')}
        >
          📅 Par Date
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          🏢 Par Salle
        </button>
      </div>

      <div className="view-content">
        {activeTab === 'dates' ? (
          <div className="calendar-wrapper">
            <h2>Sélectionnez une date</h2>
            <Calendar
              onChange={handleDateChange}
              value={date}
              tileDisabled={({ date }) => isDateInPast(date) || date.getDay() === 0}
              locale="fr-FR"
            />
            <div className="calendar-legend">
              <p><span className="dot available"></span> Disponible</p>
              <p><span className="dot past"></span> Passé / Fermé</p>
            </div>
          </div>
        ) : (
          <div className="rooms-grid-wrapper">
            <h2>Sélectionnez une salle</h2>
            <div className="rooms-grid">
              {roomList.map((roomName, index) => (
                <div key={index} onClick={() => onRoomSelect(roomName)} className="room-grid-item">
                  <SalleCard salle={roomName} compact={true} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;