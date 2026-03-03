// src/components/LoginPage.js
import React, { useState } from 'react';
import apiService from '../services/apiService';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiService.login(username.trim(), password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Identifiant ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f6aba 0%, #1e3a5f 100%)',
    }}>
      {/* Carte */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '2.5rem 2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,.25)', width: '100%', maxWidth: '380px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img
          src="/images/Blason_ville_MAUREPAS.png"
          alt="Blason Maurepas"
          style={{ height: '70px', marginBottom: '1rem' }}
        />
        <h1 style={{ margin: '0 0 .25rem', fontSize: '1.3rem', color: '#1e293b' }}>
          Portail de Réservations
        </h1>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '.9rem' }}>
          Mairie de MAUREPAS
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <label style={{ fontSize: '.85rem', color: '#475569', display: 'block', marginBottom: '.3rem' }}>
              Identifiant Windows
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Login"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px',
                border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box',
                outline: 'none',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '.85rem', color: '#475569', display: 'block', marginBottom: '.3rem' }}>
              Mot de passe Windows
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px',
                border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
              borderRadius: '6px', padding: '10px 12px', marginBottom: '1rem',
              fontSize: '.9rem',
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#0f6aba',
              color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem',
              fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

      </div>

      <p style={{ color: 'rgba(255,255,255,.5)', marginTop: '1.5rem', fontSize: '.8rem' }}>
        © 2026 Mairie de MAUREPAS — Usage interne uniquement
      </p>
    </div>
  );
}

export default LoginPage;
