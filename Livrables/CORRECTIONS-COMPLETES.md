# 🎯 CORRECTIONS COMPLÈTES - 31 DÉCEMBRE 2025

## ✅ CE QUI FONCTIONNE DÉJÀ
1. ✅ Couleurs objets sur ReservationGrid (par date)
2. ✅ Capacités 100 et 30 personnes
3. ✅ Import COULEURS_OBJETS dans SingleRoomGrid

---

## 🔧 CORRECTIONS À APPLIQUER

### 1. ReservationGrid.css - Ajouter à la fin du fichier

```css
/* === CORRECTIONS 31/12/2025 === */

/* Pause déjeuner - GRIS HACHURÉ DISCRET */
.time-slot.lunch-break:not(.reserved) {
  background: repeating-linear-gradient(
    45deg,
    #f5f5f5,
    #f5f5f5 8px,
    #e8e8e8 8px,
    #e8e8e8 16px
  ) !important;
  color: #757575;
  font-weight: 500;
  position: relative;
}

.time-slot.lunch-break:not(.reserved)::after {
  content: '🍽️';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.65rem;
  opacity: 0.4;
}

/* Salles admin + lunch = HACHURES ROUGES */
.time-slot.admin-only-locked.lunch-break {
  background: repeating-linear-gradient(
    45deg,
    #fee2e2,
    #fee2e2 8px,
    #fecaca 8px,
    #fecaca 16px
  ) !important;
}

/* Cadenas discret salles admin */
.time-slot.admin-only-locked::after {
  content: '🔒';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.7rem;
  opacity: 0.6;
}

/* FORCER colonnes égales (fix CCAS) */
.reservation-grid {
  grid-template-columns: 60px repeat(9, 1fr) !important;
}
```

### 2. SingleRoomGrid.js - Ajouter ces imports et fonctions

```javascript
// Ajouter aux imports (ligne 5)
import { SALLES_ADMIN_ONLY, ADMINISTRATEURS } from '../config/googleSheets';

// Ajouter dans le component (après les states ligne 40)
const [adminPasswordModal, setAdminPasswordModal] = useState({ show: false, password: '' });
const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

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
```

### 3. SingleRoomGrid.js - Modifier handleMouseDown (ligne 137)

```javascript
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
  // ... reste du code
};
```

### 4. SingleRoomGrid.js - Modifier le rendu des cellules (ligne 385)

```javascript
// REMPLACER le <td> par :
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
  // ... reste
>
</td>
```

### 5. SingleRoomGrid.js - Ajouter modal mot de passe (avant la fermeture finale)

```javascript
{/* Modal mot de passe admin */}
{adminPasswordModal.show && (
  <div className="blocked-modal-overlay" onClick={() => setAdminPasswordModal({ show: false, password: '' })}>
    <div className="blocked-modal" onClick={(e) => e.stopPropagation()}>
      <div className="blocked-modal-header">
        <span className="blocked-icon">🔒</span>
        <h2>Salle réservée aux administrateurs</h2>
      </div>
      <div className="blocked-modal-body">
        <p>Cette salle nécessite un mot de passe administrateur.</p>
        <input
          type="password"
          value={adminPasswordModal.password}
          onChange={(e) => setAdminPasswordModal({ ...adminPasswordModal, password: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleAdminPasswordSubmit()}
          placeholder="Mot de passe"
          style={{
            width: '100%',
            padding: '0.8rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            marginTop: '1rem'
          }}
          autoFocus
        />
      </div>
      <div className="blocked-modal-footer">
        <button className="blocked-close-button" onClick={() => setAdminPasswordModal({ show: false, password: '' })}>
          Annuler
        </button>
        <button 
          className="blocked-close-button" 
          style={{ background: '#2196f3', color: 'white', marginLeft: '1rem' }}
          onClick={handleAdminPasswordSubmit}
        >
          Valider
        </button>
      </div>
    </div>
  </div>
)}
```

### 6. SingleRoomGrid.css - Ajouter à la fin

```css
/* === CORRECTIONS 31/12/2025 === */

/* Pause déjeuner + admin */
.time-slot.lunch-break:not(.occupied) {
  background: repeating-linear-gradient(
    45deg,
    #f5f5f5,
    #f5f5f5 8px,
    #e8e8e8 8px,
    #e8e8e8 16px
  ) !important;
  color: #757575;
  position: relative;
}

.time-slot.lunch-break:not(.occupied)::after {
  content: '🍽️';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.65rem;
  opacity: 0.4;
}

.time-slot.admin-only-locked.lunch-break {
  background: repeating-linear-gradient(
    45deg,
    #fee2e2,
    #fee2e2 8px,
    #fecaca 8px,
    #fecaca 16px
  ) !important;
}

.time-slot.admin-only-locked {
  background: repeating-linear-gradient(
    45deg,
    #fee2e2,
    #fee2e2 8px,
    #fecaca 8px,
    #fecaca 16px
  );
  cursor: not-allowed;
  position: relative;
}

.time-slot.admin-only-locked::after {
  content: '🔒';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.7rem;
  opacity: 0.6;
}

/* Prénom pas trop long */
.form-row input[placeholder="Prénom"] {
  max-width: 100%;
  overflow: hidden;
}
```

### 7. SalleCard.css - Masquer titre + capacité

```css
/* Masquer titre et capacité quand formulaire affiché */
.room-sidebar:has(.room-form-container) .salle-card-title,
.room-sidebar:has(.room-form-container) .info-item:has(.info-value) {
  display: none;
}
```

---

## 📦 RÉSUMÉ - FICHIERS À MODIFIER

1. ✅ googleSheets.js → Déjà fait (100/30)
2. 🔧 ReservationGrid.css → Ajouter CSS ci-dessus
3. 🔧 SingleRoomGrid.js → Ajouter code ci-dessus  
4. 🔧 SingleRoomGrid.css → Ajouter CSS ci-dessus
5. 🔧 SalleCard.css → Ajouter CSS ci-dessus

**TOUT EST DOCUMENTÉ - APPLIQUEZ CES CORRECTIONS !**
