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
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
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

  // Détecter les changements de hash pour la modification de réservation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('📍 Hash changé:', hash);
      
      // Format: #?date=2026-02-16&edit=RES_123456
      if (hash.includes('?') && hash.includes('date=') && hash.includes('edit=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const dateParam = params.get('date');
        const editId = params.get('edit');
        
        console.log('📝 Paramètres édition détectés:', { dateParam, editId });
        
        if (dateParam && editId) {
          const date = new Date(dateParam);
          console.log('✅ Ouverture en mode édition:', { date: date.toLocaleDateString(), editId });
          
          setSelectedDate(date);
          setEditReservationId(editId);
          setCurrentView('reservation');
          
          // Nettoyer le hash après traitement
          setTimeout(() => {
            window.history.replaceState(null, '', window.location.pathname);
          }, 500);
        }
      }
    };

    // Écouter les changements de hash
    window.addEventListener('hashchange', handleHashChange);
    
    // Vérifier au chargement initial
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  /**
   * Vérifie si une date est dans le passé
   * @param {Date} date - La date à vérifier
   * @returns {boolean} - true si la date est passée
   */
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const handleDateSelect = (date) => {
    // BLOQUER si date dans le passé
    if (isDateInPast(date)) {
      alert('⚠️ Impossible de réserver une date passée !\n\nVeuillez sélectionner une date à partir d\'aujourd\'hui.');
      return;
    }
    
    setSelectedDate(date);
    setEditReservationId(null); // Pas d'édition, nouvelle réservation
    setCurrentView('reservation');
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setCurrentView('roomview');
  };

  const handleRoomSelection = (roomName) => {
    setSelectedRoom(roomName);
    setCurrentView('roomview');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
    setSelectedRoom(null);
    setEditReservationId(null);
  };

  const handleReservationSuccess = () => {
    setCurrentView('calendar');
    setEditReservationId(null);
  };

  // Callback pour MyReservations quand on clique sur Modifier
  const handleEditReservation = (reservation) => {
    console.log('🔧 handleEditReservation appelé:', reservation);
    const date = new Date(reservation.dateDebut);
    setSelectedDate(date);
    setEditReservationId(reservation.id);
    setCurrentView('reservation');
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
          <div className="header-title">
            <img 
              src={`${process.env.PUBLIC_URL}/images/Blason_ville_MAUREPAS.png`} 
              alt="Blason de Maurepas" 
              className="blason-maurepas"
            />
            <h1>Réservation de Salles - Mairie de MAUREPAS</h1>
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
          <CalendarView 
            onDateSelect={handleDateSelect}
            onRoomSelect={handleRoomSelect}
            isDateInPast={isDateInPast}
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
