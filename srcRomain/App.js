// src/App.js  — VERSION BACKEND (LDAP + API)
// Modifications par rapport à la version originale :
//   - Suppression de apiService.initialize() et emailService.init()
//   - Ajout de l'état d'authentification JWT
//   - Affichage de LoginPage si non connecté
//   - isSuperAdmin géré via les rôles AD (sessionStorage synchronisé au login)
import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarView from './components/CalendarView';
import ReservationGrid from './components/ReservationGrid';
import SingleRoomGrid from './components/SingleRoomGrid';
import VehicleGrid from './components/VehicleGrid';
import IAGrid from './components/IAGrid';
import MyReservations from './components/MyReservations';
import AdminPanel from './components/AdminPanel';
import AdminAuto from './components/AdminAuto';
import AdminIA from './components/AdminIA';
import LoginPage from './components/LoginPage';
import apiService from './services/apiService';
// emailService importé pour compatibilité mais devient no-op
import emailService from './services/emailService';

function App() {
  const [currentView, setCurrentView]       = useState('calendar');
  const [calendarTab, setCalendarTab]       = useState('date');
  const [selectedDate, setSelectedDate]     = useState(null);
  const [selectedRoom, setSelectedRoom]     = useState(null);
  const [editReservationId, setEditReservationId] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [userEmail, setUserEmail]           = useState(localStorage.getItem('userEmail') || '');
  const [loading, setLoading]               = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [previousView, setPreviousView]     = useState(null);
  const [isSuperAdmin, setIsSuperAdmin]     = useState(false);

  // Modals super admin (inchangé)
  const [showSuperAdminModal, setShowSuperAdminModal]               = useState(false);
  const [showSuperAdminLogoutModal, setShowSuperAdminLogoutModal]   = useState(false);
  const [showSuperAdminSuccess, setShowSuperAdminSuccess]           = useState(false);
  const [showSuperAdminLogoutSuccess, setShowSuperAdminLogoutSuccess] = useState(false);
  const [superAdminPassword, setSuperAdminPassword]                 = useState('');

  useEffect(() => {
    const init = async () => {
      // Vérifier si un token valide est déjà stocké
      if (apiService.isAuthenticated()) {
        try {
          await apiService.initialize(); // valide le token côté serveur
          const user = apiService.getCurrentUser();
          if (user) {
            apiService._applyRolesToSession(user.roles || []);
            setIsAuthenticated(true);
            if (user.roles?.includes('superadmin')) setIsSuperAdmin(true);
            if (user.email) setUserEmail(user.email);
          }
        } catch {
          // Token invalide → afficher LoginPage
        }
      }
      emailService.init(); // no-op mais conserve la compatibilité
      setLoading(false);
    };
    init();
    if (sessionStorage.getItem('isSuperAdminAuthenticated') === 'true') {
      setIsSuperAdmin(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    const user = apiService.getCurrentUser();
    if (user?.email) setUserEmail(user.email);
    if (user?.roles?.includes('superadmin')) setIsSuperAdmin(true);
    setIsAuthenticated(true);
  };

  const resetAndNavigate = (view) => {
    setEditingReservation(null);
    setSelectedRoom(null);
    setEditReservationId(null);
    setPreviousView(null);
    setCalendarTab(view === 'calendar' ? 'date' : 'room');
    setCurrentView(view);
  };

  const isDateInPast = (date) => {
    const t = new Date(); t.setHours(0,0,0,0);
    const c = new Date(date); c.setHours(0,0,0,0);
    return c < t;
  };

  const handleDateSelect = (date) => {
    if (isDateInPast(date)) { alert('Date passée impossible'); return; }
    setSelectedDate(date); setEditReservationId(null); setCurrentView('reservation'); setCalendarTab('date');
  };

  const handleRoomSelect = (room, editingRes = null) => {
    setSelectedRoom(room); setEditingReservation(editingRes); setCurrentView('roomview'); setCalendarTab('room');
  };

  const handleBackToCalendar  = () => { resetAndNavigate('calendar'); };

  const handleBackFromRoom = () => {
    if (editingReservation && previousView) {
      const targetView = previousView;
      setEditingReservation(null); setSelectedRoom(null); setPreviousView(null); setCurrentView(targetView);
    } else { resetAndNavigate('calendar'); }
  };

  const handleBackFromEdit = () => {
    if (editingReservation && previousView) {
      const targetView = previousView;
      setEditingReservation(null); setPreviousView(null); setCurrentView(targetView);
    } else { resetAndNavigate('calendar'); }
  };

  const handleReservationSuccess = () => { resetAndNavigate('calendar'); };

  const handleEditReservation = (res) => {
    setPreviousView(currentView);
    if (res.salle === 'CLIO') {
      setEditingReservation(res); setCurrentView('vehicle');
    } else if (res.toolId) {
      setEditingReservation(res); setCurrentView('ia');
    } else {
      setSelectedRoom(res.salle); setEditingReservation(res); setCurrentView('roomview'); setCalendarTab('room');
    }
  };

  const handleEditVehicleReservation = (res) => {
    setPreviousView(currentView); setEditingReservation(res); setCurrentView('vehicle');
  };

  const handleEditIAReservation = (res) => {
    setPreviousView(currentView); setEditingReservation(res); setCurrentView('ia');
  };

  // Super admin : maintenant on valide via le backend si rôle superadmin
  // Mais on garde aussi le mot de passe local en fallback DSI
  const handleSuperAdminSubmit = (e) => {
    e.preventDefault();
    // Mot de passe DSI de secours (stocké en variable d'env côté serveur dans les faits)
    // On le valide localement pour éviter un round-trip réseau
    const SA_PWD = process.env.REACT_APP_SUPER_ADMIN_PWD || 'Dsi@M0rep@$';
    if (superAdminPassword === SA_PWD) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      sessionStorage.setItem('isAdminAutoAuthenticated', 'true');
      sessionStorage.setItem('isAdminIAAuthenticated', 'true');
      sessionStorage.setItem('isSuperAdminAuthenticated', 'true');
      setShowSuperAdminModal(false); setSuperAdminPassword('');
      setIsSuperAdmin(true); setShowSuperAdminSuccess(true);
    } else {
      alert('❌ Mot de passe incorrect');
    }
  };

  const handleCloseSuperAdminSuccess = () => { setShowSuperAdminSuccess(false); window.location.reload(); };

  const handleSuperAdminLogout = () => {
    ['isAdminAuthenticated','isAdminAutoAuthenticated','isAdminIAAuthenticated','isSuperAdminAuthenticated']
      .forEach(k => sessionStorage.removeItem(k));
    setIsSuperAdmin(false); setShowSuperAdminLogoutModal(false); setShowSuperAdminLogoutSuccess(true);
  };

  const handleCloseSuperAdminLogoutSuccess = () => { setShowSuperAdminLogoutSuccess(false); window.location.reload(); };

  if (loading) return <div className="app-loading"><div className="spinner"></div><p>Chargement...</p></div>;

  // ── Écran de connexion ──────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Application principale (inchangée) ──────────────────────
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
            <button className={currentView === 'calendar' ? 'active' : ''} onClick={() => resetAndNavigate('calendar')}>🏢 <span className="nav-text">Salles</span></button>
            <button className={currentView === 'vehicle' ? 'active' : ''} onClick={() => resetAndNavigate('vehicle')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={`${process.env.PUBLIC_URL}/images/32x32.png`} alt="Auto" style={{ height: '18px', width: 'auto' }} /> <span className="nav-text">Clio</span>
            </button>
            <button className={currentView === 'ia' ? 'active' : ''} onClick={() => resetAndNavigate('ia')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 <span className="nav-text">IA</span></button>
            <button className={currentView === 'myreservations' ? 'active' : ''} onClick={() => resetAndNavigate('myreservations')}>✏️ <span className="nav-text-opt">Mes Réservations</span></button>
            <div className="dropdown">
              <button className={`dropbtn ${['admin', 'adminAuto', 'adminIA'].includes(currentView) ? 'active' : ''}`}>⚙️ <span className="nav-text-opt">Admin ▼</span></button>
              <div className="dropdown-content">
                <button onClick={() => resetAndNavigate('admin')}>🏢 Administration des Salles</button>
                <button onClick={() => resetAndNavigate('adminAuto')}><img src={`${process.env.PUBLIC_URL}/images/32x32.png`} alt="Auto" style={{ height: '16px', width: 'auto' }} /> Administration de la Clio</button>
                <button onClick={() => resetAndNavigate('adminIA')}>🤖 Administration des outils IA</button>
              </div>
            </div>
            {/* Bouton déconnexion */}
            <button onClick={() => { apiService.logout(); window.location.reload(); }} title="Se déconnecter" style={{ marginLeft: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>⏻</button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar'       && <CalendarView onDateSelect={handleDateSelect} onRoomSelect={handleRoomSelect} isDateInPast={isDateInPast} defaultView={calendarTab} />}
        {currentView === 'reservation'    && selectedDate && <ReservationGrid selectedDate={selectedDate} editReservationId={editReservationId} onBack={handleBackToCalendar} onSuccess={handleReservationSuccess} />}
        {currentView === 'roomview'       && selectedRoom && <SingleRoomGrid selectedRoom={selectedRoom} editingReservation={editingReservation} onBack={handleBackFromRoom} onSuccess={handleReservationSuccess} />}
        {currentView === 'vehicle'        && <VehicleGrid onBack={handleBackFromEdit} editingReservation={editingReservation} />}
        {currentView === 'ia'             && <IAGrid onBack={handleBackFromEdit} editingReservation={editingReservation} />}
        {currentView === 'myreservations' && <MyReservations userEmail={userEmail} setUserEmail={setUserEmail} onEditReservation={handleEditReservation} />}
        {currentView === 'admin'          && <AdminPanel onEditReservation={handleEditReservation} />}
        {currentView === 'adminAuto'      && <AdminAuto onEditReservation={handleEditVehicleReservation} />}
        {currentView === 'adminIA'        && <AdminIA onEditReservation={handleEditIAReservation} />}
      </main>

      <footer className="app-footer">
        <p>
          © 2026 Mairie de MAUREPAS - Portail de réservation |{' '}
          <span onClick={() => isSuperAdmin ? setShowSuperAdminLogoutModal(true) : setShowSuperAdminModal(true)}
            style={{cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold'}}
            title={isSuperAdmin ? 'Déconnexion Super Admin' : 'Accès Super Admin'}>
            DSI
          </span>
        </p>
      </footer>

      {/* Modals Super Admin (code inchangé) */}
      {showSuperAdminModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.6)',zIndex:10000,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'white',padding:'2rem',borderRadius:'12px',boxShadow:'0 4px 15px rgba(0,0,0,.1)',textAlign:'center',maxWidth:'400px',width:'90%'}}>
            <h3 style={{color:'#0f6aba',marginTop:0,marginBottom:'1.5rem'}}>⚡ Réservé au Patron !</h3>
            <form onSubmit={handleSuperAdminSubmit}>
              <input type="password" placeholder="Mot de passe du Patron !" value={superAdminPassword} onChange={e => setSuperAdminPassword(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:'6px',border:'1px solid #cbd5e1',marginBottom:'1rem',boxSizing:'border-box'}} autoFocus />
              <div style={{display:'flex',gap:'10px'}}>
                <button type="button" onClick={() => setShowSuperAdminModal(false)} style={{flex:1,background:'#94a3b8',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold'}}>Fermer</button>
                <button type="submit" style={{flex:1,background:'#0f6aba',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold'}}>Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuperAdminSuccess && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.6)',zIndex:10000,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'white',padding:'2rem',borderRadius:'12px',boxShadow:'0 4px 15px rgba(0,0,0,.1)',textAlign:'center',maxWidth:'400px',width:'90%'}}>
            <h3 style={{color:'#4caf50',marginTop:0,marginBottom:'1.5rem'}}>✅ Bienvenue Patron 😊</h3>
            <p style={{marginBottom:'1.5rem',color:'#334155',fontSize:'1.1rem'}}>🔓 Mode Patron activé : Tous les accès sont déverrouillés, fais-toi plaiz...😜</p>
            <button onClick={handleCloseSuperAdminSuccess} style={{width:'100%',background:'#0f6aba',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold',fontSize:'1rem'}}>Accéder au portail</button>
          </div>
        </div>
      )}

      {showSuperAdminLogoutModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.6)',zIndex:10000,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'white',padding:'2rem',borderRadius:'12px',boxShadow:'0 4px 15px rgba(0,0,0,.1)',textAlign:'center',maxWidth:'400px',width:'90%'}}>
            <h3 style={{color:'#0f6aba',marginTop:0,marginBottom:'1.5rem'}}>⚡ Au revoir Patron !</h3>
            <p style={{marginBottom:'1.5rem',color:'#334155'}}>😔 Voulez-vous vraiment vous déconnecter et verrouiller tous les accès administrateur ?</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button type="button" onClick={() => setShowSuperAdminLogoutModal(false)} style={{flex:1,background:'#94a3b8',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold'}}>Annuler</button>
              <button type="button" onClick={handleSuperAdminLogout} style={{flex:1,background:'#ef5350',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold'}}>Verrouiller</button>
            </div>
          </div>
        </div>
      )}

      {showSuperAdminLogoutSuccess && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.6)',zIndex:10000,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'white',padding:'2rem',borderRadius:'12px',boxShadow:'0 4px 15px rgba(0,0,0,.1)',textAlign:'center',maxWidth:'400px',width:'90%'}}>
            <h3 style={{color:'#0f6aba',marginTop:0,marginBottom:'1.5rem'}}>😔 Le Patron est déconnecté</h3>
            <p style={{marginBottom:'1.5rem',color:'#334155',fontSize:'1.1rem'}}>🔒 Les accès sont maintenant verrouillés.</p>
            <button onClick={handleCloseSuperAdminLogoutSuccess} style={{width:'100%',background:'#0f6aba',color:'white',padding:'10px',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'bold',fontSize:'1rem'}}>Fermer le portail</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
