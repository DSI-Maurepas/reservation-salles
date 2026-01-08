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
  // NOUVEAU : Mémorise l'onglet actif du calendrier (dates ou rooms)
  const [calendarTab, setCalendarTab] = useState('dates');
  
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

  // Gestion du Hash pour modification (lien email)
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
          // Quand on vient d'un lien, on veut revenir aux dates par défaut
          setCalendarTab('dates');
          
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
    setCalendarTab('dates'); // Mémorise qu'on vient des dates
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setCurrentView('roomview');
    setCalendarTab('rooms'); // Mémorise qu'on vient des salles pour le retour
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
    setSelectedRoom(null);
    setEditReservationId(null);
    // On ne reset PAS calendarTab ici, pour revenir sur le bon onglet
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
    setCalendarTab('dates');
  };

  if (loading) {
    return <div className="app-loading"><div className="spinner"></div><p>Chargement de l'application...</p></div>;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <img src={`${process.env.PUBLIC_URL}/images/Blason_ville_MAUREPAS.png`} alt="Blason de Maurepas" className="blason-maurepas" />
            <h1>Réservation de Salles - Mairie de MAUREPAS</h1>
          </div>
          <nav className="main-nav">
            <button className={currentView === 'calendar' ? 'active' : ''} onClick={() => setCurrentView('calendar')}>📅 Calendrier</button>
            <button className={currentView === 'myreservations' ? 'active' : ''} onClick={() => setCurrentView('myreservations')}>📋 Mes Réservations</button>
            <button className={currentView === 'admin' ? 'active' : ''} onClick={() => setCurrentView('admin')}>⚙️ Administration</button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && (
          <CalendarView 
            onDateSelect={handleDateSelect}
            onRoomSelect={handleRoomSelect}
            isDateInPast={isDateInPast}
            defaultTab={calendarTab} // Passe l'info à CalendarView
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
            onBack={handleBackToCalendar}
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