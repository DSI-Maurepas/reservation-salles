// src/components/AdminPanel.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { SALLES, MOTIFS_ANNULATION, COULEURS_OBJETS } from '../config/googleSheets';
import Statistics from './Statistics';
import './AdminPanel.css';

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSalle, setFilterSalle] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  const [cancelModal, setCancelModal] = useState({ show: false, reservation: null });
  const [confirmModal, setConfirmModal] = useState({ show: false, reservation: null, motif: '', type: '' });
  const [selectedMotif, setSelectedMotif] = useState('');
  
  const [stats, setStats] = useState({
    total: 0,
    parSalle: {},
    parService: {},
    parObjet: {}
  });

  const ADMIN_PASSWORD_HARDCODED = 'R3sa@M0rep@s78';

  useEffect(() => {
    const sessionAuth = localStorage.getItem('isAdminAuthenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllReservations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [reservations, filterSalle, filterDate, filterDateStart, filterDateEnd, searchTerm, sortColumn, sortDirection]);

  const handleAuthenticate = (e) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD_HARDCODED) {
      setIsAuthenticated(true);
      localStorage.setItem('isAdminAuthenticated', 'true');
    } else {
      alert('❌ Mot de passe incorrect.');
      setAdminPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPassword('');
    localStorage.removeItem('isAdminAuthenticated');
  };

  const loadAllReservations = async () => {
    setLoading(true);
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      allReservations.sort((a, b) => {
        const dateA = new Date(`${a.dateDebut}T${a.heureDebut}`);
        const dateB = new Date(`${b.dateDebut}T${b.heureDebut}`);
        return dateB - dateA;
      });
      setReservations(allReservations);
      calculateStats(allReservations);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des réservations');
    }
    setLoading(false);
  };

  const calculateStats = (reservations) => {
    const stats = { total: reservations.length, parSalle: {}, parService: {}, parObjet: {} };
    reservations.forEach(res => {
      stats.parSalle[res.salle] = (stats.parSalle[res.salle] || 0) + 1;
      stats.parService[res.service] = (stats.parService[res.service] || 0) + 1;
      stats.parObjet[res.objet] = (stats.parObjet[res.objet] || 0) + 1;
    });
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...reservations];
    if (filterSalle !== 'all') filtered = filtered.filter(res => res.salle === filterSalle);
    if (filterDate) filtered = filtered.filter(res => res.dateDebut === filterDate);
    // Filtre période (de/à)
    if (filterDateStart) {
      filtered = filtered.filter(res => res.dateDebut >= filterDateStart);
    }
    if (filterDateEnd) {
      filtered = filtered.filter(res => res.dateDebut <= filterDateEnd);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(res =>
        res.nom.toLowerCase().includes(term) ||
        res.prenom.toLowerCase().includes(term) ||
        res.service.toLowerCase().includes(term) ||
        res.email.toLowerCase().includes(term)
      );
    }
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (sortColumn === 'dateDebut') { aVal = new Date(aVal); bVal = new Date(bVal); }
        if (sortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        else return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      });
    }
    setFilteredReservations(filtered);
  };

  const handleSort = (column) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const renderSortIcon = (column) => {
    if (sortColumn !== column) return ' ⇅';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getObjetColor = (objet) => COULEURS_OBJETS[objet] || '#e0e0e0';

  const handleDownloadExcel = async () => {
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      if (allReservations.length === 0) { alert('Aucune réservation à exporter'); return; }
      const excelData = allReservations.map(res => ({
        'ID': res.id, 'Salle': res.salle, 'Date début': res.dateDebut, 'Heure début': res.heureDebut,
        'Date fin': res.dateFin, 'Heure fin': res.heureFin, 'Nom': res.nom, 'Prénom': res.prenom,
        'Email': res.email, 'Téléphone': res.telephone, 'Service': res.service, 'Objet': res.objet,
        'Statut': res.statut || 'Confirmée'
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Réservations');
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }];
      XLSX.writeFile(wb, `reservations_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert(`✅ Fichier téléchargé`);
    } catch (error) { console.error(error); alert('❌ Erreur téléchargement'); }
  };

  const handleDeleteClick = (reservation) => { setCancelModal({ show: true, reservation: reservation }); setSelectedMotif(''); };

  const handleDeleteConfirm = async () => {
    const reservation = cancelModal.reservation;
    const motif = selectedMotif || 'Aucun motif fourni';
    setCancelModal({ show: false, reservation: null });
    try {
      await googleSheetsService.deleteReservation(reservation.id);
      setConfirmModal({ show: true, type: 'cancel', reservation: reservation, motif: motif });
      await loadAllReservations();
      try { await emailService.sendCancellationEmail({ ...reservation, motif: motif, cancelledBy: 'Administrateur' }); } catch (e) {}
    } catch (error) { console.error(error); alert('❌ Erreur suppression'); await loadAllReservations(); }
  };

  const handleEdit = (reservation) => {
    const dateStr = reservation.dateDebut;
    const salle = reservation.salle;
    const newHash = `#calendar?salle=${encodeURIComponent(salle)}&date=${dateStr}&edit=${reservation.id}`;
    window.location.hash = newHash;
  };

  // --- ECRAN DE CONNEXION ---
  if (!isAuthenticated) {
    return (
      <div className="admin-auth">
        <div className="auth-card">
          <div className="admin-login-blue-block">
            <span className="login-icon-desktop">🔒</span>
            <span className="login-text-desktop">
              Cette section est réservée aux administrateurs. Mot de passe Administrateur
            </span>
            <span className="login-title-mobile">
              Accès Administrateur
            </span>
            <form onSubmit={handleAuthenticate} className="admin-login-form-inline">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="admin-password-input-inline"
              />
              <button type="submit" className="auth-button-inline">
                Se connecter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="admin-panel">
      
      <div className="admin-header">
        <div className="admin-header-actions">
          <button onClick={handleDownloadExcel} className="download-excel-btn">📥 Télécharger Excel</button>
          <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
        </div>
      </div>

      <Statistics reservations={reservations} />

      <div className="filters-section">
        <h3>🔍 Filtres et recherche</h3>
        <div className="filters-grid">
          <div className="filter-group"><label>Salle</label><select value={filterSalle} onChange={(e) => setFilterSalle(e.target.value)}><option value="all">Toutes les salles</option>{SALLES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="filter-group"><label>Date</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} /></div>
          <div className="filter-group">
            <label>Période</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} placeholder="Du" style={{ flex: 1 }} />
              <span>à</span>
              <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} placeholder="Au" style={{ flex: 1 }} />
            </div>
          </div>
          <div className="filter-group"><label>Recherche</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nom, email, service..." /></div>
        </div>
      </div>

      <div className="reservations-section">
        <h3>📋 Liste des réservations ({filteredReservations.length})</h3>
        {loading ? <div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div> : filteredReservations.length === 0 ? <div className="no-data"><p>Aucune réservation trouvée</p></div> : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr><th onClick={() => handleSort('salle')}>Salle{renderSortIcon('salle')}</th><th onClick={() => handleSort('dateDebut')}>Date{renderSortIcon('dateDebut')}</th><th onClick={() => handleSort('heureDebut')}>Horaire{renderSortIcon('heureDebut')}</th><th onClick={() => handleSort('nom')}>Agent{renderSortIcon('nom')}</th><th onClick={() => handleSort('service')}>Service{renderSortIcon('service')}</th><th onClick={() => handleSort('objet')}>Objet{renderSortIcon('objet')}</th><th onClick={() => handleSort('email')}>Email{renderSortIcon('email')}</th><th>Actions</th></tr></thead>
              <tbody>{filteredReservations.map(res => (<tr key={res.id} style={{backgroundColor: `${getObjetColor(res.objet)}20`}}><td><div className="salle-cell"><div className="salle-name">{res.salle.split(' - ')[0]}</div><div className="salle-capacity">{res.salle.split(' - ')[1] || ''}</div></div></td>
              
              <td>{new Date(res.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
              
              <td>{res.heureDebut} - {res.heureFin}</td><td>{res.prenom} {res.nom}</td><td>{res.service}</td><td>{res.objet}</td><td>{res.email}</td>
              
              {/* CORRECTION STRUCTURELLE : TD normal avec DIV wrapper à l'intérieur */}
              <td>
                <div className="actions-wrapper">
                  <button onClick={() => handleEdit(res)} className="edit-button">Modifier</button>
                  <button onClick={() => handleDeleteClick(res)} className="delete-button">Supprimer</button>
                </div>
              </td>
              
              </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    {cancelModal.show && (<div className="cancel-modal-overlay" onClick={() => setCancelModal({ show: false, reservation: null })}><div className="cancel-modal" onClick={(e) => e.stopPropagation()}><h3>⚠️ Confirmer la suppression</h3><div className="reservation-details"><p><strong>📅 Date :</strong> {new Date(cancelModal.reservation.dateDebut).toLocaleDateString('fr-FR')}</p><p><strong>🕐 Horaire :</strong> {cancelModal.reservation.heureDebut} - {cancelModal.reservation.heureFin}</p><p><strong>🏢 Salle :</strong> {cancelModal.reservation.salle}</p><p><strong>📝 Objet :</strong> {cancelModal.reservation.objet}</p><p><strong>👤 Agent :</strong> {cancelModal.reservation.prenom} {cancelModal.reservation.nom}</p></div><div className="motif-selection"><label><strong>💬 Motif :</strong></label><select value={selectedMotif} onChange={(e) => setSelectedMotif(e.target.value)} className="motif-select"><option value="">-- Motif --</option>{MOTIFS_ANNULATION.map((m, i) => <option key={i} value={m}>{m}</option>)}</select></div><div className="modal-actions"><button onClick={() => setCancelModal({ show: false, reservation: null })} className="cancel-action-btn">Annuler</button><button onClick={handleDeleteConfirm} className="confirm-action-btn" disabled={!selectedMotif}>Confirmer</button></div></div></div>)}
    {confirmModal.show && (<div className="confirmation-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}><div className="confirmation-modal" onClick={(e) => e.stopPropagation()}><h3>✅ Suppression confirmée</h3><div className="reservation-details"><p><strong>📅 Date :</strong> {new Date(confirmModal.reservation.dateDebut).toLocaleDateString('fr-FR')}</p><p><strong>🕐 Horaire :</strong> {confirmModal.reservation.heureDebut} - {confirmModal.reservation.heureFin}</p><p><strong>🏢 Salle :</strong> {confirmModal.reservation.salle}</p>{confirmModal.motif && <p><strong>💬 Motif :</strong> {confirmModal.motif}</p>}</div><button onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Fermer</button></div></div>)}
    </>
  );
}

export default AdminPanel;