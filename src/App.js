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
// ✅ IMPORT CONFIG POUR SUPER ADMIN
import { APP_CONFIG } from './config/googleSheets';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [calendarTab, setCalendarTab] = useState('date');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null); 
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [loading, setLoading] = useState(true);

  // ✅ ETATS POUR LE MODAL SUPER ADMIN
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');

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
  
  const handleEditReservation = (res) => { 
    if (res.salle === 'CLIO') {
      setEditingReservation(res);
      setCurrentView('vehicle');
    } else {
      setSelectedRoom(res.salle);
      setEditingReservation(res);
      setCurrentView('roomview');
      setCalendarTab('room'); 
    }
  };

  const handleEditVehicleReservation = (res) => {
    setEditingReservation(res);
    setCurrentView('vehicle');
  };

  // ✅ NOUVEAU : Gestion édition IA depuis AdminIA
  const handleEditIAReservation = (res) => {
    setEditingReservation(res);
    setCurrentView('ia');
  };

  // ✅ GESTION DU SUPER ADMIN
  const handleSuperAdminSubmit = (e) => {
    e.preventDefault();
    if (superAdminPassword === APP_CONFIG.SUPER_ADMIN_PASSWORD) {
      // Déverrouillage de TOUTES les sessions
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      sessionStorage.setItem('isAdminAutoAuthenticated', 'true');
      sessionStorage.setItem('isAdminIAAuthenticated', 'true');
      
      alert('🔓 Mode Super Admin activé : Tous les accès sont déverrouillés.');
      setShowSuperAdminModal(false);
      setSuperAdminPassword('');
      // Rechargement pour appliquer les droits aux composants Admin
      window.location.reload(); 
    } else {
      alert('❌ Mot de passe incorrect');
    }
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
                <button onClick={() => setCurrentView('adminIA')}>Administration Des outils IA</button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && <CalendarView onDateSelect={handleDateSelect} onRoomSelect={handleRoomSelect} isDateInPast={isDateInPast} defaultView={calendarTab} />}
        {currentView === 'reservation' && selectedDate && <ReservationGrid selectedDate={selectedDate} editReservationId={editReservationId} onBack={handleBackToCalendar} onSuccess={handleReservationSuccess} />}
        
        {currentView === 'roomview' && selectedRoom && <SingleRoomGrid selectedRoom={selectedRoom} editingReservation={editingReservation} onBack={handleBackFromRoom} onSuccess={handleReservationSuccess} />}
        
        {currentView === 'vehicle' && <VehicleGrid onBack={() => { setEditingReservation(null); setCurrentView('calendar'); }} editingReservation={editingReservation} />}
        
        {/* ✅ PASSAGE de editingReservation à IAGrid */}
        {currentView === 'ia' && <IAGrid onBack={() => { setEditingReservation(null); setCurrentView('calendar'); }} editingReservation={editingReservation} />}

        {currentView === 'myreservations' && <MyReservations userEmail={userEmail} setUserEmail={setUserEmail} onEditReservation={handleEditReservation} />}
        
        {currentView === 'admin' && <AdminPanel onEditReservation={handleEditReservation} />}
        
        {currentView === 'adminAuto' && <AdminAuto onEditReservation={handleEditVehicleReservation} />}
        
        {/* ✅ PASSAGE de onEditReservation à AdminIA */}
        {currentView === 'adminIA' && <AdminIA onEditReservation={handleEditIAReservation} />} 
      </main>

      <footer className="app-footer">
        <p>
          © 2026 Mairie de MAUREPAS - Portail de réservation | 
          {/* ✅ LIEN DSI CLIQUABLE */}
          <span 
            onClick={() => setShowSuperAdminModal(true)} 
            style={{cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold'}}
            title="Accès Super Admin"
          >
            DSI
          </span>
        </p>
      </footer>

      {/* ✅ MODAL SUPER ADMIN */}
      {showSuperAdminModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center',
            maxWidth: '400px', width: '90%'
          }}>
            <h3 style={{ color: '#0f6aba', marginTop: 0, marginBottom: '1.5rem' }}>⚡ Super Admin DSI</h3>
            <form onSubmit={handleSuperAdminSubmit}>
              <input 
                type="password" 
                placeholder="Mot de passe Maître" 
                value={superAdminPassword} 
                onChange={(e) => setSuperAdminPassword(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowSuperAdminModal(false)} style={{ flex: 1, background: '#94a3b8', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Fermer</button>
                <button type="submit" style={{ flex: 1, background: '#0f6aba', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;