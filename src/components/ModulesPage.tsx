import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SharedBackground from './SharedBackground';
import '../landing.css';

const MODULES = [
  { id: 'kinematics', type: 'projectile', name: 'Cinemática', desc: 'Movimiento 1D y tiro parabólico 2D.', status: 'available', path: '/sim/kinematics' },
  { id: 'oscillations', type: 'spring', name: 'Oscilaciones & MAS', desc: 'Masa resorte y péndulo simple.', status: 'available', path: '/sim/oscillations' },
  { id: 'energy', type: 'thermo', name: 'Energía Mecánica', desc: 'Conservación, energía cinética y potencial.', status: 'available', path: '/sim/energy' },
  { id: 'em-field', type: 'em', name: 'Campo Magnético', desc: 'Líneas de campo, imanes y brújulas.', status: 'available', path: '/sim/magnetic-field' },
  { id: 'em-faraday', type: 'em', name: 'Ley de Faraday', desc: 'Inducción, flujo magnético y fem.', status: 'available', path: '/sim/faraday' },
  { id: 'dynamics', type: 'optics', name: 'Dinámica y Fuerzas', desc: 'Fuerzas, fricción y planos inclinados.', status: 'soon' },
  { id: 'fluid', type: 'fluid', name: 'Dinámica de Fluidos', desc: 'Bernoulli y viscosidad.', status: 'soon' },
];

