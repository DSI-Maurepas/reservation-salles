// src/components/AdminPanel.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import { ADMINISTRATEURS, SALLES, MOTIFS_ANNULATION, COULEURS_OBJETS } from '../config/googleSheets';
import Statistics from './Statistics';
import './AdminPanel.css';

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSalle, setFilterSalle] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // États pour les modals
  const [cancelModal, setCancelModal] = useState({ show: false, reservation: null });
  const [confirmModal, setConfirmModal] = useState({ show: false, reservation: null, motif: '', type: '' });
  const [selectedMotif, setSelectedMotif] = useState('');
  
  const [stats, setStats] = useState({
    total: 0,
    parSalle: {},
    parService: {},
    parObjet: {}
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadAllReservations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [reservations, filterSalle, filterDate, searchTerm, sortColumn, sortDirection]);


  const handleAuthenticate = (e) => {
    e.preventDefault();
    
    if (ADMINISTRATEURS.includes(adminEmail.toLowerCase())) {
      setIsAuthenticated(true);
      localStorage.setItem('adminEmail', adminEmail);
    } else {
      alert('Accès refusé. Vous n\'êtes pas autorisé à accéder à cette section.');
    }
  };

  const loadAllReservations = async () => {
    setLoading(true);
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      
      // Trier par date
      allReservations.sort((a, b) => {
        const dateA = new Date(`${a.dateDebut}T${a.heureDebut}`);
        const dateB = new Date(`${b.dateDebut}T${b.heureDebut}`);
        return dateB - dateA;
      });

      setReservations(allReservations);
      calculateStats(allReservations);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement des réservations');
    }
    setLoading(false);
  };

  const calculateStats = (reservations) => {
    const stats = {
      total: reservations.length,
      parSalle: {},
      parService: {},
      parObjet: {}
    };

    reservations.forEach(res => {
      // Par salle
      stats.parSalle[res.salle] = (stats.parSalle[res.salle] || 0) + 1;
      
      // Par service
      stats.parService[res.service] = (stats.parService[res.service] || 0) + 1;
      
      // Par objet
      stats.parObjet[res.objet] = (stats.parObjet[res.objet] || 0) + 1;
    });

    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...reservations];

    // Filtre par salle
    if (filterSalle !== 'all') {
      filtered = filtered.filter(res => res.salle === filterSalle);
    }

    // Filtre par date
    if (filterDate) {
      filtered = filtered.filter(res => res.dateDebut === filterDate);
    }

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(res =>
        res.nom.toLowerCase().includes(term) ||
        res.prenom.toLowerCase().includes(term) ||
        res.service.toLowerCase().includes(term) ||
        res.email.toLowerCase().includes(term)
      );
    }

   // Tri
    if (sortColumn) {
      filtered.sort((a, b) => {
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
    }

    setFilteredReservations(filtered);
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
    if (sortColumn !== column) return ' ⇅'; // Icône neutre (double flèche)
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getObjetColor = (objet) => {
    return COULEURS_OBJETS[objet] || '#e0e0e0';
  };

  // Fonction pour télécharger toutes les réservations en Excel
  const handleDownloadExcel = async () => {
    try {
      // Récupérer toutes les réservations
      const allReservations = await googleSheetsService.getAllReservations();
      
      if (allReservations.length === 0) {
        alert('Aucune réservation à exporter');
        return;
      }

      // Préparer les données pour Excel
      const excelData = allReservations.map(res => ({
        'ID': res.id,
        'Salle': res.salle,
        'Date début': res.dateDebut,
        'Heure début': res.heureDebut,
        'Date fin': res.dateFin,
        'Heure fin': res.heureFin,
        'Nom': res.nom,
        'Prénom': res.prenom,
        'Email': res.email,
        'Téléphone': res.telephone,
        'Service': res.service,
        'Objet': res.objet,
        'Statut': res.statut || 'Confirmée'
      }));

      // Créer le workbook et la feuille
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Réservations');

      // Définir les largeurs de colonnes
      const colWidths = [
        { wch: 25 }, // ID
        { wch: 30 }, // Salle
        { wch: 12 }, // Date début
        { wch: 10 }, // Heure début
        { wch: 12 }, // Date fin
        { wch: 10 }, // Heure fin
        { wch: 20 }, // Nom
        { wch: 20 }, // Prénom
        { wch: 30 }, // Email
        { wch: 15 }, // Téléphone
        { wch: 25 }, // Service
        { wch: 30 }, // Objet
        { wch: 12 }  // Statut
      ];
      ws['!cols'] = colWidths;

      // Télécharger le fichier
      const fileName = `reservations_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`✅ Fichier téléchargé : ${fileName}`);
    } catch (error) {
      console.error('Erreur téléchargement Excel:', error);
      alert('❌ Erreur lors du téléchargement du fichier Excel');
    }
  };


  // Ouvrir le modal d'annulation
  const handleDeleteClick = (reservation) => {
    setCancelModal({
      show: true,
      reservation: reservation
    });
    setSelectedMotif('');
  };

  // Confirmer la suppression avec motif
  const handleDeleteConfirm = async () => {
    const reservation = cancelModal.reservation;
    const motif = selectedMotif || 'Aucun motif fourni';
    
    setCancelModal({ show: false, reservation: null });

    try {
      // Supprimer la réservation
      await googleSheetsService.deleteReservation(reservation.id);
      console.log('✅ Réservation supprimée');
      
      // Afficher confirmation
      setConfirmModal({
        show: true,
        type: 'cancel',
        reservation: reservation,
        motif: motif
      });

      // Recharger
      await loadAllReservations();

      // Envoyer email
      try {
        await emailService.sendCancellationEmail({
          ...reservation,
          motif: motif
        });
        console.log('✅ Email envoyé');
      } catch (emailError) {
        console.error('⚠️ Email non envoyé:', emailError);
      }

    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
      await loadAllReservations();
    }
  };

  // Fonction pour modifier une réservation (redirection vers calendrier)
  const handleEdit = (reservation) => {
    const dateStr = reservation.dateDebut;
    const newHash = `#?date=${dateStr}&edit=${reservation.id}`;
    window.location.hash = newHash;
  };


  const handleDeleteReservation = async (reservation) => {
    // Demander le motif d'annulation (obligatoire) depuis la liste prédéfinie
    let motifTexte = '';
    
    while (!motifTexte) {
      const choix = window.prompt(
        `⚠️ SUPPRESSION DE RÉSERVATION PAR L'ADMINISTRATEUR ⚠️\n\n` +
        `Cette action va supprimer la réservation suivante :\n\n` +
        `📍 Salle: ${reservation.salle}\n` +
        `📅 Date: ${reservation.dateDebut}\n` +
        `🕐 Horaire: ${reservation.heureDebut} - ${reservation.heureFin}\n` +
        `👤 Agent: ${reservation.prenom} ${reservation.nom}\n` +
        `📧 Email: ${reservation.email}\n\n` +
        `⚠️ IMPORTANT : Un email sera envoyé à l'agent pour l'informer.\n\n` +
        `MOTIF D'ANNULATION OBLIGATOIRE\n` +
        `Sélectionnez le numéro du motif :\n\n` +
        MOTIFS_ANNULATION.map((motif, index) => `${index + 1}. ${motif}`).join('\n') +
        `\n\nEntrez le numéro (1-${MOTIFS_ANNULATION.length}) :`
      );

      if (choix === null) {
        // Annulation par l'utilisateur
        return;
      }

      const motifIndex = parseInt(choix);
      
      if (motifIndex >= 1 && motifIndex <= MOTIFS_ANNULATION.length) {
        motifTexte = MOTIFS_ANNULATION[motifIndex - 1];
      } else {
        alert(`❌ Numéro invalide. Veuillez entrer un numéro entre 1 et ${MOTIFS_ANNULATION.length}.`);
      }
    }

    // Confirmation finale
    const confirmation = window.confirm(
      `⚠️ CONFIRMATION FINALE ⚠️\n\n` +
      `Vous êtes sur le point de supprimer cette réservation pour :\n` +
      `"${motifTexte}"\n\n` +
      `Un email sera envoyé à ${reservation.email}\n\n` +
      `Confirmez-vous cette action ?`
    );

    if (!confirmation) return;

    try {
      await googleSheetsService.deleteReservation(reservation.id);
      
      // Envoyer email d'annulation avec le motif
      try {
        await emailService.sendCancellation(
          reservation,
          motifTexte,
          adminEmail // Email de l'administrateur qui supprime
        );
      } catch (emailError) {
        console.error('Erreur email:', emailError);
        alert('⚠️ La réservation a été supprimée mais l\'email n\'a pas pu être envoyé.\n\nVeuillez contacter l\'agent manuellement.');
      }

      alert(`✅ Réservation supprimée avec succès.\n\nMotif : ${motifTexte}\n\n📧 Un email a été envoyé à l'agent.`);
      loadAllReservations();
    } catch (error) {
      alert(`❌ Erreur lors de la suppression: ${error.message}`);
    }
  };

  const exportStats = () => {
    let csvContent = 'Statistiques de réservation\n\n';
    
    csvContent += 'Total de réservations,' + stats.total + '\n\n';
    
    csvContent += 'Par salle\n';
    Object.entries(stats.parSalle).forEach(([salle, count]) => {
      csvContent += `${salle},${count}\n`;
    });
    
    csvContent += '\nPar service\n';
    Object.entries(stats.parService).forEach(([service, count]) => {
      csvContent += `${service},${count}\n`;
    });
    
    csvContent += '\nPar objet\n';
    Object.entries(stats.parObjet).forEach(([objet, count]) => {
      csvContent += `${objet},${count}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques_reservations_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-auth">
        <div className="auth-card">
          <h2>🔒 Accès Administration</h2>
          <p>Cette section est réservée aux administrateurs</p>
          
          <form onSubmit={handleAuthenticate}>
            <div className="form-group">
              <label>Email administrateur</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@mairie.fr"
                required
              />
            </div>
            <button type="submit" className="auth-button">
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Panel d'Administration</h2>
        <div className="admin-header-actions">
          <button onClick={handleDownloadExcel} className="download-excel-btn" title="Télécharger toutes les réservations en Excel">
            📥 Télécharger Excel
          </button>
          <button onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('adminEmail');
          }} className="logout-btn">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Nouveau composant Statistics avec graphiques */}
      <Statistics reservations={reservations} />

      <div className="filters-section">
        <h3>🔍 Filtres et recherche</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Salle</label>
            <select value={filterSalle} onChange={(e) => setFilterSalle(e.target.value)}>
              <option value="all">Toutes les salles</option>
              {SALLES.map(salle => (
                <option key={salle} value={salle}>{salle}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Recherche</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, email, service..."
            />
          </div>
        </div>
      </div>

      <div className="reservations-section">
        <h3>📋 Liste des réservations ({filteredReservations.length})</h3>
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="no-data">
            <p>Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
<thead>
                <tr>
                  <th onClick={() => handleSort('salle')} style={{cursor: 'pointer'}}>
                    Salle{renderSortIcon('salle')}
                  </th>
                  <th onClick={() => handleSort('dateDebut')} style={{cursor: 'pointer'}}>
                    Date{renderSortIcon('dateDebut')}
                  </th>
                  <th onClick={() => handleSort('heureDebut')} style={{cursor: 'pointer'}}>
                    Horaire{renderSortIcon('heureDebut')}
                  </th>
                  <th onClick={() => handleSort('nom')} style={{cursor: 'pointer'}}>
                    Agent{renderSortIcon('nom')}
                  </th>
                  <th onClick={() => handleSort('service')} style={{cursor: 'pointer'}}>
                    Service{renderSortIcon('service')}
                  </th>
                  <th onClick={() => handleSort('objet')} style={{cursor: 'pointer'}}>
                    Objet{renderSortIcon('objet')}
                  </th>
                  <th onClick={() => handleSort('email')} style={{cursor: 'pointer'}}>
                    Email{renderSortIcon('email')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(res => (
                  <tr key={res.id} style={{backgroundColor: `${getObjetColor(res.objet)}20`}}>
                    <td>
                      <div className="salle-cell">
                        <div className="salle-name">{res.salle.split(' - ')[0]}</div>
                        <div className="salle-capacity">{res.salle.split(' - ')[1] || ''}</div>
                      </div>
                    </td>
                    <td>{new Date(res.dateDebut).toLocaleDateString('fr-FR')}</td>
                    <td>{res.heureDebut} - {res.heureFin}</td>
                    <td>{res.prenom} {res.nom}</td>
                    <td>{res.service}</td>
                    <td>
                      {/* MODIFICATION : Suppression du span stylisé, affichage texte brut */}
                      {res.objet}
                    </td>
                    <td>{res.email}</td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleEdit(res)}
                        className="edit-button"
                        title="Modifier cette réservation"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteClick(res)}
                        className="delete-button"
                        title="Supprimer cette réservation"
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Modal d'annulation avec motif */}
    {cancelModal.show && (
      <div className="cancel-modal-overlay" onClick={() => setCancelModal({ show: false, reservation: null })}>
        <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
          <h3>⚠️ Confirmer la suppression</h3>
          
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
            <p><strong>👤 Agent :</strong> {cancelModal.reservation.prenom} {cancelModal.reservation.nom}</p>
          </div>

          <div className="motif-selection">
            <label><strong>💬 Motif de la suppression :</strong></label>
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
              Confirmer la suppression
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de confirmation */}
    {confirmModal.show && (
      <div className="confirmation-modal-overlay" onClick={() => setConfirmModal({ show: false, reservation: null, motif: '', type: '' })}>
        <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
          <h3>✅ Suppression confirmée</h3>
          
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
          
          <button onClick={() => setConfirmModal({ show: false, reservation: null, motif: '', type: '' })}>
            Fermer
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default AdminPanel;