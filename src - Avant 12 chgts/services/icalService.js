// src/services/icalService.js

const icalService = {
  /**
   * Formate une date JS en chaîne iCal (YYYYMMDDTHHmm00)
   * Prend en compte le fuseau horaire local pour l'affichage correct
   */
  formatDateToIcalString: (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    // dateStr est au format YYYY-MM-DD
    // timeStr est au format HH:mm ou HH:mm:ss
    const [year, month, day] = dateStr.split('-');
    const [hour, minute] = timeStr.split(':');
    
    return `${year}${month}${day}T${hour}${minute}00`;
  },

  /**
   * Génère le contenu du fichier .ics
   */
  generateICSContent: (reservations) => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Maurepas//Reservation Salles//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH' // Indique qu'il s'agit d'événements à publier/ajouter
    ];

    reservations.forEach((res, index) => {
      // Nettoyage du nom de la salle (retirer la capacité si présente pour le titre)
      const salleNom = res.salle.split(' - ')[0];
      
      const startDateTime = icalService.formatDateToIcalString(res.dateDebut, res.heureDebut);
      const endDateTime = icalService.formatDateToIcalString(res.dateFin || res.dateDebut, res.heureFin);
      
      // Création d'un UID unique pour l'événement
      const uid = `res-${res.id || index}-${Date.now()}@maurepas.fr`;
      
      // Description détaillée
      let description = `Réservation de salle : ${res.salle}\\n`;
      description += `Service : ${res.service}\\n`;
      description += `Objet : ${res.objet}\\n`;
      if (res.description) description += `Note : ${res.description}\\n`;
      if (res.agencement) description += `Disposition : ${res.agencement}\\n`;
      if (res.nbPersonnes) description += `Nombre de personnes : ${res.nbPersonnes}\\n`;

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}`,
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `SUMMARY:Réservation ${salleNom}`,
        `DESCRIPTION:${description}`,
        `LOCATION:Mairie de Maurepas - ${res.salle}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n'); // Retour chariot standard pour iCal
  },

  /**
   * Génère le fichier et déclenche le téléchargement
   */
  generateAndDownload: (reservations) => {
    try {
      const content = icalService.generateICSContent(reservations);
      
      // Création du Blob avec encodage UTF-8 explicite
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      
      // Création du lien de téléchargement
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      // Nom du fichier : reservation_DATE.ics
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      link.download = `reservations_maurepas_${dateStr}.ics`;
      
      // Déclenchement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Erreur lors de la génération du fichier ICS :", error);
      alert("Une erreur est survenue lors de la création du fichier calendrier.");
    }
  }
};

export default icalService;