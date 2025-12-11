// src/components/MyReservations.js
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import emailService from '../services/emailService';
import './MyReservations.css';

function MyReservations({ userEmail, setUserEmail }) {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState(userEmail);
  const [exportFormat, setExportFormat] = useState('ical');

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

  const handleCancelReservation = async (reservation) => {
    const confirm = window.confirm(
      `Êtes-vous sûr de vouloir annuler cette réservation ?\n\n` +
      `Salle: ${reservation.salle}\n` +
      `Date: ${reservation.dateDebut}\n` +
      `Horaire: ${reservation.heureDebut} - ${reservation.heureFin}`
    );

    if (!confirm) return;

    try {
      await googleSheetsService.deleteReservation(reservation.id);
      
      // Envoyer email d'annulation
      try {
        await emailService.sendCancellation(reservation, 'Annulation par l\'utilisateur');
      } catch (emailError) {
        console.error('Erreur email:', emailError);
      }

      alert('Réservation annulée avec succès');
      loadUserReservations();
    } catch (error) {
      alert(`Erreur lors de l'annulation: ${error.message}`);
    }
  };

  const exportToICalendar = () => {
    let icalContent = 'BEGIN:VCALENDAR\n';
    icalContent += 'VERSION:2.0\n';
    icalContent += 'PRODID:-//Mairie//Réservation Salles//FR\n';
    icalContent += 'CALSCALE:GREGORIAN\n';
    icalContent += 'METHOD:PUBLISH\n';

    filteredReservations.forEach(res => {
      const startDateTime = `${res.dateDebut.replace(/-/g, '')}T${res.heureDebut.replace(':', '')}00`;
      const endDateTime = `${res.dateFin.replace(/-/g, '')}T${res.heureFin.replace(':', '')}00`;
      
      icalContent += 'BEGIN:VEVENT\n';
      icalContent += `UID:${res.id}@mairie.fr\n`;
      icalContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icalContent += `DTSTART:${startDateTime}\n`;
      icalContent += `DTEND:${endDateTime}\n`;
      icalContent += `SUMMARY:Réservation ${res.salle}\n`;
      icalContent += `DESCRIPTION:${res.objet} - ${res.service}\n`;
      icalContent += `LOCATION:${res.salle}\n`;
      icalContent += 'END:VEVENT\n';
    });

    icalContent += 'END:VCALENDAR';

    // Télécharger le fichier
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations_${userEmail.split('@')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };

  const filterByPeriod = (period) => {
    const now = new Date();
    let filtered = [];

    switch (period) {
      case 'all':
        filtered = reservations;
        break;
      case 'future':
        filtered = reservations.filter(res => {
          const resDate = new Date(`${res.dateDebut}T${res.heureDebut}`);
          return resDate >= now;
        });
        break;
      case 'past':
        filtered = reservations.filter(res => {
          const resDate = new Date(`${res.dateFin}T${res.heureFin}`);
          return resDate < now;
        });
        break;
      default:
        filtered = reservations;
    }

    setFilteredReservations(filtered);
  };

  return (
    <div className="my-reservations">
      <h2>📋 Mes Réservations</h2>

      <div className="search-section">
        <form onSubmit={handleSearch}>
          <label>Entrez votre adresse email :</label>
          <div className="search-input-group">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="votre.email@mairie.fr"
              required
            />
            <button type="submit">🔍 Rechercher</button>
          </div>
        </form>
      </div>

      {userEmail && (
        <>
          <div className="filter-section">
            <div className="filter-buttons">
              <button onClick={() => filterByPeriod('all')}>Toutes</button>
              <button onClick={() => filterByPeriod('future')}>À venir</button>
              <button onClick={() => filterByPeriod('past')}>Passées</button>
            </div>
            
            <div className="export-buttons">
              <button onClick={exportToICalendar} className="export-btn">
                📅 Exporter iCal
              </button>
              <button onClick={exportToPDF} className="export-btn">
                📄 Imprimer PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Chargement...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="no-reservations">
              <p>Aucune réservation trouvée pour cette adresse email.</p>
            </div>
          ) : (
            <div className="reservations-list">
              {filteredReservations.map(res => {
                const isUpcoming = new Date(`${res.dateDebut}T${res.heureDebut}`) > new Date();
                
                return (
                  <div key={res.id} className={`reservation-card ${!isUpcoming ? 'past' : ''}`}>
                    <div className="reservation-header">
                      <h3>{res.salle}</h3>
                      {isUpcoming && (
                        <button
                          onClick={() => handleCancelReservation(res)}
                          className="cancel-btn"
                        >
                          ❌ Annuler
                        </button>
                      )}
                    </div>
                    
                    <div className="reservation-details">
                      <div className="detail-row">
                        <span className="label">📅 Date:</span>
                        <span>{new Date(res.dateDebut).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">🕐 Horaire:</span>
                        <span>{res.heureDebut} - {res.heureFin}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">👤 Nom:</span>
                        <span>{res.prenom} {res.nom}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">🏢 Service:</span>
                        <span>{res.service}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📝 Objet:</span>
                        <span>{res.objet}</span>
                      </div>
                      {res.recurrence && (
                        <div className="detail-row">
                          <span className="label">🔄 Récurrence:</span>
                          <span>Chaque semaine jusqu'au {res.recurrenceJusquau}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyReservations;
