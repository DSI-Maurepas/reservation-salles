// src/services/icalService.js
// CORRECTION : Format .ics optimisé pour ajout au calendrier par défaut (pas de nouveau calendrier)

const icalService = {
  /**
   * Formate une date JS en chaîne iCal avec fuseau horaire
   * Format : TZID=Europe/Paris:YYYYMMDDTHHmm00
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
   * OPTIMISÉ : Ajout au calendrier par défaut (pas de création de nouveau calendrier)
   */
  generateICSContent: (reservations) => {
    // ✅ CORRECTION : Utiliser METHOD:REQUEST pour forcer l'ajout au calendrier par défaut
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Maurepas//Reservation Salles//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST', // ✅ REQUEST au lieu de PUBLISH pour ajout au calendrier
      'X-WR-CALNAME:Réservations Mairie Maurepas',
      'X-WR-TIMEZONE:Europe/Paris',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Paris',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];

    reservations.forEach((res, index) => {
      // Nettoyage du nom de la salle (retirer la capacité si présente pour le titre)
      const salleNom = res.salle.split(' - ')[0];
      
      const startDateTime = icalService.formatDateToIcalString(res.dateDebut, res.heureDebut);
      const endDateTime = icalService.formatDateToIcalString(res.dateFin || res.dateDebut, res.heureFin);
      
      // Création d'un UID unique pour l'événement
      const uid = `res-${res.id || index}-${Date.now()}@maurepas.fr`;
      
      // Timestamp actuel au format iCal
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      // Description détaillée (échapper les retours à la ligne pour compatibilité)
      let description = `Réservation de salle : ${res.salle}\\n`;
      description += `Service : ${res.service}\\n`;
      description += `Objet : ${res.objet}\\n`;
      if (res.description) description += `Note : ${res.description}\\n`;
      if (res.agencement) description += `Disposition : ${res.agencement}\\n`;
      if (res.nbPersonnes) description += `Nombre de personnes : ${res.nbPersonnes}\\n`;
      description += `\\nAgent : ${res.prenom || ''} ${res.nom || ''}`;
      if (res.email) description += `\\nEmail : ${res.email}`;
      if (res.telephone) description += `\\nTéléphone : ${res.telephone}`;

      // ✅ AMÉLIORATION : Ajout de propriétés pour forcer l'intégration au calendrier
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=Europe/Paris:${startDateTime}`, // ✅ Avec fuseau horaire
        `DTEND;TZID=Europe/Paris:${endDateTime}`,     // ✅ Avec fuseau horaire
        `SUMMARY:📅 Réservation ${salleNom}`, // ✅ Emoji pour visibilité
        `DESCRIPTION:${description}`,
        `LOCATION:Mairie de Maurepas - ${res.salle}`,
        'STATUS:CONFIRMED', // ✅ Événement confirmé
        'CLASS:PUBLIC',     // ✅ Événement public
        'TRANSP:OPAQUE',    // ✅ Bloque le temps (occupé)
        'SEQUENCE:0',
        `ORGANIZER;CN="Mairie de Maurepas":MAILTO:reservation@maurepas.fr`,
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
      
      // ✅ AMÉLIORATION : Nom de fichier plus explicite
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const firstName = reservations[0]?.prenom || '';
      const lastName = reservations[0]?.nom || '';
      const nomFichier = firstName && lastName 
        ? `reservation_${firstName}_${lastName}_${dateStr}.ics`
        : `reservations_maurepas_${dateStr}.ics`;
      
      link.download = nomFichier;
      
      // Déclenchement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      
      console.log('✅ Fichier .ics généré:', nomFichier);
    } catch (error) {
      console.error("Erreur lors de la génération du fichier ICS :", error);
      alert("Une erreur est survenue lors de la création du fichier calendrier.");
    }
  }
};

export default icalService;
