// src/services/apiService.js
// Remplacement de apiService.js
// Conserve exactement les mêmes noms de méthodes pour minimiser les modifs front.
// Toutes les données transitent maintenant par /api/* (backend Node.js)

const BASE = '/api';

// ============================================================
// GESTION DU TOKEN JWT
// ============================================================
function getToken() {
  return localStorage.getItem('resa_token');
}

function saveToken(token) {
  localStorage.setItem('resa_token', token);
}

function clearToken() {
  localStorage.removeItem('resa_token');
  localStorage.removeItem('resa_user');
}

function saveUser(user) {
  localStorage.setItem('resa_user', JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('resa_user') || 'null');
  } catch { return null; }
}

// Helper fetch authentifié
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expiré → nettoyer et recharger pour revenir au login
    clearToken();
    window.location.reload();
    return null;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  return res.json();
}

// ============================================================
// CLASSE APISERVICE (interface identique à GoogleSheetsService)
// ============================================================
class ApiService {

  // --- Compatibilité ancien code (no-op dans la nouvelle architecture) ---
  async initialize() {
    // Vérifie que le token stocké est encore valide
    if (!getToken()) return;
    try {
      const data = await apiFetch('/auth/me');
      if (data?.user) saveUser(data.user);
    } catch {
      clearToken();
    }
  }

  async requestAccessToken() {
    // No-op : l'auth est désormais gérée par LoginPage (LDAP)
    return Promise.resolve();
  }

  isAuthenticated() {
    return !!getToken();
  }

  // --- Authentification LDAP ---
  async login(username, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data?.token) {
      saveToken(data.token);
      saveUser(data.user);
      // Synchronise les sessionStorage utilisés par les composants existants
      this._applyRolesToSession(data.user.roles || []);
    }
    return data;
  }

  logout() {
    clearToken();
    // Nettoyer les sessionStorage
    ['isAdminAuthenticated', 'isAdminAutoAuthenticated',
     'isAdminIAAuthenticated', 'isSuperAdminAuthenticated'].forEach(k =>
      sessionStorage.removeItem(k)
    );
  }

  getCurrentUser() {
    return getUser();
  }

  // Applique les rôles AD dans sessionStorage pour compatibilité composants existants
  _applyRolesToSession(roles) {
    if (roles.includes('admin') || roles.includes('superadmin')) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
    }
    if (roles.includes('adminAuto') || roles.includes('superadmin')) {
      sessionStorage.setItem('isAdminAutoAuthenticated', 'true');
    }
    if (roles.includes('adminIA') || roles.includes('superadmin')) {
      sessionStorage.setItem('isAdminIAAuthenticated', 'true');
    }
    if (roles.includes('superadmin')) {
      sessionStorage.setItem('isSuperAdminAuthenticated', 'true');
    }
  }

  // --- RÉSERVATIONS SALLES ---
  async getAllReservations(forceRefresh = false) {
    // Le backend ne gère pas de cache côté serveur — on fait un GET simple
    const data = await apiFetch('/reservations');
    return data || [];
  }

  async addReservation(reservation) {
    const data = await apiFetch('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservation),
    });
    // Retourne le même format qu'avant : { success: true, id: '...' }
    return { success: true, id: data?.ids?.[0] };
  }

  async deleteReservation(reservationId, motif = '', adminEmail = '') {
    await apiFetch(`/reservations/${reservationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ motif, adminEmail }),
    });
    return { success: true };
  }

  async updateReservation(id, reservation) {
    await apiFetch(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reservation),
    });
    return { success: true };
  }

  // --- RÉSERVATIONS IA ---
  async getAllIAReservations(forceRefresh = false) {
    const data = await apiFetch('/ia-reservations');
    return data || [];
  }

  async addIAReservation(reservation) {
    const data = await apiFetch('/ia-reservations', {
      method: 'POST',
      body: JSON.stringify(reservation),
    });
    return { success: true, id: data?.ids?.[0] };
  }

  async addIAReservationsBulk(reservations) {
    const data = await apiFetch('/ia-reservations/bulk', {
      method: 'POST',
      body: JSON.stringify({ reservations }),
    });
    return { success: true, ids: data?.ids || [] };
  }

  async deleteIAReservation(id, motif = '', adminEmail = '') {
    await apiFetch(`/ia-reservations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ motif, adminEmail }),
    });
    return { success: true };
  }

  // --- SALLES ---
  async getRooms(type) {
    const q = type ? `?type=${type}` : '';
    return apiFetch(`/rooms${q}`);
  }

  // ============================================================
  // UTILITAIRES (identiques à l'ancienne version pour compatibilité)
  // ============================================================
  formatTime(timeValue) {
    const hours   = Math.floor(timeValue);
    const minutes = Math.round((timeValue - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  timeToFloat(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + (m / 60);
  }

  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default new ApiService();
