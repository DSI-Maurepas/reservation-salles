// src/App.js
// CORRECTION CRITIQUE : Gestion complète du mode édition avec routing vers SingleRoomGrid
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import SingleRoomGrid from './components/SingleRoomGrid';
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
import apiService from './services/apiService';
import emailService from './services/emailService';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [calendarTab, setCalendarTab] = useState('date');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null); // ✅ AJOUT
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await apiService.initialize();
        emailService.init();
        setLoading(false);
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        setLoading(false);
      }
    };
    init();
  }, []);

  // CORRECTION MAJEURE : Gestion complète du hash pour le mode édition
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      
      // Vérifier si on a un hash de modification (#calendar?...)
      if (hash.includes('?') && hash.includes('edit=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const editId = params.get('edit');
        const salleParam = params.get('salle');
        const dateParam = params.get('date');
        
        if (editId) {
          console.log('🔧 Mode édition détecté:', { editId, salleParam, dateParam });
          
          // PRIORITÉ 1 : Si on a une salle → Router vers SingleRoomGrid
          if (salleParam) {
            try {
              // Charger la réservation complète depuis Sheets
              const allReservations = await apiService.getAllReservations();
              const reservationToEdit = allReservations.find(r => r.id === editId);
              
              if (reservationToEdit) {
                console.log('✅ Réservation trouvée:', reservationToEdit);
                
                const decodedSalle = decodeURIComponent(salleParam);
                setSelectedRoom(decodedSalle);
                setEditReservationId(editId);
                setEditingReservation(reservationToEdit); // ✅ STOCKER la réservation complète
                setCurrentView('roomview');  // ✅ SingleRoomGrid
                setCalendarTab('room');      // ✅ Mode salle
                
                // Nettoyer le hash après 500ms
                setTimeout(() => {
                  window.history.replaceState(null, '', window.location.pathname);
                }, 500);
              } else {
                console.error('❌ Réservation non trouvée:', editId);
                alert('Erreur : Réservation introuvable');
              }
            } catch (error) {
              console.error('❌ Erreur chargement réservation:', error);
              alert('Erreur lors du chargement de la réservation');
            }
          } 
          // FALLBACK : Si pas de salle mais une date → ReservationGrid
          else if (dateParam) {
            console.log('⚠️ Fallback ReservationGrid (pas de salle spécifiée)');
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
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Appel immédiat au montage
    
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
    setEditingReservation(editingReservation); // ✅ Stocker si fourni
    setCurrentView('roomview');
    setCalendarTab('room');
  };

  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
    setSelectedRoom(null);
    setEditReservationId(null);
    setEditingReservation(null); // ✅ Nettoyer
  };

  const handleBackFromRoom = () => {
    setCalendarTab('room');
    setCurrentView('calendar');
    setSelectedRoom(null);
    setEditReservationId(null);
    setEditingReservation(null); // ✅ Nettoyer
  };

  const handleReservationSuccess = () => {
    setCurrentView('calendar');
    setEditReservationId(null);
    setEditingReservation(null); // ✅ Nettoyer
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
            editingReservation={editingReservation}
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
