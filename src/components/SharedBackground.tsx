import React, { useEffect, useRef } from 'react';

export default function SharedBackground() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let W: number, H: number;
    let stars: any[] = [];
    let floaters: any[] = [];
    let nebulas: any[] = [];
    const TAU = Math.PI * 2;

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function initStars() {
      stars = [];
      const count = Math.floor((W * H) / 3000); // More stars
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: r < 0.6 ? 0.7 : r < 0.85 ? 1.2 : 1.8, // Slightly larger
          a: 0.5 + Math.random() * 0.5, // Brighter base
          speed: 0.0003 + Math.random() * 0.0008,
          phase: Math.random() * TAU,
          color: ['#ffffff','#cce0ff','#aaccff','#7c6aff','#00e5ff'][Math.floor(Math.random()*5)]
        });
      }
    }

    function initFloaters() {
      floaters = [];
      const cols = ['rgba(108,92,231,', 'rgba(0,206,201,', 'rgba(253,121,168,', 'rgba(253,203,110,', 'rgba(85,239,196,'];
      for (let i = 0; i < 60; i++) { // More floaters
        const c = cols[Math.floor(Math.random() * cols.length)];
        floaters.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: 2.0 + Math.random() * 4.5, // Larger
          a: 0.4 + Math.random() * 0.6, // More opaque
          color: c,
          phase: Math.random() * TAU,
          pulseSpeed: 0.01 + Math.random() * 0.02
        });
      }
    }

    function initNebulas() {
      nebulas = [];
      const data = [
        { x: 0.2, y: 0.3, r: 450, c: 'rgba(108,92,231,' }, // Larger nebulas
        { x: 0.8, y: 0.2, r: 350, c: 'rgba(0,206,201,' },
        { x: 0.5, y: 0.75, r: 400, c: 'rgba(253,121,168,' },
        { x: 0.15, y: 0.8, r: 250, c: 'rgba(253,203,110,' },
        { x: 0.85, y: 0.65, r: 300, c: 'rgba(85,239,196,' }
      ];
      data.forEach(d => nebulas.push(d));
    }

    let t = 0;
    let bgFrameId: number;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Dark bg
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#040715'); // Slightly darker for more contrast
      bgGrad.addColorStop(1, '#050a1b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Nebula blobs
      nebulas.forEach(n => {
        const g = ctx.createRadialGradient(n.x*W, n.y*H, 0, n.x*W, n.y*H, n.r);
        g.addColorStop(0, n.c + '0.12)'); // More visible nebulas
        g.addColorStop(0.5, n.c + '0.04)');
        g.addColorStop(1, n.c + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x*W, n.y*H, n.r, 0, TAU);
        ctx.fill();
      });

      // Stars
      stars.forEach(s => {
        const flicker = s.a * (0.6 + 0.4 * Math.sin(t * s.speed * 1000 + s.phase));
        ctx.globalAlpha = flicker;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      });

      // Floating colored particles
      ctx.globalAlpha = 1;
      floaters.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < -40) f.x = W + 40;
        if (f.x > W + 40) f.x = -40;
        if (f.y < -40) f.y = H + 40;
        if (f.y > H + 40) f.y = -40;
        f.phase += f.pulseSpeed;
        const alpha = f.a * (0.5 + 0.5 * Math.sin(f.phase));
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 4);
        glow.addColorStop(0, f.color + alpha + ')');
        glow.addColorStop(1, f.color + '0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = f.color + (alpha * 1.8) + ')'; // More glow
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, TAU);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      t++;
      bgFrameId = requestAnimationFrame(draw);
    }

    const handleResize = () => { resize(); initStars(); initFloaters(); };
    resize();
    initStars();
    initFloaters();
    initNebulas();
    draw();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(bgFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas id="bg-canvas" ref={bgCanvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}></canvas>;
}
