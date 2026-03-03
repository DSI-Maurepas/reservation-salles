// src/services/emailService.js
// Les emails sont désormais envoyés directement par le backend (SMTP O365).
// Ce fichier est conservé pour éviter de modifier tous les composants,
// mais toutes les méthodes sont des no-op.

class EmailService {
  // Appelé dans App.js au démarrage
  init() {
    // No-op : plus de EmailJS
  }

  // Ces méthodes sont appelées dans les composants après addReservation()
  // mais le backend a déjà envoyé l'email au moment de la création.
  async sendConfirmation(_reservation) {
    return { success: true };
  }

  async sendCancellation(_reservation, _raison, _adminEmail) {
    return { success: true };
  }

  // Conservé pour compatibilité (plus utilisé)
  getBlasonUrl() {
    return `${window.location.origin}/images/Blason_ville_MAUREPAS.png`;
  }
}

export default new EmailService();
