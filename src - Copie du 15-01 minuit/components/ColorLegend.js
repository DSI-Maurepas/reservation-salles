// src/components/ColorLegend.js
// Composant de légende des couleurs d'objets avec effet de survol
import React, { useState } from 'react';
import { COULEURS_OBJETS } from '../config/googleSheets';
import './ColorLegend.css';

function ColorLegend({ onHoverColor }) {
  const [hoveredColor, setHoveredColor] = useState(null);

  const handleMouseEnter = (objet) => {
    setHoveredColor(objet);
    if (onHoverColor) {
      onHoverColor(objet);
    }
  };

  const handleMouseLeave = () => {
    setHoveredColor(null);
    if (onHoverColor) {
      onHoverColor(null);
    }
  };

  return (
    <div className="color-legend-container">
      {/* Message survol salles - EN HAUT */}
      <div className="legend-hover-tip">
        <span className="hover-arrow">←</span>
        <span className="hover-text">Cliquez sur le nom d'une salle pour en connaître ses propriétés</span>
      </div>

      <div className="legend-header">
        <div className="legend-icon">💡</div>
        <h3>Fiche d'information du créneau réservé</h3>
        <p className="legend-subtitle">Cliquez sur 1 créneau réservé pour ouvrir sa fiche d'information</p>
		<p className="legend-subtitle">Cliquez sur sa fiche pour la refermer</p>
      </div>

      <div className="legend-items">
        {Object.entries(COULEURS_OBJETS)
          .sort(([objetA], [objetB]) => objetA.localeCompare(objetB)) // Tri alphabétique
          .map(([objet, couleur]) => (
          <div
            key={objet}
            className={`legend-item ${hoveredColor === objet ? 'hovered' : ''}`}
            onMouseEnter={() => handleMouseEnter(objet)}
            onMouseLeave={handleMouseLeave}
          >
            <div 
              className="legend-color-box"
              style={{ backgroundColor: couleur }}
            />
            <span className="legend-text">{objet}</span>
            <div className="legend-glow" style={{ backgroundColor: couleur }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColorLegend;
