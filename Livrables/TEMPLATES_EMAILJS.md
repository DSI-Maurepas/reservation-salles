# 📧 MODÈLES D'EMAILS EMAILJS

Copiez-collez ces modèles dans EmailJS lors de la création de vos templates.

---

## 📬 TEMPLATE 1 : Confirmation de réservation

### Nom du template
```
Confirmation Réservation Salle
```

### Subject (Objet)
```
✅ Confirmation de réservation - {{salle}}
```

### Content (Corps du message)
```
Bonjour {{to_name}},

Votre réservation a bien été enregistrée avec succès.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DÉTAILS DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️  Salle : {{salle}}
📅  Date : {{date_debut}}
🕐  Horaire : {{heure_debut}} - {{heure_fin}}
🏢  Service : {{service}}
📝  Objet : {{objet}}

🔑  Référence : {{reservation_id}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  INFORMATIONS IMPORTANTES

• Pour modifier ou annuler cette réservation, connectez-vous à l'application de réservation
• Merci d'arriver 5 minutes avant le début de votre créneau
• Pensez à laisser la salle propre et rangée après votre utilisation
• En cas d'annulation de dernière minute, prévenez le service concerné

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour toute question, contactez :
📞 Direction des Systèmes d'Information
📧 dsi@mairie.fr

Cordialement,
Le service de gestion des salles
Mairie

---
Ceci est un message automatique, merci de ne pas y répondre.
```

### Variables nécessaires
Assurez-vous que ces variables sont bien définies :
- `{{to_email}}` - Email du destinataire
- `{{to_name}}` - Nom complet (Prénom Nom)
- `{{salle}}` - Nom de la salle
- `{{date_debut}}` - Date de début
- `{{heure_debut}}` - Heure de début
- `{{heure_fin}}` - Heure de fin
- `{{service}}` - Service demandeur
- `{{objet}}` - Objet de la réservation
- `{{reservation_id}}` - ID unique de la réservation

---

## ❌ TEMPLATE 2 : Annulation de réservation

### Nom du template
```
Annulation Réservation Salle
```

### Subject (Objet)
```
❌ Annulation de réservation - {{salle}}
```

### Content (Corps du message)
```
Bonjour {{to_name}},

Nous vous informons que votre réservation a été annulée.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ RÉSERVATION ANNULÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️  Salle : {{salle}}
📅  Date : {{date_debut}}
🕐  Horaire : {{heure_debut}} - {{heure_fin}}

📝  Raison de l'annulation :
{{raison}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  QUE FAIRE ?

Si cette annulation ne provient pas de vous :
• Contactez immédiatement le service concerné
• Une nouvelle réservation peut être effectuée via l'application

Si vous avez des questions :
📞 Direction des Systèmes d'Information
📧 dsi@mairie.fr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cordialement,
Le service évènementiel
Mairie de Maurepas

---
Ceci est un message automatique, merci de ne pas y répondre.
```

### Variables nécessaires
- `{{to_email}}` - Email du destinataire
- `{{to_name}}` - Nom complet (Prénom Nom)
- `{{salle}}` - Nom de la salle
- `{{date_debut}}` - Date de début
- `{{heure_debut}}` - Heure de début
- `{{heure_fin}}` - Heure de fin
- `{{raison}}` - Raison de l'annulation

---

## 🎨 PERSONNALISATION (Optionnel)

### Ajout du logo de la mairie

Dans EmailJS, vous pouvez ajouter une image en haut des emails :

1. Dans l'éditeur de template
2. Cliquez sur "Insert Image"
3. Uploadez le logo de votre mairie
4. Ajustez la taille (recommandé : 200px de large)

### Modification des couleurs

Vous pouvez personnaliser les couleurs dans l'éditeur EmailJS :
- Couleur principale : Bleu de la mairie
- Couleur d'accent : Rouge pour les alertes
- Fond : Gris clair pour les sections

### Ajout de liens

Vous pouvez ajouter des liens dans les templates :
```
Pour accéder à l'application : <a href="https://votre-url.github.io/reservation-salles">Cliquez ici</a>
```

---

## ✅ TEST DES TEMPLATES

Après création de chaque template :

1. Dans EmailJS, cliquez sur "Test It"
2. Remplissez les variables de test :
   ```
   to_email: j.matrat@maurepas.fr
   to_name: Joël MATRAT
   salle: Salle du Conseil
   date_debut: 15/12/2024
   heure_debut: 14:00
   heure_fin: 16:00
   service: Direction Générale
   objet: Réunion
   reservation_id: RES_123456
   raison: Test d'annulation
   ```
3. Cliquez sur "Send Test"
4. Vérifiez la réception de l'email

---

## 🔧 DÉPANNAGE TEMPLATES

### L'email n'arrive pas
✓ Vérifiez votre dossier spam
✓ Vérifiez que le service email est bien "Connected"
✓ Vérifiez votre quota EmailJS (200/mois gratuit)

### Les variables ne s'affichent pas
✓ Vérifiez l'orthographe exacte : `{{to_name}}` pas `{{toname}}`
✓ Utilisez des doubles accolades : `{{}}` pas `{}`
✓ Pas d'espaces : `{{salle}}` pas `{{ salle }}`

### Formatage bizarre
✓ Utilisez l'éditeur EmailJS pour le formatage
✓ Évitez de copier-coller depuis Word (peut ajouter du code)
✓ Préférez le mode "HTML" pour un contrôle précis

---

## 📊 EXEMPLE DE RÉSULTAT

### Email de confirmation reçu :

```
Objet : ✅ Confirmation de réservation - Salle du Conseil

Bonjour Marie Martin,

Votre réservation a bien été enregistrée avec succès.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DÉTAILS DE VOTRE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️  Salle : Salle du Conseil
📅  Date : 15/12/2024
🕐  Horaire : 14:00 - 16:00
🏢  Service : Direction Générale
📝  Objet : Réunion CODIR

🔑  Référence : RES_1733410789_abc123xyz

[...]
```

---

## 💡 CONSEILS PRO

1. **Testez immédiatement** après création
2. **Gardez les templates simples** au début
3. **Ajoutez progressivement** des éléments (logo, couleurs)
4. **Demandez un retour** aux premiers utilisateurs
5. **Ajustez** selon les besoins

---

## 🎯 CHECKLIST FINALE

Avant de valider :

- [ ] Template 1 "Confirmation" créé
- [ ] Template 2 "Annulation" créé
- [ ] Toutes les variables définies
- [ ] Test envoyé et reçu pour chaque template
- [ ] Email bien formaté et lisible
- [ ] Template IDs notés et sauvegardés
- [ ] Intégrés dans `src/config/googleSheets.js`

---

**Vos templates sont prêts à être utilisés !**

Le système enverra automatiquement :
• Un email de confirmation à chaque réservation
• Un email d'annulation en cas d'annulation
