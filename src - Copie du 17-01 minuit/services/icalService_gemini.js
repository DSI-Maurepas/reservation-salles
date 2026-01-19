// src/services/icalService.js

const icalService = {
  /**
   * Génère le contenu texte au format iCalendar (RFC 5545)
   * avec une compatibilité stricte pour iOS et Android.
   */
  generateICS: (reservation) => {
    // 1. Formatage des dates pour iCal (YYYYMMDDTHHmm00)
    const formatDate = (dateStr, timeStr) => {
      // dateStr est au format "YYYY-MM-DD", timeStr "HH:mm" ou "HHhmm"
      const cleanTime = timeStr.replace('h', ':').replace(':', '') + '00';
      const cleanDate = dateStr.replace(/-/g, '');
      return `${cleanDate}T${cleanTime}`;
    };

    // Calcul de la date de fin ( +30 min par défaut si pas précisé, ou selon créneau)
    // Ici on suppose que l'objet reservation a une heureFin, sinon on gère.
    const startDateTime = formatDate(reservation.dateDebut, reservation.heureDebut);
    const endDateTime = formatDate(reservation.dateDebut, reservation.heureFin);

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Nettoyage des textes pour éviter de casser le fichier ICS (échappement des virgules et points-virgules)
    const cleanText = (text) => text ? text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n') : '';

    // 2. Construction du contenu ligne par ligne
    // IMPORTANT : Les retours à la ligne doivent être \r\n pour la compatibilité mobile
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Maurepas//Reservation Salles//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:reservation-${Date.now()}@maurepas.fr`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Paris:${startDateTime}`,
      `DTEND;TZID=Europe/Paris:${endDateTime}`,
      `SUMMARY:Réservation Salle : ${cleanText(reservation.salle)}`,
      `DESCRIPTION:Réservé par ${cleanText(reservation.prenom)} ${cleanText(reservation.nom)}.\\nService: ${cleanText(reservation.service)}\\nObjet: ${cleanText(reservation.objet)}`,
      `LOCATION:Mairie de Maurepas`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel Réservation Salle',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return icsLines.join('\r\n');
  },

  /**
   * Déclenche le téléchargement du fichier
   * Optimisé pour forcer l'ouverture sur mobile
   */
  downloadICS: (reservation) => {
    const icsContent = icalService.generateICS(reservation);
    
    // Création du Blob avec le type MIME spécifique agenda
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    
    // Nom du fichier
    const fileName = `reservation_${reservation.dateDebut}_${reservation.salle.replace(/\s/g, '_')}.ics`;

    // Détection basique pour iOS (qui gère mal le download attribute parfois)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // Sur iOS, il vaut mieux parfois ouvrir dans un nouvel onglet pour que l'OS propose "Ajouter à l'agenda"
      const reader = new FileReader();
      reader.onload = function(e) {
        window.location.href = e.target.result;
      };
      reader.readAsDataURL(blob);
    } else {
      // Méthode standard (PC et Android récents)
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Nettoyage propre
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }, 100);
    }
  }
};

export default icalService;