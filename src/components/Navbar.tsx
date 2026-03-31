/**
 * PhysLab Pro — Navigation Bar
 */
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  if (location.pathname.startsWith('/sim/')) {
    return (
      <Link 
        to="/modules" 
        className="nav-cta" 
        style={{ 
          position: 'fixed',
          top: '15px',
          right: '15px',
          zIndex: 1000,
          background: 'rgba(10, 20, 40, 0.7)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Módulos
      </Link>
    );
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        <svg className="nav-logo-icon" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="4" fill="#00cec9"/>
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="url(#ng1)" strokeWidth="1.5" fill="none"/>
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="url(#ng2)" strokeWidth="1.5" fill="none" transform="rotate(60 16 16)"/>
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="url(#ng3)" strokeWidth="1.5" fill="none" transform="rotate(-60 16 16)"/>
          <defs>
            <linearGradient id="ng1" x1="2" y1="16" x2="30" y2="16"><stop stopColor="#6c5ce7"/><stop offset="1" stopColor="#00cec9"/></linearGradient>
            <linearGradient id="ng2" x1="2" y1="16" x2="30" y2="16"><stop stopColor="#fd79a8"/><stop offset="1" stopColor="#6c5ce7"/></linearGradient>
            <linearGradient id="ng3" x1="2" y1="16" x2="30" y2="16"><stop stopColor="#00cec9"/><stop offset="1" stopColor="#fdcb6e"/></linearGradient>
          </defs>
        </svg>
        <div>
          <span className="nav-logo-text">PhysLab</span>
          <span className="nav-logo-sub">SIMULADOR DE FÍSICA</span>
        </div>
      </Link>
    </nav>
  );
}
