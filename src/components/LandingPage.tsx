import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SharedBackground from './SharedBackground';
import '../landing.css';

export default function LandingPage() {
  const atomCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ═══════════════════════════════════════
    // ATOM CANVAS — Full 3D rotating atom with electrons
    // ═══════════════════════════════════════
    const canvas = atomCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const DPR = window.devicePixelRatio || 1;
    const SIZE = 380;
    canvas.width = SIZE * DPR;
    canvas.height = 320 * DPR;
    ctx.scale(DPR, DPR);

    const CX = SIZE / 2, CY = 320 / 2;
    const TAU = Math.PI * 2;

    const orbits = [
      { rx: 130, ry: 40, tiltX: 0.4, tiltZ: 0, color: '#6c5ce7', electronColor: '#fdcb6e', electronR: 7, speed: 0.018, phase: 0 },
      { rx: 120, ry: 42, tiltX: 0.4, tiltZ: 1.05, color: '#00cec9', electronColor: '#fd79a8', electronR: 6.5, speed: 0.014, phase: 2.1 },
      { rx: 118, ry: 44, tiltX: 0.4, tiltZ: 2.09, color: '#fd79a8', electronColor: '#55efc4', electronR: 6, speed: 0.011, phase: 4.2 },
    ];

    const nucleusParticles: any[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      const dist = 4 + Math.random() * 10;
      nucleusParticles.push({
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        r: 2.5 + Math.random() * 3,
        color: ['#6c5ce7','#00cec9','#fd79a8','#fdcb6e'][i % 4],
        speed: 0.04 + Math.random() * 0.05,
        phase: Math.random() * TAU
      });
    }

    let globalAngle = 0;

    function project3D(angle: number, orb: any, globalRot: number) {
      const a = angle + globalRot * 0.3;
      const lx = orb.rx * Math.cos(a);
      const ly = orb.ry * Math.sin(a);
      const tz = orb.tiltZ;
      const rx = lx * Math.cos(tz) - ly * Math.sin(tz);
      const ry = lx * Math.sin(tz) + ly * Math.cos(tz);
      const tx = orb.tiltX;
      const finalY = ry * Math.cos(tx);
      const z = ry * Math.sin(tx);
      const persp = 600 / (600 + z * 0.4);
      return { x: CX + rx * persp, y: CY + finalY * persp, z: z, scale: persp };
    }

    function drawOrbitEllipse(orb: any, globalRot: number, alpha: number) {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = orb.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const angle = (i / 120) * TAU;
        const p = project3D(angle, orb, globalRot);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function colorWithAlpha(hex: string, alpha: number) {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    let t = 0;
    let atomFrameId: number;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, SIZE, 320);
      globalAngle = t * 0.006;
      const elements: any[] = [];

      orbits.forEach((orb, i) => {
        elements.push({ type: 'orbit-back', orb, z: -999 + i });
        elements.push({ type: 'orbit-front', orb, z: 999 - i });
      });

      elements.push({ type: 'nucleus', z: 0 });

      orbits.forEach((orb) => {
        const angle = t * orb.speed + orb.phase;
        const p = project3D(angle, orb, globalAngle);
        elements.push({ type: 'electron', orb, p, z: p.z });
      });

      elements.sort((a, b) => a.z - b.z);

      elements.forEach(el => {
        if (el.type === 'orbit-back') {
          drawOrbitEllipse(el.orb, globalAngle, 0.15);
        } else if (el.type === 'orbit-front') {
          drawOrbitEllipse(el.orb, globalAngle, 0.38);
        } else if (el.type === 'nucleus') {
          const pulse = 1 + 0.08 * Math.sin(t * 0.05);
          const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 35 * pulse);
          cg.addColorStop(0, 'rgba(108,92,231,0.5)');
          cg.addColorStop(0.4, 'rgba(0,206,201,0.2)');
          cg.addColorStop(1, 'rgba(108,92,231,0)');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(CX, CY, 35 * pulse, 0, TAU);
          ctx.fill();

          const sg = ctx.createRadialGradient(CX - 4, CY - 4, 0, CX, CY, 14);
          sg.addColorStop(0, '#b2beff');
          sg.addColorStop(0.5, '#6c5ce7');
          sg.addColorStop(1, '#2d1f8a');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(CX, CY, 14, 0, TAU);
          ctx.fill();

          nucleusParticles.forEach(np => {
            const nAngle = t * np.speed + np.phase;
            const nx = CX + np.ox * Math.cos(nAngle) - np.oy * Math.sin(nAngle) * 0.5;
            const ny = CY + np.ox * Math.sin(nAngle) * 0.3 + np.oy * Math.cos(nAngle);
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = np.color;
            ctx.beginPath();
            ctx.arc(nx, ny, np.r * 0.5, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
          });
        } else if (el.type === 'electron') {
          const { orb, p } = el;
          const size = orb.electronR * p.scale;
          for (let trail = 1; trail <= 6; trail++) {
            const ta = t * orb.speed + orb.phase - trail * 0.12;
            const tp = project3D(ta, orb, globalAngle);
            ctx.globalAlpha = (0.12 / trail) * p.scale;
            ctx.fillStyle = orb.electronColor;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, (size * 0.7) * (1 - trail * 0.1), 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
          eg.addColorStop(0, colorWithAlpha(orb.electronColor, 0.6));
          eg.addColorStop(1, colorWithAlpha(orb.electronColor, 0));
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3, 0, TAU);
          ctx.fill();
          
          const ecg = ctx.createRadialGradient(p.x - size*0.3, p.y - size*0.3, 0, p.x, p.y, size);
          ecg.addColorStop(0, '#ffffff');
          ecg.addColorStop(0.4, orb.electronColor);
          ecg.addColorStop(1, colorWithAlpha(orb.electronColor, 0.5));
          ctx.fillStyle = ecg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, TAU);
          ctx.fill();
        }
      });

      t++;
      atomFrameId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(atomFrameId);
  }, []);

  return (
    <>
      <SharedBackground />
      <section className="hero">
        <div className="crystal cr1"></div>
        <div className="crystal cr2"></div>
        <div className="crystal cr3"></div>
        <div className="crystal cr4"></div>
        <div className="crystal cr5"></div>
        <div className="crystal cr6"></div>
        <div className="crystal cr7"></div>
        <div className="crystal cr8"></div>

        <div className="atom-wrap">
          <canvas id="atom-canvas" ref={atomCanvasRef}></canvas>
        </div>

        <div className="hero-text">
          <h1 className="hero-title">
            Explora la <span className="hi">Física</span><br/>En Grande
          </h1>
          <div className="hero-sim-label">
            <span className="sim-line"></span>
            <span className="sim-text">simulador interactivo</span>
            <span className="sim-line"></span>
          </div>
          <p className="hero-sub">
            Simulaciones interactivas, entretenidas y fáciles para estudiantes o curiosos. 
            Visualiza la física a otro nivel.
          </p>
          <div className="hero-actions">
            <Link to="/modules" className="btn-primary-new">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Comenzar Simulador
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
