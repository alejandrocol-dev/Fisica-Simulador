import React from 'react';

export default function FaradayPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', padding: 0, margin: 0, overflow: 'hidden', backgroundColor: '#0a0a1a' }}>
      <iframe 
        src={`${import.meta.env.BASE_URL}faraday/index.html`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Simulador de Ley de Faraday"
      />
    </div>
  );
}
