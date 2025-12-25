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
  const [filter, setFilter] = useState('all'); // État pour le filtre actif
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

  const filterReservations = (filterType) => {
    const now = new Date();
    setFilter(filterType); // Mettre à jour l'état du filtre actif
    
    if (filterType === 'all') {
      setFilteredReservations(reservations);
    } else if (filterType === 'upcoming') {
      const upcoming = reservations.filter(res => {
        const resDate = new Date(`${res.dateDebut}T${res.heureDebut}`);
        return resDate > now;
      });
      setFilteredReservations(upcoming);
    } else if (filterType === 'past') {
      const past = reservations.filter(res => {
        const resDate = new Date(`${res.dateDebut}T${res.heureFin || res.heureDebut}`);
        return resDate < now;
      });
      setFilteredReservations(past);
    } else if (filterType === 'today') {
      const today = reservations.filter(res => {
        const resDate = new Date(res.dateDebut);
        const todayDate = new Date();
        return resDate.toDateString() === todayDate.toDateString();
      });
      setFilteredReservations(today);
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

  // Calculer le statut d'une réservation
  const getReservationStatus = (reservation) => {
    // Si statut explicite "Annulé" ou "Modifié", le garder
    if (reservation.statut === 'Annulé' || reservation.statut === 'Annulée') {
      return 'Annulé';
    }
    if (reservation.statut === 'Modifié' || reservation.statut === 'Modifiée') {
      return 'Modifié';
    }

    // Sinon calculer si passé ou à venir
    const now = new Date();
    const reservationDateTime = new Date(`${reservation.dateDebut}T${reservation.heureFin}`);
    
    if (reservationDateTime < now) {
      return 'Passé';
    } else {
      return 'À venir';
    }
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
    console.log('🔴 BOUTON ANNULER CLIQUÉ !', reservation);
    setCancelModal({
      show: true,
      reservation: reservation
    });
    setSelectedMotif('');
    console.log('🟢 Modal devrait s\'afficher maintenant');
  };

  const handleDeleteConfirm = async () => {
    const reservation = cancelModal.reservation;
    const motif = selectedMotif || 'Aucun motif fourni';
    
    setCancelModal({ show: false, reservation: null });

    try {
      // Étape 1 : Supprimer la réservation
      await googleSheetsService.deleteReservation(reservation.id);
      console.log('✅ Réservation supprimée avec succès');
      
      // Étape 2 : Afficher le message de succès
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif
      });

      // Étape 3 : Recharger les réservations (en arrière-plan)
      try {
        await loadUserReservations();
        console.log('✅ Liste rechargée');
      } catch (reloadError) {
        console.error('⚠️ Erreur rechargement (pas grave):', reloadError);
      }

      // Étape 4 : Envoyer l'email (en arrière-plan)
      try {
        await emailService.sendCancellationEmail({
          ...reservation,
          motif: motif
        });
        console.log('✅ Email envoyé');
      } catch (emailError) {
        console.error('⚠️ Email non envoyé (pas grave):', emailError);
      }

    } catch (error) {
      console.error('❌ ERREUR lors de la suppression:', error);
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif + ' (Erreur lors de la suppression - veuillez vérifier)'
      });
      
      // Recharger quand même pour voir si ça a marché
      try {
        await loadUserReservations();
      } catch (err) {
        console.error('Erreur rechargement:', err);
      }
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
    const headers = ['Salle', 'Date', 'Heure Début', 'Heure Fin', 'Service', 'Objet'];
    const rows = filteredReservations.map(res => [
      res.salle,
      new Date(res.dateDebut).toLocaleDateString('fr-FR'),
      res.heureDebut,
      res.heureFin,
      res.service,
      res.objet
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
    <>
      <div className="my-reservations-container">

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
        <button onClick={() => filterReservations('all')} className={`filter-btn ${filter === 'all' ? 'active' : ''}`}>
          📅 Toutes ({reservations.length})
        </button>
        <button onClick={() => filterReservations('past')} className={`filter-btn ${filter === 'past' ? 'active' : ''}`}>
          📜 Passées ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureFin || r.heureDebut}`) < new Date()).length})
        </button>
        <button onClick={() => filterReservations('today')} className={`filter-btn ${filter === 'today' ? 'active' : ''}`}>
          📆 Aujourd'hui ({reservations.filter(r => {
            const resDate = new Date(r.dateDebut);
            const today = new Date();
            return resDate.toDateString() === today.toDateString();
          }).length})
        </button>
        <button onClick={() => filterReservations('upcoming')} className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}>
          🔜 À venir ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureDebut}`) > new Date()).length})
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedReservations().map((reservation, index) => {
                const backgroundColor = COULEURS_OBJETS[reservation.objet] || '#f9f9f9';
                
                return (
                  <tr key={index} style={{ backgroundColor }}>
                    <td>
						{(() => {
						const parts = reservation.salle.split(' - ');
						const salleNom = parts[0] || reservation.salle;
						const salleCapacite = parts[1] || '';
					return (
						<>
							<div className="salle-nom">{salleNom}</div>
								{salleCapacite && (
									<div className="salle-capacite">{salleCapacite}</div>
									)}
								</>
							);
						})()}
					</td>
                    <td>{new Date(reservation.dateDebut).toLocaleDateString('fr-FR')}</td>
                    <td>{reservation.heureDebut} - {reservation.heureFin}</td>
                    <td>{reservation.service}</td>
                    <td>{reservation.objet}</td>
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

    {/* Modal d'annulation avec sélection de motif */}
    {cancelModal.show && (
      <div className="cancel-modal-overlay" onClick={() => setCancelModal({ show: false, reservation: null })}>
        {console.log('🔵 MODAL RENDU !', cancelModal)}
        <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
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
          
          <button onClick={() => {
            setConfirmModal({ ...confirmModal, show: false });
          }}>
            Fermer
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default MyReservations;
