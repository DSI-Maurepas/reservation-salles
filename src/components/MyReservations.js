// src/components/MyReservations.js
// VERSION FINALE - BOUTON MODIFIER FONCTIONNEL SANS REACT-ROUTER
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { MOTIFS_ANNULATION, COULEURS_OBJETS } from '../config/googleSheets';
import './MyReservations.css';

function MyReservations({ userEmail, setUserEmail, onEditReservation }) {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState(userEmail);
  const [exportFormat, setExportFormat] = useState('ical');
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // État pour modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: '',
    reservation: null,
    motif: ''
  });

  // État pour le modal d'annulation avec sélection de motif
  const [cancelModal, setCancelModal] = useState({
    show: false,
    reservation: null
  });
  
  const [selectedMotif, setSelectedMotif] = useState('');

  useEffect(() => {
    if (userEmail) {
      loadUserReservations();
    }
  }, [userEmail]);

  const loadUserReservations = async () => {
    setLoading(true);
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      const userReservations = allReservations.filter(
        res => res.email.toLowerCase() === userEmail.toLowerCase()
      );
      
      // Trier par date (les plus récentes en premier)
      userReservations.sort((a, b) => {
        const dateA = new Date(`${a.dateDebut}T${a.heureDebut}`);
        const dateB = new Date(`${b.dateDebut}T${b.heureDebut}`);
        return dateB - dateA;
      });

      setReservations(userReservations);
      setFilteredReservations(userReservations);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      alert('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchEmail) return;
    setUserEmail(searchEmail);
  };

  const filterReservations = (filter) => {
    const now = new Date();
    
    if (filter === 'all') {
      setFilteredReservations(reservations);
    } else if (filter === 'upcoming') {
      const upcoming = reservations.filter(res => {
        const resDate = new Date(`${res.dateDebut}T${res.heureDebut}`);
        return resDate >= now;
      });
      setFilteredReservations(upcoming);
    } else if (filter === 'past') {
      const past = reservations.filter(res => {
        const resDate = new Date(`${res.dateDebut}T${res.heureFin || res.heureDebut}`);
        return resDate < now;
      });
      setFilteredReservations(past);
    }
  };

  const getSortedReservations = () => {
    if (!sortColumn) return filteredReservations;

    return [...filteredReservations].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'dateDebut') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      }
    });
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // CORRECTION DÉFINITIVE DU BOUTON MODIFIER
  const handleEdit = (reservation) => {
    console.log('=== MODIFICATION RÉSERVATION ===');
    console.log('Réservation:', reservation);
    console.log('ID:', reservation.id);
    console.log('Date:', reservation.dateDebut);
    console.log('Salle:', reservation.salle);
    
    // Méthode 1 : Si onEditReservation callback existe (passé depuis App.js)
    if (onEditReservation && typeof onEditReservation === 'function') {
      console.log('✅ Utilisation callback onEditReservation');
      onEditReservation(reservation);
      return;
    }

    // Méthode 2 : Changement de hash avec format simple
    try {
      const dateStr = reservation.dateDebut;
      // Format: #?date=2026-01-12&edit=ID
      const newHash = `#?date=${dateStr}&edit=${reservation.id}`;
      console.log('✅ Changement hash:', newHash);
      window.location.hash = newHash;
      
      // Attendre 200ms et vérifier si changement effectué
      setTimeout(() => {
        console.log('Hash actuel:', window.location.hash);
        if (!window.location.hash.includes('edit=')) {
          console.log('⚠️ Hash non pris en compte, rechargement...');
          window.location.href = `${window.location.origin}${window.location.pathname}${newHash}`;
        }
      }, 200);
      return;
    } catch (err) {
      console.error('❌ Erreur changement hash:', err);
    }

    // Méthode 3 : Rechargement complet avec paramètres URL
    const dateStr = reservation.dateDebut;
    const url = `${window.location.origin}${window.location.pathname}?date=${dateStr}&edit=${reservation.id}`;
    console.log('✅ Rechargement complet:', url);
    window.location.href = url;
  };

  const handleDeleteClick = (reservation) => {
    setCancelModal({
      show: true,
      reservation: reservation
    });
    setSelectedMotif('');
  };

  const handleDeleteConfirm = async () => {
    const reservation = cancelModal.reservation;
    const motif = selectedMotif || 'Aucun motif fourni';
    
    setCancelModal({ show: false, reservation: null });

    try {
      await googleSheetsService.deleteReservation(reservation.id);
      
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif
      });

      loadUserReservations().catch(err => {
        console.error('Erreur rechargement:', err);
      });

      emailService.sendCancellationEmail({
        ...reservation,
        motif: motif
      }).catch(emailError => {
        console.error('Email non envoyé:', emailError);
      });

    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif + ' (Erreur lors de la suppression - veuillez vérifier)'
      });
      loadUserReservations().catch(err => console.error('Erreur rechargement:', err));
    }
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToICalendar();
    }
  };

  const exportToCSV = () => {
    const headers = ['Salle', 'Date', 'Heure Début', 'Heure Fin', 'Service', 'Objet', 'Statut'];
    const rows = filteredReservations.map(res => [
      res.salle,
      new Date(res.dateDebut).toLocaleDateString('fr-FR'),
      res.heureDebut,
      res.heureFin,
      res.service,
      res.objet,
      res.statut || 'Confirmée'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${userEmail}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToICalendar = () => {
    const events = filteredReservations.map(res => {
      const startDate = new Date(`${res.dateDebut}T${res.heureDebut}:00`);
      const endDate = new Date(`${res.dateDebut}T${res.heureFin}:00`);
      
      return [
        'BEGIN:VEVENT',
        `DTSTART:${formatICalDate(startDate)}`,
        `DTEND:${formatICalDate(endDate)}`,
        `SUMMARY:${res.salle} - ${res.objet}`,
        `DESCRIPTION:Service: ${res.service}`,
        `LOCATION:${res.salle}`,
        'END:VEVENT'
      ].join('\r\n');
    });

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Maurepas//Réservation Salles//FR',
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${userEmail}_${new Date().toISOString().split('T')[0]}.ics`;
    link.click();
  };

  const formatICalDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  if (loading) {
    return (
      <div className="my-reservations-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement de vos réservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-reservations-container">
      {/* Modal d'annulation avec sélection de motif */}
      {cancelModal.show && (
        <div className="confirmation-modal-overlay" onClick={() => setCancelModal({ show: false, reservation: null })}>
          <div className="confirmation-modal cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirmer l'annulation</h3>
            
            <div className="reservation-details">
              <p><strong>📅 Date :</strong> {new Date(cancelModal.reservation.dateDebut).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</p>
              <p><strong>🕐 Horaire :</strong> {cancelModal.reservation.heureDebut} - {cancelModal.reservation.heureFin}</p>
              <p><strong>🏢 Salle :</strong> {cancelModal.reservation.salle}</p>
              <p><strong>📝 Objet :</strong> {cancelModal.reservation.objet}</p>
            </div>

            <div className="motif-selection">
              <label><strong>💬 Motif de l'annulation :</strong></label>
              <select 
                value={selectedMotif} 
                onChange={(e) => setSelectedMotif(e.target.value)}
                className="motif-select"
              >
                <option value="">-- Sélectionnez un motif --</option>
                {MOTIFS_ANNULATION.map((motif, index) => (
                  <option key={index} value={motif}>{motif}</option>
                ))}
              </select>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setCancelModal({ show: false, reservation: null })}
                className="cancel-action-btn"
              >
                Annuler
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="confirm-action-btn"
                disabled={!selectedMotif}
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {confirmModal.show && (
        <div className="confirmation-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {confirmModal.type === 'cancel' ? '✅ Annulation confirmée' : '✅ Modification confirmée'}
            </h3>
            
            <div className="reservation-details">
              <p><strong>📅 Date :</strong> {new Date(confirmModal.reservation.dateDebut).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</p>
              <p><strong>🕐 Horaire :</strong> {confirmModal.reservation.heureDebut} - {confirmModal.reservation.heureFin}</p>
              <p><strong>🏢 Salle :</strong> {confirmModal.reservation.salle}</p>
              <p><strong>📝 Objet :</strong> {confirmModal.reservation.objet}</p>
              {confirmModal.motif && (
                <p><strong>💬 Motif :</strong> {confirmModal.motif}</p>
              )}
            </div>
            
            <button onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
              Fermer
            </button>
          </div>
        </div>
      )}

      <h1>📋 Mes Réservations</h1>

      <div className="search-section">
        <form onSubmit={handleSearch}>
          <input
            type="email"
            placeholder="Entrez votre email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            required
          />
          <button type="submit">🔍 Rechercher</button>
        </form>
      </div>

      <div className="filter-buttons">
        <button onClick={() => filterReservations('all')} className="filter-btn">
          📅 Toutes ({reservations.length})
        </button>
        <button onClick={() => filterReservations('upcoming')} className="filter-btn">
          📆 À venir ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureDebut}`) >= new Date()).length})
        </button>
        <button onClick={() => filterReservations('past')} className="filter-btn">
          📜 Passées ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureFin || r.heureDebut}`) < new Date()).length})
        </button>
      </div>

      <div className="export-section">
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
          <option value="ical">📅 iCalendar (.ics)</option>
          <option value="csv">📊 CSV</option>
        </select>
        <button onClick={handleExport} className="export-btn">
          ⬇️ Exporter
        </button>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="no-reservations">
          <p>Aucune réservation trouvée</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="reservations-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('salle')} style={{cursor: 'pointer'}}>
                  Salle{renderSortIcon('salle')}
                </th>
                <th onClick={() => handleSort('dateDebut')} style={{cursor: 'pointer'}}>
                  Date{renderSortIcon('dateDebut')}
                </th>
                <th onClick={() => handleSort('heureDebut')} style={{cursor: 'pointer'}}>
                  Heure{renderSortIcon('heureDebut')}
                </th>
                <th onClick={() => handleSort('service')} style={{cursor: 'pointer'}}>
                  Service{renderSortIcon('service')}
                </th>
                <th onClick={() => handleSort('objet')} style={{cursor: 'pointer'}}>
                  Objet{renderSortIcon('objet')}
                </th>
                <th onClick={() => handleSort('statut')} style={{cursor: 'pointer'}}>
                  Statut{renderSortIcon('statut')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedReservations().map((reservation, index) => {
                const backgroundColor = COULEURS_OBJETS[reservation.objet] || '#f9f9f9';
                
                return (
                  <tr key={index} style={{ backgroundColor }}>
                    <td>{reservation.salle}</td>
                    <td>{new Date(reservation.dateDebut).toLocaleDateString('fr-FR')}</td>
                    <td>{reservation.heureDebut} - {reservation.heureFin}</td>
                    <td>{reservation.service}</td>
                    <td>{reservation.objet}</td>
                    <td>
                      <span className={`status-badge ${reservation.statut?.toLowerCase()}`}>
                        {reservation.statut || 'Confirmée'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleEdit(reservation)}
                        className="edit-button"
                        title="Modifier cette réservation"
                      >
                        ✏️ Modifier
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(reservation)}
                        className="delete-button"
                        title="Annuler cette réservation"
                      >
                        🗑️ Annuler
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyReservations;
