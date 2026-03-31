import React from 'react';

export default function MagneticFieldPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', padding: 0, margin: 0, overflow: 'hidden', backgroundColor: '#0a0a1a' }}>
      <iframe 
        src={`${import.meta.env.BASE_URL}magnetico/index.html`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Simulador de Campo Magnético"
      />
    </div>
  );
}
