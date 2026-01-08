// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import SingleRoomGrid from './components/SingleRoomGrid';
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
import googleSheetsService from './services/googleSheetsService';
import emailService from './services/emailService';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [calendarTab, setCalendarTab] = useState('date');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('?') && hash.includes('date=') && hash.includes('edit=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const dateParam = params.get('date');
        const editId = params.get('edit');
        if (dateParam && editId) {
          const date = new Date(dateParam);
          setSelectedDate(date);
          setEditReservationId(editId);
          setCurrentView('reservation');
          setCalendarTab('date');
          setTimeout(() => {
            window.history.replaceState(null, '', window.location.pathname);
          }, 500);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const handleDateSelect = (date) => {
    if (isDateInPast(date)) {
      alert('⚠️ Impossible de réserver une date passée !\n\nVeuillez sélectionner une date à partir d\'aujourd\'hui.');
      return;
    }
    setSelectedDate(date);
    setEditReservationId(null);
    setCurrentView('reservation');
    setCalendarTab('date');
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setCurrentView('roomview');
    setCalendarTab('room');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
    setSelectedRoom(null);
    setEditReservationId(null);
  };

  const handleBackFromRoom = () => {
    setCalendarTab('room');
    setCurrentView('calendar');
    setSelectedRoom(null);
    setEditReservationId(null);
  };

  const handleReservationSuccess = () => {
    setCurrentView('calendar');
    setEditReservationId(null);
  };

  const handleEditReservation = (reservation) => {
    const date = new Date(reservation.dateDebut);
    setSelectedDate(date);
    setEditReservationId(reservation.id);
    setCurrentView('reservation');
    setCalendarTab('date');
  };

  if (loading) {
    return <div className="app-loading"><div className="spinner"></div><p>Chargement de l'application...</p></div>;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <img 
              src={`${process.env.PUBLIC_URL}/images/Blason_ville_MAUREPAS.png`} 
              alt="Blason de Maurepas" 
              className="blason-maurepas"
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', color: 'white' }}>
              <h1 style={{ margin: 0, lineHeight: '1.2', fontSize: '1.5rem', color: 'white' }}>Réservation de Salles</h1>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: 'white' }}>Mairie de MAUREPAS</div>
            </div>
          </div>
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
            {/* MODIFICATION : Ajout du texte "Admin" */}
            <button 
              className={currentView === 'admin' ? 'active' : ''}
              onClick={() => setCurrentView('admin')}
            >
              ⚙️ Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && (
          <CalendarView 
            onDateSelect={handleDateSelect}
            onRoomSelect={handleRoomSelect}
            isDateInPast={isDateInPast}
            defaultView={calendarTab}
          />
        )}

        {currentView === 'reservation' && selectedDate && (
          <ReservationGrid 
            selectedDate={selectedDate}
            editReservationId={editReservationId}
            onBack={handleBackToCalendar}
            onSuccess={handleReservationSuccess}
          />
        )}

        {currentView === 'roomview' && selectedRoom && (
          <SingleRoomGrid 
            selectedRoom={selectedRoom}
            onBack={handleBackFromRoom}
            onSuccess={handleReservationSuccess}
          />
        )}

        {currentView === 'myreservations' && (
          <MyReservations 
            userEmail={userEmail} 
            setUserEmail={setUserEmail}
            onEditReservation={handleEditReservation}
          />
        )}

        {currentView === 'admin' && <AdminPanel />}
      </main>

      <footer className="app-footer">
        <p>© 2026 Mairie de MAUREPAS - Système de réservation de salles | DSI</p>
      </footer>
    </div>
  );
}

export default App;