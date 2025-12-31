// src/components/SingleRoomGrid.js
import React, { useState, useEffect } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import icalService from '../services/icalService';
import { HORAIRES, SERVICES, OBJETS_RESERVATION, JOURS_FERIES, COULEURS_OBJETS, SALLES_ADMIN_ONLY, ADMINISTRATEURS } from '../config/googleSheets';
import { getSalleData } from '../data/sallesData';
import SalleCard from './SalleCard';
import './SingleRoomGrid.css';

function SingleRoomGrid({ selectedRoom, onBack, onSuccess }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [reservations, setReservations] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [blockedDayModal, setBlockedDayModal] = useState(false);
  const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [successModal, setSuccessModal] = useState({
    show: false,
    reservations: [],
    message: ''
  });
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    service: '',
    objet: '',
    description: ''
  });

  const salleData = getSalleData(selectedRoom);

  useEffect(() => {
    loadWeekReservations();
  }, [currentWeekStart, selectedRoom]);

  const loadWeekReservations = async () => {
    setLoading(true);
    try {
      const allReservations = await googleSheetsService.getAllReservations();
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const filtered = allReservations.filter(res => {
        if (res.salle !== selectedRoom) return false;
        const resDate = new Date(res.dateDebut);
        return resDate >= currentWeekStart && resDate <= weekEnd;
      });
      
      setReservations(filtered);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    }
    setLoading(false);
  };
  
	// Ajouter ces fonctions (après loadWeekReservations)
	const isAdminOnlyRoom = (room) => {
	  return SALLES_ADMIN_ONLY.includes(room);
	};

	const canUserBookRoom = (room, email) => {
	  if (!isAdminOnlyRoom(room)) return true;
	  if (isAdminUnlocked) return true;
	  return ADMINISTRATEURS.includes(email?.toLowerCase());
	};

	const handleAdminPasswordSubmit = () => {
	  if (adminPasswordModal.password === 'Maurepas2025') {
		setIsAdminUnlocked(true);
		setAdminPasswordModal({ show: false, password: '' });
	  } else {
		alert('❌ Mot de passe incorrect');
		setAdminPasswordModal({ ...adminPasswordModal, password: '' });
	  }
	};

  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dates = getDates();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handlePreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
    setSelections([]);
    setShowForm(false);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
    setSelections([]);
    setShowForm(false);
  };

  const formatWeekRange = () => {
    const start = currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 6);
    const endStr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${endStr}`;
  };

  const isSlotOccupied = (date, hour) => {
    const dateStr = googleSheetsService.formatDate(date);
    return reservations.some(res => {
      if (res.dateDebut !== dateStr) return false;
      const startHour = parseInt(res.heureDebut.split(':')[0]);
      const endHour = parseInt(res.heureFin.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  const getReservation = (date, hour) => {
    const dateStr = googleSheetsService.formatDate(date);
    return reservations.find(res => {
      if (res.dateDebut !== dateStr) return false;
      const startHour = parseInt(res.heureDebut.split(':')[0]);
      const endHour = parseInt(res.heureFin.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  const isDateBlocked = (date) => {
    if (date.getDay() === 0) return true; // Dimanche
    const dateStr = googleSheetsService.formatDate(date);
    return JOURS_FERIES.includes(dateStr);
  };

  const isSlotSelected = (dayIndex, hour) => {
    return selections.some(sel => sel.dayIndex === dayIndex && sel.hour === hour);
  };

  const handleMouseDown = (dayIndex, hour, date) => {
    if (isDateBlocked(date)) {
      setBlockedDayModal(true);
      return;
    }
    
	  // NOUVEAU: Vérifier salle admin
    if (isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked) {
    setAdminPasswordModal({ show: true, password: '' });
    return;
    }
	
	if (isSlotOccupied(date, hour)) {
      alert('Ce créneau est déjà réservé');
      return;
    }
    setIsDragging(true);
    setDragStart({ dayIndex, hour });
    setSelections([{ dayIndex, hour, date }]);
    setShowForm(false);
  };

  const handleMouseEnter = (dayIndex, hour, date) => {
    if (!isDragging || !dragStart) return;
    if (isSlotOccupied(date, hour)) return;

    const minDay = Math.min(dragStart.dayIndex, dayIndex);
    const maxDay = Math.max(dragStart.dayIndex, dayIndex);
    const minHour = Math.min(dragStart.hour, hour);
    const maxHour = Math.max(dragStart.hour, hour);

    const newSelections = [];
    for (let d = minDay; d <= maxDay; d++) {
      for (let h = minHour; h <= maxHour; h++) {
        if (!isSlotOccupied(dates[d], h)) {
          newSelections.push({ dayIndex: d, hour: h, date: dates[d] });
        }
      }
    }
    setSelections(newSelections);
  };

  const handleMouseUp = () => {
    if (isDragging && selections.length > 0) {
      setShowForm(true);
    }
    setIsDragging(false);
    setDragStart(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (selections.length === 0) {
      alert('Aucun créneau sélectionné');
      return;
    }

    setLoading(true);
    try {
      const reservationsByDay = {};
      selections.forEach(sel => {
        const dateStr = googleSheetsService.formatDate(sel.date);
        if (!reservationsByDay[dateStr]) {
          reservationsByDay[dateStr] = [];
        }
        reservationsByDay[dateStr].push(sel.hour);
      });

      const createdReservations = [];
      for (const [dateStr, hours] of Object.entries(reservationsByDay)) {
        hours.sort((a, b) => a - b);
        const startHour = hours[0];
        const endHour = hours[hours.length - 1] + 1;

        const reservation = {
          salle: selectedRoom,
          dateDebut: dateStr,
          dateFin: dateStr,
          heureDebut: `${startHour}:00`,
          heureFin: `${endHour}:00`,
          ...formData,
          statut: 'confirmée'
        };

        console.log('📤 Création réservation:', reservation);
        const created = await googleSheetsService.addReservation(reservation);
        console.log('✅ Réservation créée:', created);
        createdReservations.push(created);
      }

      setSuccessModal({
        show: true,
        reservations: createdReservations,
        message: `🎉 Réservation${createdReservations.length > 1 ? 's' : ''} confirmée${createdReservations.length > 1 ? 's' : ''} !`
      });
      setSelections([]);
      setShowForm(false);
      setFormData({ nom: '', prenom: '', email: '', service: '', objet: '', description: '' });
      loadWeekReservations();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('❌ Erreur création réservations:', error);
      alert(`❌ Erreur: ${error.message || 'Impossible de créer la réservation'}`);
    }
    setLoading(false);
  };

  const handleCancelSelection = () => {
    setSelections([]);
    setShowForm(false);
  };

  const gridRows = [];
  for (let h = HORAIRES.HEURE_DEBUT; h < HORAIRES.HEURE_FIN; h++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const date = dates[d];
      const occupied = isSlotOccupied(date, h);
      const selected = isSlotSelected(d, h);
      const reservation = occupied ? getReservation(date, h) : null;
      const blocked = isDateBlocked(date);
      cells.push({
        dayIndex: d,
        hour: h,
        date: date,
        occupied: occupied,
        selected: selected,
        reservation: reservation,
        blocked: blocked
      });
    }
    gridRows.push({ hour: h, cells: cells });
  }

  const creneauText = selections.length === 1 ? 'créneau' : 'créneaux';

  return (
    <div className="single-room-container">
      <div className="single-room-header">
        <button onClick={onBack} className="back-button">← Retour</button>
        <h2>🏛️ {salleData?.nom || selectedRoom}</h2>
      </div>

      <div className="week-navigation">
        <button onClick={handlePreviousWeek} className="week-nav-btn">◀ Semaine précédente</button>
        <h3>{formatWeekRange()}</h3>
        <button onClick={handleNextWeek} className="week-nav-btn">Semaine suivante ▶</button>
      </div>

      <div className="single-room-layout">
        <div className="room-sidebar">
          <SalleCard salle={selectedRoom} />
          
          {showForm && selections.length > 0 && (
            <div className="room-form-container">
              <h3 className="form-title">
                <span className="form-icon">📝</span>
                Réservation de {selections.length} {creneauText}
              </h3>
              <form onSubmit={handleFormSubmit} className="room-form">
                <div className="form-row">
                  <input 
                    type="text" 
                    placeholder="Nom *" 
                    value={formData.nom} 
                    onChange={(e) => setFormData({...formData, nom: e.target.value})} 
                    required 
                    className="form-input"
                  />
                  <input 
                    type="text" 
                    placeholder="Prénom" 
                    value={formData.prenom} 
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})} 
                    className="form-input"
                  />
                </div>
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  className="form-input"
                />
                <select 
                  value={formData.service} 
                  onChange={(e) => setFormData({...formData, service: e.target.value})} 
                  required
                  className="form-select"
                >
                  <option value="">Sélectionnez un service *</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select 
                  value={formData.objet} 
                  onChange={(e) => setFormData({...formData, objet: e.target.value})} 
                  required
                  className="form-select"
                >
                  <option value="">Objet de la réservation *</option>
                  {OBJETS_RESERVATION.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <textarea 
                  placeholder="Description (optionnelle)" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  rows="3"
                  className="form-textarea"
                />
                <div className="form-actions">
                  <button type="button" onClick={handleCancelSelection} className="btn-cancel">
                    ✖ Annuler
                  </button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? '⏳ Envoi...' : '✓ Valider la réservation'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="week-grid-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <table className="week-grid">
            <thead>
              <tr>
                <th className="hour-header">Heure</th>
                {dates.map((date, idx) => (
                  <th key={`header-${idx}`} className="day-header">
                    <div className="day-name">{weekDays[idx]}</div>
                    <div className="day-date">{date.getDate()}/{date.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRows.map(row => (
                <tr key={`row-${row.hour}`}>
                  <td className="hour-cell">{row.hour}h</td>
                  {row.cells.map((cell, idx) => {
                    const backgroundColor = cell.reservation && cell.reservation.objet && COULEURS_OBJETS[cell.reservation.objet]
                      ? COULEURS_OBJETS[cell.reservation.objet]
                      : 'white';
                    
                    return (
                      <td
						key={`cell-${row.hour}-${idx}`}
						className={`time-slot 
							${cell.occupied ? 'occupied' : ''} 
							${cell.selected ? 'selected' : ''} 
							${cell.blocked ? 'blocked' : ''}
							${(cell.hour === 12 || cell.hour === 13) ? 'lunch-break' : ''}
							${isAdminOnlyRoom(selectedRoom) && !isAdminUnlocked ? 'admin-only-locked' : ''}
						`}
						style={{
							backgroundColor: cell.occupied && cell.reservation?.objet && COULEURS_OBJETS[cell.reservation.objet]
							? COULEURS_OBJETS[cell.reservation.objet]
							: 'white'
						}}
						onMouseDown={() => !cell.occupied && !cell.blocked && handleMouseDown(cell.dayIndex, cell.hour, cell.date)}
                        onMouseEnter={(e) => {
                          handleMouseEnter(cell.dayIndex, cell.hour, cell.date);
                          if (cell.occupied && cell.reservation) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredReservation(cell.reservation);
                            setPopupPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredReservation(null);
                        }}
                      >
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal jour férié/dimanche */}
      {blockedDayModal && (
        <div className="blocked-modal-overlay" onClick={() => setBlockedDayModal(false)}>
          <div className="blocked-modal" onClick={(e) => e.stopPropagation()}>
            <div className="blocked-modal-header">
              <span className="blocked-icon">🚫</span>
              <h2>Réservation impossible</h2>
            </div>
            <div className="blocked-modal-body">
              <p>Les réservations ne sont pas autorisées les <strong>dimanches</strong> et <strong>jours fériés</strong>.</p>
            </div>
            <div className="blocked-modal-footer">
              <button className="blocked-close-button" onClick={() => setBlockedDayModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup carte survol */}
      {hoveredReservation && (
        <div 
          className="reservation-popup-card"
          style={{
            position: 'fixed',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10001
          }}
        >
          <div className="popup-card-content">
            <div className="popup-card-header">
              <span className="popup-icon">👤</span>
              <span className="popup-name">
                {hoveredReservation.prenom ? `${hoveredReservation.prenom} ` : ''}
                {hoveredReservation.nom || 'Anonyme'}
              </span>
            </div>
            <div className="popup-card-body">
              {hoveredReservation.email && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">📧</span>
                  <span className="popup-info-text">{hoveredReservation.email}</span>
                </div>
              )}
              {hoveredReservation.service && (
                <div className="popup-info-line">
                  <span className="popup-info-icon">🏢</span>
                  <span className="popup-info-text">{hoveredReservation.service}</span>
                </div>
              )}
              <div className="popup-info-line">
                <span className="popup-info-icon">📅</span>
                <span className="popup-info-text">
                  {hoveredReservation.dateDebut} · {hoveredReservation.heureDebut} - {hoveredReservation.heureFin}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal succès */}
      {successModal.show && (
        <div className="success-modal-overlay" onClick={() => {
          setSuccessModal({ show: false, reservations: [], message: '' });
          if (onSuccess) onSuccess();
        }}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-header">
              <span className="success-icon">✅</span>
              <h2>{successModal.message}</h2>
            </div>
            <div className="success-modal-body">
              <p className="success-subtitle">
                📅 {successModal.reservations.length} créneau{successModal.reservations.length > 1 ? 'x' : ''} confirmé{successModal.reservations.length > 1 ? 's' : ''}
              </p>
              <div className="reservations-list">
                {successModal.reservations.map((res, index) => (
                  <div key={index} className="reservation-item-success">
                    <span className="room-badge">{res.salle}</span>
                    <span className="time-info">
                      {res.dateDebut} · {res.heureDebut} - {res.heureFin}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ical-download-section">
                <p className="ical-info">
                  📲 Ajoutez ces réservations à votre agenda Outlook, Google Calendar ou Apple Calendar
                </p>
                <button 
                  className="download-ical-button"
                  onClick={() => {
                    const filename = icalService.generateFilename(successModal.reservations);
                    icalService.generateAndDownload(successModal.reservations, filename);
                  }}
                >
                  <span className="download-icon">📥</span>
                  Télécharger le fichier .ics
                </button>
                <p className="ical-hint">
                  Le fichier .ics s'ouvrira automatiquement dans votre application de calendrier
                </p>
              </div>
            </div>
            <div className="success-modal-footer">
              <button 
                className="close-modal-button"
                onClick={() => {
                  setSuccessModal({ show: false, reservations: [], message: '' });
                  if (onSuccess) onSuccess();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
	  
	{/* Modal mot de passe admin */}
      {/* Modal mot de passe admin - IDENTIQUE PAR DATE */}
      {adminPasswordModal.show && (
        <div className="modal-overlay" onClick={() => setAdminPasswordModal({ show: false, password: '' })}>
          <div className="modal-content admin-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔒 Accès Salle Réservée</h2>
            </div>
            
            <div className="modal-body">
              <p className="admin-warning">
                La salle <strong>{selectedRoom}</strong> est réservée aux administrateurs.
              </p>
              <p className="admin-instruction">
                Veuillez saisir le mot de passe administrateur pour accéder à cette salle.
              </p>
              
              <div className="password-input-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={adminPasswordModal.password}
                  onChange={(e) => setAdminPasswordModal({ ...adminPasswordModal, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminPasswordSubmit()}
                  placeholder="Entrez le mot de passe"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => setAdminPasswordModal({ show: false, password: '' })}
              >
                Annuler
              </button>
              <button 
                className="submit-button"
                onClick={handleAdminPasswordSubmit}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SingleRoomGrid;
