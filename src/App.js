// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
import googleSheetsService from './services/googleSheetsService';
import emailService from './services/emailService';

function App() {
  const [currentView, setCurrentView] = useState('calendar'); // calendar, reservation, myreservations, admin
  const [selectedDate, setSelectedDate] = useState(null);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialisation des services
    const init = async () => {
      try {
        await googleSheetsService.initialize();
        emailService.init();
        setLoading(false);
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentView('reservation');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
  };

  const handleReservationSuccess = () => {
    alert('Réservation confirmée ! Vous allez recevoir un email de confirmation.');
    setCurrentView('calendar');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Chargement de l'application...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🏛️ Réservation de Salles - Mairie de MAUREPAS</h1>
          <nav className="main-nav">
            <button 
              className={currentView === 'calendar' ? 'active' : ''}
              onClick={() => setCurrentView('calendar')}
            >
              📅 Calendrier
            </button>
            <button 
              className={currentView === 'myreservations' ? 'active' : ''}
              onClick={() => setCurrentView('myreservations')}
            >
              📋 Mes Réservations
            </button>
            <button 
              className={currentView === 'admin' ? 'active' : ''}
              onClick={() => setCurrentView('admin')}
            >
              ⚙️ Administration
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && (
          <CalendarView onDateSelect={handleDateSelect} />
        )}

        {currentView === 'reservation' && selectedDate && (
          <ReservationGrid 
            selectedDate={selectedDate}
            onBack={handleBackToCalendar}
            onSuccess={handleReservationSuccess}
          />
        )}

        {currentView === 'myreservations' && (
          <MyReservations userEmail={userEmail} setUserEmail={setUserEmail} />
        )}

        {currentView === 'admin' && (
          <AdminPanel />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 Mairie de MAUREPAS - Système de réservation de salles | DSI</p>
      </footer>
    </div>
  );
}

export default App;
