import React from 'react';

const PlayerLoading = () => (
  <div style={{
    width: '100vw', height: '100vh', background: '#000',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, color: '#00c8ff', fontFamily: 'system-ui',
  }}>
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(0,200,255,0.2)',
      borderTopColor: '#00c8ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <div style={{ fontSize: 14, opacity: 0.7 }}>Getting ready...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default PlayerLoading;
