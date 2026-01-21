// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import SingleRoomGrid from './components/SingleRoomGrid';
import VehicleGrid from './components/VehicleGrid'; 
// ✅ IMPORT IA GRID
import IAGrid from './components/IAGrid';
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
import AdminAuto from './components/AdminAuto'; 
import AdminIA from './components/AdminIA'; // Import AdminIA
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

  const isDateInPast = (date) => { const t = new Date(); t.setHours(0,0,0,0); const c = new Date(date); c.setHours(0,0,0,0); return c < t; };
  const handleDateSelect = (date) => { if (isDateInPast(date)) { alert('Date passée impossible'); return; } setSelectedDate(date); setEditReservationId(null); setCurrentView('reservation'); setCalendarTab('date'); };
  const handleRoomSelect = (room, editingRes = null) => { setSelectedRoom(room); setEditingReservation(editingRes); setCurrentView('roomview'); setCalendarTab('room'); };
  const handleBackToCalendar = () => { setCurrentView('calendar'); setSelectedDate(null); setSelectedRoom(null); setEditReservationId(null); setEditingReservation(null); };
  const handleBackFromRoom = () => { setCalendarTab('room'); setCurrentView('calendar'); setSelectedRoom(null); setEditReservationId(null); setEditingReservation(null); };
  const handleReservationSuccess = () => { setCurrentView('calendar'); setEditReservationId(null); setEditingReservation(null); };
  
  // ✅ CORRECTION DU BUG DE REDIRECTION ET SURBRILLANCE
  const handleEditReservation = (res) => { 
    if (res.salle === 'CLIO') {
      // Cas Véhicule -> Redirection vers VehicleGrid
      setEditingReservation(res);
      setCurrentView('vehicle');
    } else {
      // Cas Salle Standard -> Redirection vers SingleRoomGrid (Vue par salle)
      // 1. On définit la salle concernée pour ouvrir la bonne grille
      setSelectedRoom(res.salle);
      // 2. On passe l'objet réservation complet pour activer le mode édition (surbrillance + formulaire)
      setEditingReservation(res);
      // 3. On bascule sur la vue "roomview" au lieu de "reservation" (qui était la vue par date)
      setCurrentView('roomview');
      setCalendarTab('room'); 
    }
  };

  // Gestion édition Véhicule depuis AdminAuto
  const handleEditVehicleReservation = (res) => {
    setEditingReservation(res);
    setCurrentView('vehicle');
  };

  if (loading) return <div className="app-loading"><div className="spinner"></div><p>Chargement...</p></div>;

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <img src={`${process.env.PUBLIC_URL}/images/Blason_ville_MAUREPAS.png`} alt="Blason" className="blason-maurepas" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'left', textAlign: 'center', color: 'white' }}>
              <h1 style={{ margin: 0, lineHeight: '1.2', fontSize: '1.5rem', color: 'white' }}>Portail de Réservations</h1>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: 'white' }}>Mairie de MAUREPAS</div>
            </div>
          </div>
          <nav className="main-nav">
            <button className={currentView === 'calendar' ? 'active' : ''} onClick={() => setCurrentView('calendar')}>
              🏢 <span className="nav-text">Salles</span>
            </button>
            <button className={currentView === 'vehicle' ? 'active' : ''} onClick={() => setCurrentView('vehicle')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={`${process.env.PUBLIC_URL}/images/32x32.png`} alt="Auto" style={{ height: '20px', width: 'auto' }} /> <span className="nav-text">Clio</span>
            </button>
            
            <button 
              className={currentView === 'ia' ? 'active' : ''} 
              onClick={() => setCurrentView('ia')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              🤖 <span className="nav-text">IA</span>
            </button>

            <button className={currentView === 'myreservations' ? 'active' : ''} onClick={() => setCurrentView('myreservations')}>✏️ <span className="nav-text-opt">Mes Réservations</span></button>
            <div className="dropdown">
              <button className={`dropbtn ${['admin', 'adminAuto', 'adminIA'].includes(currentView) ? 'active' : ''}`}>⚙️ <span className="nav-text-opt">Admin ▼</span></button>
              <div className="dropdown-content">
                <button onClick={() => setCurrentView('admin')}>Administration des Salles</button>
                <button onClick={() => setCurrentView('adminAuto')}>Administration de la Clio</button>
                <button onClick={() => setCurrentView('adminIA')}>Administration des outils de l'IA</button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && <CalendarView onDateSelect={handleDateSelect} onRoomSelect={handleRoomSelect} isDateInPast={isDateInPast} defaultView={calendarTab} />}
        {currentView === 'reservation' && selectedDate && <ReservationGrid selectedDate={selectedDate} editReservationId={editReservationId} onBack={handleBackToCalendar} onSuccess={handleReservationSuccess} />}
        
        {/* La vue RoomView reçoit bien editingReservation pour la surbrillance */}
        {currentView === 'roomview' && selectedRoom && <SingleRoomGrid selectedRoom={selectedRoom} editingReservation={editingReservation} onBack={handleBackFromRoom} onSuccess={handleReservationSuccess} />}
        
        {currentView === 'vehicle' && <VehicleGrid onBack={() => { setEditingReservation(null); setCurrentView('calendar'); }} editingReservation={editingReservation} />}
        
        {currentView === 'ia' && <IAGrid onBack={() => setCurrentView('calendar')} />}

        {currentView === 'myreservations' && <MyReservations userEmail={userEmail} setUserEmail={setUserEmail} onEditReservation={handleEditReservation} />}
        
        {/* AdminPanel utilise maintenant la fonction corrigée */}
        {currentView === 'admin' && <AdminPanel onEditReservation={handleEditReservation} />}
        
        {currentView === 'adminAuto' && <AdminAuto onEditReservation={handleEditVehicleReservation} />}
        
        {currentView === 'adminIA' && <AdminIA />} 
      </main>

      <footer className="app-footer"><p>© 2026 Mairie de MAUREPAS - Portail de réservation | DSI</p></footer>
    </div>
  );
}

export default App;