export default function ModulesPage() {
  const moduleCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const icons: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void> = {
      projectile(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(124,106,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, h - 12); ctx.lineTo(w - 10, h - 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, h - 12); ctx.lineTo(10, 10); ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = '#7c6aff'; ctx.lineWidth = 2;
        for (let i = 0; i <= 40; i++) {
          const x = 10 + (i / 40) * (w - 22);
          const frac = i / 40;
          const y = (h - 12) - 38 * (4 * frac * (1 - frac));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        const bf = (Math.sin(t) + 1) / 2;
        const bx = 10 + bf * (w - 22);
        const by = (h - 12) - 38 * (4 * bf * (1 - bf));
        ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fillStyle = '#00e5ff'; ctx.fill();
      },
      spring(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        const cy2 = h / 2 + Math.sin(t * 2) * 10;
        ctx.strokeStyle = '#b06aff'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        const coils = 7, springH = cy2 - 24;
        for (let i = 0; i <= coils * 10; i++) {
          const frac = i / (coils * 10);
          const x = w / 2 + 14 * Math.sin(frac * coils * Math.PI * 2);
          const y = 8 + springH * frac;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2, cy2, 9, 0, Math.PI * 2); ctx.fillStyle = '#7c6aff'; ctx.fill();
      },
      thermo(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,160,80,0.5)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(14, 14, w - 28, h - 28);
        const pts = [{ x: 22, y: 22 }, { x: 50, y: 18 }, { x: 38, y: 45 }, { x: 18, y: 54 }, { x: 54, y: 50 }];
        pts.forEach((p, i) => {
          const px2 = p.x + Math.sin(t * 1.3 + i) * 5;
          const py2 = p.y + Math.cos(t * 1.1 + i * 0.7) * 5;
          ctx.beginPath(); ctx.arc(px2, py2, 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${30 + i * 15}, 90%, 65%)`; ctx.fill();
        });
      },
      optics(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        const mx = w / 2, my = h / 2;
        ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(mx, my, 8, 22, 0, 0, Math.PI * 2); ctx.stroke();
        [my - 14, my, my + 14].forEach((ry) => {
          ctx.strokeStyle = 'rgba(0,229,255,0.5)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(10, ry); ctx.lineTo(mx, ry); ctx.stroke();
          ctx.strokeStyle = 'rgba(160,255,200,0.6)';
          ctx.beginPath(); ctx.moveTo(mx, ry); ctx.lineTo(w - 10, my); ctx.stroke();
        });
      },
      em(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        const mx = w / 2, my = h / 2;
        ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,100,200,0.9)'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', mx, my + 1);
        const ax2 = mx + 26 * Math.cos(t), ay2 = my + 26 * Math.sin(t);
        ctx.strokeStyle = 'rgba(255,200,100,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ax2, ay2); ctx.stroke();
      },
      fluid(ctx, w, h, t) {
        ctx.clearRect(0, 0, w, h);
        for (let row = 0; row < 5; row++) {
          const baseY = 14 + row * 10;
          ctx.strokeStyle = `rgba(0,229,255, ${0.3 + row * 0.08})`; ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let x = 8; x <= w - 8; x += 2) {
            const y = baseY + 3 * Math.sin((x / 12) + t * (0.8 + row * 0.2) + row);
            if (x === 8) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    };

    let modT = 0;
    let modFrameId: number;
    function animModules() {
      moduleCanvasesRef.current.forEach((canvas, index) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const type = MODULES[index].type;
        if (icons[type]) icons[type](ctx, canvas.width, canvas.height, modT);
      });
      modT += 0.04;
      modFrameId = requestAnimationFrame(animModules);
    }
    animModules();
    return () => cancelAnimationFrame(modFrameId);
  }, []);

  return (
    <>
      <SharedBackground />
      {/* Reusing some crystals from landing for visual flavor */}
      <div className="crystal cr1" style={{ opacity: 0.35 }}></div>
      <div className="crystal cr4" style={{ opacity: 0.35 }}></div>
      <div className="crystal cr7" style={{ opacity: 0.25 }}></div>
      <div className="crystal cr8" style={{ opacity: 0.25 }}></div>

      <div className="modules" style={{ paddingTop: '120px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="section-label">Módulos Disponibles</div>
        
        <div className="modules-grid">
          {MODULES.map((mod, idx) => (
            <Link 
              key={mod.id} 
              to={mod.path || '#'} 
              className={`mod-card ${mod.status === 'soon' ? 'disabled' : ''}`}
              onClick={(e) => mod.status === 'soon' && e.preventDefault()}
            >
              <div className="mod-icon">
                <canvas 
                  ref={el => { moduleCanvasesRef.current[idx] = el; }}
                  width="68" height="68"
                ></canvas>
              </div>
              <div className="mod-name">{mod.name}</div>
              <div className={`mod-badge ${mod.status === 'available' ? 'badge-ok' : 'badge-soon'}`}>
                <span className="dot"></span>
                {mod.status === 'available' ? 'Disponible' : 'Próximamente'}
              </div>
              <div className="mod-desc">{mod.desc}</div>
            </Link>
          ))}
        </div>

        <div className="scroll-arrow">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </div>

        <div className="modules-footer-info" style={{ 
          margin: '180px auto 50px', 
          textAlign: 'center', 
          maxWidth: '950px', 
          padding: '60px 50px',
          background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.05) 0%, rgba(0, 206, 201, 0.02) 100%)',
          borderRadius: '30px',
          border: '1px solid rgba(108, 92, 231, 0.3)',
          borderTop: '2px solid rgba(0, 206, 201, 0.6)',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 20px rgba(108, 92, 231, 0.1)',
          animation: 'fadeUp 1.2s ease both',
          animationDelay: '0.6s',
          position: 'relative'
        }}>
          <div style={{ 
            fontFamily: 'Space Mono, monospace', 
            fontSize: '12px', 
            color: 'var(--accent2)', 
            letterSpacing: '5px', 
            textTransform: 'uppercase',
            marginBottom: '22px'
          }}>
            Nota del Desarrollador
          </div>
          <p style={{ 
            fontFamily: 'Outfit, sans-serif', 
            fontSize: '18px', 
            color: 'rgba(221, 230, 255, 0.7)', 
            lineHeight: '1.8',
            fontWeight: 400,
            letterSpacing: '0.4px',
            margin: 0
          }}>
            He creado esta web con el propósito de compartir algunas de las simulaciones experimentales que hice y que también puedan usarse. 
            Son experimentos, tienen como fin el entretenimiento y la educación.
          </p>
          <div style={{ 
            marginTop: '25px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent1))' }}></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent1)', boxShadow: '0 0 10px var(--accent1)' }}></span>
            <span style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, var(--accent1), transparent)' }}></span>
          </div>
        </div>
      </div>
    </>
  );
}
