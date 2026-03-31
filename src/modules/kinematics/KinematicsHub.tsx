/**
 * KinematicsHub — Unified Kinematics selector
 * Allows switching between "Tiro Parabólico (2D)" and "Movimiento Horizontal (1D)"
 */
import { useState } from 'react';
import KinematicsPage from './KinematicsPage';
import Kinematics1DPage from '../kinematics1d/Kinematics1DPage';

type KinematicsMode = '2d' | '1d';

export default function KinematicsHub() {
  const [mode, setMode] = useState<KinematicsMode>('2d');

  return (
    <div className="kin-hub-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', marginTop: '64px' }}>
      {/* Tab selector bar */}
      <div className="kin-hub-tabs">
        <button
          className={`kin-hub-tab ${mode === '2d' ? 'active' : ''}`}
          onClick={() => setMode('2d')}
        >
          <span className="kin-hub-tab-icon">🚀</span>
          <span>Tiro Parabólico</span>
          <span className="kin-hub-tab-badge">2D</span>
        </button>
        <button
          className={`kin-hub-tab ${mode === '1d' ? 'active' : ''}`}
          onClick={() => setMode('1d')}
        >
          <span className="kin-hub-tab-icon">🚙</span>
          <span>Movimiento Horizontal</span>
          <span className="kin-hub-tab-badge">1D</span>
        </button>
      </div>

      {/* Render chosen simulation */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === '2d' ? <KinematicsPage /> : <Kinematics1DPage />}
      </div>
    </div>
  );
}
