// src/components/MyReservations.js
// VERSION AVEC CORRECTIONS 1, 7, 8, 9, 11
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { MOTIFS_ANNULATION, COULEURS_OBJETS } from '../config/googleSheets';
import './MyReservations.css';

function MyReservations({ userEmail, setUserEmail }) {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState(userEmail);
  const [exportFormat, setExportFormat] = useState('ical');
  
  // Correction 7 : États pour le tri
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Correction 11 : État pour modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: '', // 'cancel' ou 'modify'
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
      alert('Erreur lors du chargement de vos réservations');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setUserEmail(searchEmail);
    localStorage.setItem('userEmail', searchEmail);
  };

  const filterReservations = (filter) => {
    const now = new Date();
    let filtered = [...reservations];

    switch(filter) {
      case 'upcoming':
        filtered = filtered.filter(res => {
          const resDate = new Date(`${res.dateDebut}T${res.heureDebut}`);
          return resDate >= now;
        });
        break;
      case 'past':
        filtered = filtered.filter(res => {
          const resDate = new Date(`${res.dateDebut}T${res.heureDebut}`);
          return resDate < now;
        });
        break;
      default:
        // 'all' - tous les résultats
        break;
    }

    setFilteredReservations(filtered);
  };

  // Correction 7 : Fonction de tri
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Inverser la direction si même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, tri ascendant par défaut
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Correction 7 : Appliquer le tri
  const getSortedReservations = () => {
    if (!sortColumn) return filteredReservations;

    return [...filteredReservations].sort((a, b) => {
      let aVal = a[sortColumn] || '';
      let bVal = b[sortColumn] || '';

      // Pour les dates, comparer comme dates
      if (sortColumn === 'dateDebut') {
        aVal = new Date(`${a.dateDebut}T${a.heureDebut}`);
        bVal = new Date(`${b.dateDebut}T${b.heureDebut}`);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Pour le reste, comparer comme strings
      if (sortDirection === 'asc') {
        return aVal.toString().localeCompare(bVal.toString(), 'fr');
      } else {
        return bVal.toString().localeCompare(aVal.toString(), 'fr');
      }
    });
  };

  // Correction 7 : Rendu icône tri
  const renderSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // Correction 8 : Modifier une réservation
  const handleEdit = (reservation) => {
    // Construire l'URL avec le hash pour la navigation React
    const date = reservation.dateDebut;
    const params = new URLSearchParams({
      edit: reservation.id,
      salle: reservation.salle,
      heure: reservation.heureDebut
    });
    
    // Utiliser window.location.hash au lieu de href pour la navigation SPA
    window.location.hash = `reservation/${date}?${params.toString()}`;
  };

  // Correction 10 & 11 : Annuler avec modal de sélection de motif
  const handleDeleteClick = (reservation) => {
    setCancelModal({
      show: true,
      reservation: reservation
    });
    setSelectedMotif(''); // Réinitialiser la sélection
  };

  const handleDeleteConfirm = async () => {
    const reservation = cancelModal.reservation;
    const motif = selectedMotif || 'Aucun motif fourni';
    
    // Fermer le modal de sélection immédiatement
    setCancelModal({ show: false, reservation: null });

    try {
      // Suppression de la réservation
      await googleSheetsService.deleteReservation(reservation.id);
      
      // Afficher modal de confirmation IMMÉDIATEMENT (avant le reload)
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif
      });

      // Recharger les réservations en arrière-plan
      loadUserReservations().catch(err => {
        console.error('Erreur rechargement:', err);
      });

      // Envoyer email en arrière-plan (ne pas attendre)
      emailService.sendCancellationEmail({
        ...reservation,
        motif: motif
      }).catch(emailError => {
        console.error('Email non envoyé:', emailError);
      });

    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      // Afficher quand même le modal avec un message d'avertissement
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif + ' (Erreur lors de la suppression - veuillez vérifier)'
      });
      // Recharger pour vérifier l'état réel
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
    const headers = ['Date', 'Heure Début', 'Heure Fin', 'Salle', 'Service', 'Objet'];
    const rows = filteredReservations.map(res => [
      res.dateDebut,
      res.heureDebut,
      res.heureFin,
      res.salle,
      res.service,
      res.objet
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mes-reservations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToICalendar = () => {
    let icalContent = 'BEGIN:VCALENDAR\n';
    icalContent += 'VERSION:2.0\n';
    icalContent += 'PRODID:-//Mairie//Réservations//FR\n';

    filteredReservations.forEach(res => {
      const startDateTime = `${res.dateDebut.replace(/-/g, '')}T${res.heureDebut.replace(':', '')}00`;
      const endDateTime = `${res.dateDebut.replace(/-/g, '')}T${res.heureFin.replace(':', '')}00`;
      
      icalContent += 'BEGIN:VEVENT\n';
      icalContent += `UID:${res.id}@mairie.fr\n`;
      icalContent += `DTSTART:${startDateTime}\n`;
      icalContent += `DTEND:${endDateTime}\n`;
      icalContent += `SUMMARY:${res.salle}\n`;
      icalContent += `DESCRIPTION:${res.objet} - ${res.service}\n`;
      icalContent += `LOCATION:${res.salle}\n`;
      icalContent += 'END:VEVENT\n';
    });

    icalContent += 'END:VCALENDAR';

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mes-reservations-${new Date().toISOString().split('T')[0]}.ics`;
    link.click();
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

      {/* Correction 11 : Modal de confirmation */}
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

      {!userEmail && (
        <div className="info-message">
          <p>👆 Entrez votre adresse email pour voir vos réservations</p>
        </div>
      )}

      {userEmail && (
        <>
          <div className="filter-section">
            <button onClick={() => filterReservations('all')} className="filter-btn">
              📅 Toutes ({reservations.length})
            </button>
            <button onClick={() => filterReservations('upcoming')} className="filter-btn">
              ⏭️ À venir ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureDebut}`) >= new Date()).length})
            </button>
            <button onClick={() => filterReservations('past')} className="filter-btn">
              ⏮️ Passées ({reservations.filter(r => new Date(`${r.dateDebut}T${r.heureDebut}`) < new Date()).length})
            </button>
          </div>

          <div className="export-section">
            <select 
              value={exportFormat} 
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="ical">📅 iCalendar (.ics)</option>
              <option value="csv">📊 CSV</option>
            </select>
            <button onClick={handleExport} className="export-btn">
              ⬇️ Exporter
            </button>
            {/* Correction 9 : Bouton PDF SUPPRIMÉ */}
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
                    {/* Correction 7 : Colonnes cliquables pour tri */}
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
                    // Correction 1 : Obtenir la couleur selon l'objet
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
                          {/* Correction 8 : Bouton Modifier */}
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
        </>
      )}
    </div>
  );
}

export default MyReservations;
