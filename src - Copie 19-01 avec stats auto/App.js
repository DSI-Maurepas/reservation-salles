// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import SingleRoomGrid from './components/SingleRoomGrid';
import VehicleGrid from './components/VehicleGrid'; 
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
// ✅ IMPORT DU NOUVEAU COMPOSANT
import AdminAuto from './components/AdminAuto'; 
import googleSheetsService from './services/googleSheetsService';
import emailService from './services/emailService';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [calendarTab, setCalendarTab] = useState('date');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null); 
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
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.includes('?') && hash.includes('edit=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const editId = params.get('edit');
        const salleParam = params.get('salle');
        const dateParam = params.get('date');
        
        if (editId) {
          console.log('🔧 Mode édition détecté:', { editId, salleParam, dateParam });
          if (salleParam) {
            try {
              const allReservations = await googleSheetsService.getAllReservations();
              const reservationToEdit = allReservations.find(r => r.id === editId);
              if (reservationToEdit) {
                const decodedSalle = decodeURIComponent(salleParam);
                setSelectedRoom(decodedSalle);
                setEditReservationId(editId);
                setEditingReservation(reservationToEdit); 
                setCurrentView('roomview');  
                setCalendarTab('room');      
                setTimeout(() => { window.history.replaceState(null, '', window.location.pathname); }, 500);
              } else { alert('Erreur : Réservation introuvable'); }
            } catch (error) { alert('Erreur lors du chargement de la réservation'); }
          } else if (dateParam) {
            const date = new Date(dateParam);
            setSelectedDate(date);
            setEditReservationId(editId);
            setCurrentView('reservation');
            setCalendarTab('date');
            setTimeout(() => { window.history.replaceState(null, '', window.location.pathname); }, 500);
          }
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
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

  const handleRoomSelect = (room, editingReservation = null) => {
    setSelectedRoom(room);
    setEditingReservation(editingReservation); 
    setCurrentView('roomview');
    setCalendarTab('room');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
    setSelectedRoom(null);
    setEditReservationId(null);
    setEditingReservation(null); 
  };

  const handleBackFromRoom = () => {
    setCalendarTab('room');
    setCurrentView('calendar');
    setSelectedRoom(null);
    setEditReservationId(null);
    setEditingReservation(null); 
  };

  const handleReservationSuccess = () => {
    setCurrentView('calendar');
    setEditReservationId(null);
    setEditingReservation(null); 
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'left', textAlign: 'center', color: 'white' }}>
              <h1 style={{ margin: 0, lineHeight: '1.2', fontSize: '1.5rem', color: 'white' }}>Portail de Réservations</h1>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: 'white' }}>Mairie de MAUREPAS</div>
            </div>
          </div>
          <nav className="main-nav">
            <button 
              className={currentView === 'calendar' ? 'active' : ''}
              onClick={() => setCurrentView('calendar')}
            >
              🏢 Salles
            </button>
            <button 
              className={currentView === 'vehicle' ? 'active' : ''}
              onClick={() => setCurrentView('vehicle')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img 
                src={`${process.env.PUBLIC_URL}/images/32x32.png`} 
                alt="Auto" 
                style={{ height: '20px', width: 'auto' }} 
              />
              Clio
            </button>
            <button 
              className={currentView === 'myreservations' ? 'active' : ''}
              onClick={() => setCurrentView('myreservations')}
            >
              ✏️ Mes Réservations
            </button>
            <button 
              className={currentView === 'admin' ? 'active' : ''}
              onClick={() => setCurrentView('admin')}
            >
              ⚙️ Admin
            </button>
            {/* ✅ BOUTON ADMINAUTO */}
            <button 
              className={`admin-auto-btn ${currentView === 'adminAuto' ? 'active' : ''}`}
              onClick={() => setCurrentView('adminAuto')}
            >
            <img 
                src={`${process.env.PUBLIC_URL}/images/32x32.png`} 
                alt="Auto" 
                style={{ height: '18px', width: 'auto' }} 
              /> 
              Admin
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
            editingReservation={editingReservation}
            onBack={handleBackFromRoom}
            onSuccess={handleReservationSuccess}
          />
        )}

        {currentView === 'vehicle' && (
          <VehicleGrid 
            onBack={() => setCurrentView('calendar')}
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
        
        {/* ✅ VUE ADMIN AUTO */}
        {currentView === 'adminAuto' && <AdminAuto />}
      </main>

      <footer className="app-footer">
        <p>© 2026 Mairie de MAUREPAS - Portail de réservation | DSI</p>
      </footer>
    </div>
  );
}

export default App;