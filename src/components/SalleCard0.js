// src/components/SalleCard.js
import React from 'react';
import './SalleCard.css';
import { getSalleData } from '../data/sallesData';

function SalleCard({ salle }) {
  const salleData = getSalleData(salle);
  
  if (!salleData) {
    return null;
  }

  const { nom, capacite, photo, equipements, dispositions } = salleData;

  return (
    <div className="salle-card">
      <div className="salle-card-image">
        <img 
          src={photo} 
          alt={nom}
          onError={(e) => {
            // Si l'image ne charge pas, afficher un placeholder
            e.target.src = 'https://via.placeholder.com/400x300/e3f2fd/1976d2?text=' + encodeURIComponent(nom);
          }}
        />
      </div>
      
      <div className="salle-card-content">
        <h3 className="salle-card-title">{nom}</h3>
        
        <div className="salle-card-info">
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span className="info-label">Capacité</span>
            <span className="info-value">{capacite} personnes</span>
          </div>

          {equipements && equipements.length > 0 && (
            <div className="info-item equipements">
              <span className="info-icon">🔧</span>
              <span className="info-label">Équipements</span>
              <div className="equipements-list">
                {equipements.map((equip, index) => (
                  <span key={index} className="equipement-tag">
                    {equip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dispositions && dispositions.length > 0 && (
            <div className="info-item dispositions">
              <span className="info-icon">📐</span>
              <span className="info-label">Dispositions possibles</span>
              <div className="dispositions-list">
                {dispositions.map((dispo, index) => (
                  <span key={index} className="disposition-tag">
                    {dispo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalleCard;
