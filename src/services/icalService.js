// src/services/icalService.js
// Service pour générer des fichiers iCalendar (.ics) pour Outlook/Google Calendar

class ICalService {
  /**
   * Génère un fichier .ics à partir d'une ou plusieurs réservations
   * @param {Array|Object} reservations - Une réservation ou un tableau de réservations
   * @param {string} filename - Nom du fichier à télécharger (optionnel)
   */
  generateAndDownload(reservations, filename = null) {
    // Convertir en tableau si c'est un seul objet
    const reservationArray = Array.isArray(reservations) ? reservations : [reservations];
    
    // Générer le contenu iCal
    const icalContent = this.generateICalContent(reservationArray);
    
    // Télécharger le fichier
    this.downloadICalFile(icalContent, filename);
  }

  /**
   * Génère le contenu iCalendar
   * @param {Array} reservations - Tableau de réservations
   * @returns {string} - Contenu au format iCalendar
   */
  generateICalContent(reservations) {
    let icalContent = 'BEGIN:VCALENDAR\n';
    icalContent += 'VERSION:2.0\n';
    icalContent += 'PRODID:-//Mairie//Réservation Salles//FR\n';
    icalContent += 'CALSCALE:GREGORIAN\n';
    icalContent += 'METHOD:PUBLISH\n';
    icalContent += 'X-WR-CALNAME:Réservations Salles Mairie\n';
    icalContent += 'X-WR-TIMEZONE:Europe/Paris\n';

    reservations.forEach(res => {
      // Format des dates : YYYYMMDDTHHMMSS
      const startDateTime = `${res.dateDebut.replace(/-/g, '')}T${res.heureDebut.replace(':', '')}00`;
      const endDateTime = `${(res.dateFin || res.dateDebut).replace(/-/g, '')}T${res.heureFin.replace(':', '')}00`;
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icalContent += 'BEGIN:VEVENT\n';
      icalContent += `UID:${res.id || `RES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`}@mairie.fr\n`;
      icalContent += `DTSTAMP:${now}\n`;
      icalContent += `DTSTART:${startDateTime}\n`;
      icalContent += `DTEND:${endDateTime}\n`;
      icalContent += `SUMMARY:Réservation ${res.salle}\n`;
      icalContent += `DESCRIPTION:Objet: ${res.objet}\\nService: ${res.service}\\nAgent: ${res.prenom} ${res.nom}\n`;
      icalContent += `LOCATION:${res.salle} - Mairie\n`;
      icalContent += 'STATUS:CONFIRMED\n';
      icalContent += 'TRANSP:OPAQUE\n';
      
      // Ajouter un rappel 15 minutes avant
      icalContent += 'BEGIN:VALARM\n';
      icalContent += 'TRIGGER:-PT15M\n';
      icalContent += 'ACTION:DISPLAY\n';
      icalContent += `DESCRIPTION:Rappel: Réservation ${res.salle}\n`;
      icalContent += 'END:VALARM\n';
      
      icalContent += 'END:VEVENT\n';
    });

    icalContent += 'END:VCALENDAR';
    
    return icalContent;
  }

  /**
   * Télécharge un fichier iCalendar
   * @param {string} icalContent - Contenu iCalendar
   * @param {string} filename - Nom du fichier (optionnel)
   */
  downloadICalFile(icalContent, filename = null) {
    const defaultFilename = `reservation_${new Date().toISOString().split('T')[0]}.ics`;
    const finalFilename = filename || defaultFilename;
    
    // Créer un blob avec le bon type MIME
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    // Créer un lien temporaire et simuler un clic
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Génère un nom de fichier descriptif basé sur les réservations
   * @param {Array} reservations - Tableau de réservations
   * @returns {string} - Nom de fichier
   */
  generateFilename(reservations) {
    if (reservations.length === 1) {
      const res = reservations[0];
      return `reservation_${res.salle.replace(/\s+/g, '_')}_${res.dateDebut}.ics`;
    } else {
      const firstDate = reservations[0].dateDebut;
      return `reservations_${reservations.length}_creneaux_${firstDate}.ics`;
    }
  }
}

// Export une instance unique
const icalService = new ICalService();
export default icalService;
