// src/components/MyReservations.js
// VERSION FINALE - BOUTON MODIFIER FONCTIONNEL SANS REACT-ROUTER
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { MOTIFS_ANNULATION, COULEURS_OBJETS } from '../config/googleSheets';
import './MyReservations.css';

// CORRECTION #10: Fonction pour convertir couleurs en pastel
const toPastel = (hexColor) => {
  if (!hexColor || hexColor === '#f9f9f9') return '#f9f9f9';
  
  // Convertir hex en RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Éclaircir en mélangeant avec du blanc (80% blanc, 20% couleur)
  const pastelR = Math.round(r * 0.3 + 255 * 0.7);
  const pastelG = Math.round(g * 0.3 + 255 * 0.7);
  const pastelB = Math.round(b * 0.3 + 255 * 0.7);
  
  // Reconvertir en hex
  return `#${pastelR.toString(16).padStart(2, '0')}${pastelG.toString(16).padStart(2, '0')}${pastelB.toString(16).padStart(2, '0')}`;
};

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

  const handleEdit = (reservation) => {
    if (onEditReservation && typeof onEditReservation === 'function') {
      onEditReservation(reservation);
      return;
    }
    try {
      const dateStr = reservation.dateDebut;
      const newHash = `#?date=${dateStr}&edit=${reservation.id}`;
      window.location.hash = newHash;
      setTimeout(() => {
        if (!window.location.hash.includes('edit=')) {
          window.location.href = `${window.location.origin}${window.location.pathname}${newHash}`;
        }
      }, 200);
      return;
    } catch (err) {
      console.error('❌ Erreur changement hash:', err);
    }
    const dateStr = reservation.dateDebut;
    const url = `${window.location.origin}${window.location.pathname}?date=${dateStr}&edit=${reservation.id}`;
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
      try {
        await loadUserReservations();
      } catch (reloadError) {
        console.error('⚠️ Erreur rechargement (pas grave):', reloadError);
      }
      try {
        await emailService.sendCancellationEmail({
          ...reservation,
          motif: motif
        });
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
    } else if (exportFormat === 'xlsx') {
      exportToXLSX();
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

  const exportToXLSX = () => {
    const headers = ['Salle', 'Date', 'Horaire', 'Agent', 'Service', 'Objet', 'Email', 'Téléphone', 'Description', 'Récurrence'];
    const rows = filteredReservations.map(res => [
      res.salle,
      new Date(res.dateDebut).toLocaleDateString('fr-FR'),
      `${res.heureDebut} - ${res.heureFin}`,
      `${res.prenom || ''} ${res.nom || ''}`.trim(),
      res.service,
      res.objet,
      res.email || '',
      res.telephone || '',
      res.description || '',
      res.recurrence ? `OUI (jusqu'au ${res.recurrenceJusquau || 'N/A'})` : 'NON'
    ]);

    const xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Réservations">
  <Table>
   <Row>
    ${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
   </Row>
   ${rows.map(row => `<Row>
    ${row.map(cell => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('')}
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${userEmail}_${new Date().toISOString().split('T')[0]}.xls`;
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

  // --- FONCTION UTILITAIRE POUR FORMATAGE MOBILE ---
  const formatMobileRoomName = (name) => {
    if (!name) return '';
    return name
      .replace('Salle Conseil', 'Conseil')
      .replace('Salle Mariages', 'Mariages')
      .replace('Salle N°', 'Salle ')
      .replace('Salle CCAS', 'CCAS');
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
          <option value="xlsx">📗 Excel (.xls)</option>
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
                {/* Colonnes masquées en mobile via CSS */}
                <th className="col-service" onClick={() => handleSort('service')} style={{cursor: 'pointer'}}>
                  Service{renderSortIcon('service')}
                </th>
                <th className="col-objet" onClick={() => handleSort('objet')} style={{cursor: 'pointer'}}>
                  Objet{renderSortIcon('objet')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedReservations().map((reservation, index) => {
                const backgroundColor = toPastel(COULEURS_OBJETS[reservation.objet] || '#f9f9f9');
                
                return (
                  <tr key={index} style={{ backgroundColor }}>
                    <td>
						{(() => {
						const parts = reservation.salle.split(' - ');
						const salleNom = parts[0] || reservation.salle;
						const salleCapacite = parts[1] || '';
					return (
						<>
                            {/* NOM SALLE : Double affichage */}
							<div className="salle-nom desktop-view">{salleNom}</div>
                            <div className="salle-nom mobile-view">{formatMobileRoomName(salleNom)}</div>
                            
                            {/* CAPACITÉ : Double affichage */}
							{salleCapacite && (
                                <>
									<div className="salle-capacite desktop-view">{salleCapacite}</div>
                                    <div className="salle-capacite mobile-view">{salleCapacite.replace('Personnes', 'Pers.')}</div>
                                </>
							)}
						</>
					);
						})()}
					</td>
                    <td>
                        {/* DATE : Double affichage */}
                        <span className="desktop-view">{new Date(reservation.dateDebut).toLocaleDateString('fr-FR')}</span>
                        <span className="mobile-view">{new Date(reservation.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                    </td>
                    <td>
                        {/* HEURE : Double affichage */}
                        <span className="desktop-view">{reservation.heureDebut} - {reservation.heureFin}</span>
                        <span className="mobile-view">{reservation.heureDebut} {reservation.heureFin}</span>
                    </td>
                    <td className="col-service">{reservation.service}</td>
                    <td className="col-objet">{reservation.objet}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleEdit(reservation)}
                        className="edit-button"
                        title="Modifier cette réservation"
                      >
                        ✏️<span className="btn-label"> Modifier</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(reservation)}
                        className="delete-button"
                        title="Annuler cette réservation"
                      >
                        🗑️<span className="btn-label"> Annuler</span>
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

    {/* Modals... (inchangés) */}
    {cancelModal.show && (
      <div className="cancel-modal-overlay" onClick={() => setCancelModal({ show: false, reservation: null })}>
        <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
          <h3>⚠️ Confirmer l'annulation</h3>
          <div className="reservation-details">
            <p><strong>📅 Date :</strong> {new Date(cancelModal.reservation.dateDebut).toLocaleDateString('fr-FR')}</p>
            <p><strong>🕐 Horaire :</strong> {cancelModal.reservation.heureDebut} - {cancelModal.reservation.heureFin}</p>
            <p><strong>🏢 Salle :</strong> {cancelModal.reservation.salle}</p>
            <p><strong>📝 Objet :</strong> {cancelModal.reservation.objet}</p>
          </div>
          <div className="motif-selection">
            <label><strong>💬 Motif de l'annulation :</strong></label>
            <select value={selectedMotif} onChange={(e) => setSelectedMotif(e.target.value)} className="motif-select">
              <option value="">-- Sélectionnez un motif --</option>
              {MOTIFS_ANNULATION.map((motif, index) => <option key={index} value={motif}>{motif}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button onClick={() => setCancelModal({ show: false, reservation: null })} className="cancel-action-btn">Annuler</button>
            <button onClick={handleDeleteConfirm} className="confirm-action-btn" disabled={!selectedMotif}>Confirmer l'annulation</button>
          </div>
        </div>
      </div>
    )}

    {confirmModal.show && (
      <div className="confirmation-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
        <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
          <h3>{confirmModal.type === 'cancel' ? '✅ Annulation confirmée' : '✅ Modification confirmée'}</h3>
          <div className="reservation-details">
            <p><strong>📅 Date :</strong> {new Date(confirmModal.reservation.dateDebut).toLocaleDateString('fr-FR')}</p>
            <p><strong>🕐 Horaire :</strong> {confirmModal.reservation.heureDebut} - {confirmModal.reservation.heureFin}</p>
            <p><strong>🏢 Salle :</strong> {confirmModal.reservation.salle}</p>
            <p><strong>📝 Objet :</strong> {confirmModal.reservation.objet}</p>
            {confirmModal.motif && <p><strong>💬 Motif :</strong> {confirmModal.motif}</p>}
          </div>
          <button onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Fermer</button>
        </div>
      </div>
    )}
    </>
  );
}

export default MyReservations;