// src/components/AdminPanel.js
import React, { useState, useEffect } from 'react';
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
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getObjetColor = (objet) => {
    return COULEURS_OBJETS[objet] || '#e0e0e0';
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
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Panel d'Administration</h2>
        <button onClick={() => {
          setIsAuthenticated(false);
          localStorage.removeItem('adminEmail');
        }} className="logout-btn">
          Déconnexion
        </button>
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
                  <tr key={res.id} style={{backgroundColor: `${getObjetColor(res.objet)}40`}}>
                    <td>{res.salle}</td>
                    <td>{new Date(res.dateDebut).toLocaleDateString('fr-FR')}</td>
                    <td>{res.heureDebut} - {res.heureFin}</td>
                    <td>{res.prenom} {res.nom}</td>
                    <td>{res.service}</td>
                    <td>
                      <span style={{
                        backgroundColor: getObjetColor(res.objet),
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        color: '#1a1a1a',
                        fontWeight: '600',
                        fontSize: '0.85rem'
                      }}>
                        {res.objet}
                      </span>
                    </td>
                    <td>{res.email}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteReservation(res)}
                        className="delete-btn"
                        title="Annuler cette réservation"
                      >
                        🗑️
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
  );
}

export default AdminPanel;
