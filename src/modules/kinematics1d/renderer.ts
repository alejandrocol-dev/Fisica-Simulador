import type { Kinematics1DState, Kinematics1DParams } from './physics-engine';
import type { ViewTransform } from '../../hooks/useCanvasInteraction';

export interface Kinematics1DDisplayOptions {
  showGrid: boolean;
  showVectors: boolean;
  showLabels: boolean;
}

export function renderKinematics1D(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: Kinematics1DState,
  params: Kinematics1DParams,
  history: { 
    x: { x: number; y: number }[];
    x2?: { x: number; y: number }[];
  },
  transform?: ViewTransform,
  hoverTime?: number | null,
  options: Kinematics1DDisplayOptions = { showGrid: true, showVectors: true, showLabels: true }
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Background
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  bgGrad.addColorStop(0, 'rgba(15, 15, 35, 1)');
  bgGrad.addColorStop(1, 'rgba(5, 5, 16, 1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const t = transform || { panX: 0, panY: 0, zoom: 1 };
  ctx.save();
  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);

  const zw = w / t.zoom;
  const zh = h / t.zoom;
  const ox = -t.panX / t.zoom;
  const oy = -t.panY / t.zoom;

  const centerY = h / 2;
  const paddingX = 60;
  
  // Dynamic bounds: expand to always contain particle positions with generous padding
  // Minimum visible range is ±100m so the scene is never too small
  let minX = Math.min(-100, params.x0, state.x);
  let maxX = Math.max(100, params.x0, state.x);
  
  if (params.enableBody2) {
    minX = Math.min(minX, params.x0_2, state.x2);
    maxX = Math.max(maxX, params.x0_2, state.x2);
  }

  // Add generous padding (20% of range or at least 30m)
  const span = maxX - minX;
  const pad = Math.max(30, span * 0.2);
  minX -= pad;
  maxX += pad;

  const rangeX = maxX - minX || 200;
  
  const scaleX = (w - paddingX * 2) / rangeX;
  const toScreenX = (val: number) => paddingX + (val - minX) * scaleX;

  // Canvas wide Grid
  if (options.showGrid) {
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.04)';
    ctx.lineWidth = 1 / t.zoom;
    const gridStep = 30;
    for (let i = -w * 2; i < w * 5; i += gridStep) {
      ctx.beginPath(); ctx.moveTo(i, -h * 5); ctx.lineTo(i, h * 5); ctx.stroke();
    }
    for (let i = -h * 5; i < h * 5; i += gridStep) {
      ctx.beginPath(); ctx.moveTo(-w * 2, i); ctx.lineTo(w * 5, i); ctx.stroke();
    }
  }

  // Grid / Grid steps — denser divisions (rangeX / 20)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1 / t.zoom;
  
  const rawStep = rangeX / 20;
  const step = getNiceStep(Math.max(1, rawStep));

  // Render ground and grid
  const startGrid = Math.floor(minX / step) * step;
  const endGrid = Math.ceil(maxX / step) * step;
  
  for (let x = startGrid; x <= endGrid; x += step) {
    const sx = toScreenX(x);
    // Vertical grid line (small tick for 1D)
    ctx.beginPath();
    ctx.moveTo(sx, centerY - 8 / t.zoom);
    ctx.lineTo(sx, centerY + 8 / t.zoom);
    ctx.stroke();
    
    // Metric text on street
    if (options.showLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = `${Math.max(9, 9 / t.zoom)}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${x}m`, sx, centerY + 25 / t.zoom);
    }
  }

  // Draw the street center line spanning the whole static range
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toScreenX(startGrid), centerY);
  ctx.lineTo(toScreenX(endGrid), centerY);
  ctx.stroke();

  // Trail
  const drawTrail = (trailData: {x: number; y: number}[], color: string, offsetY: number) => {
    if (trailData && trailData.length > 1) {
      ctx.beginPath();
      let started = false;
      for (const pt of trailData) {
        const sx = toScreenX(pt.y);
        if (!started) {
          ctx.moveTo(sx, centerY + offsetY);
          started = true;
        } else {
          ctx.lineTo(sx, centerY + offsetY);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const body1Offset = 0;
  const body2Offset = 0;

  drawTrail(history.x, 'rgba(108, 92, 231, 0.5)', body1Offset);
  if (params.enableBody2 && history.x2) {
    drawTrail(history.x2, 'rgba(225, 112, 85, 0.5)', body2Offset);
  }

  // Helper function to draw an arrow
  const drawArrowLine = (fromX: number, fromY: number, toX: number, toY: number, color: string, width: number) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    
    // Reverse scale the head length
    const headLen = Math.min(len * 0.3, 10 / t.zoom);
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width / t.zoom;
    ctx.stroke();
  };

  // Helper function to draw object / ghost
  const drawObject = (posX: number, vel: number, acc: number, timeStr: string, isGhost: boolean, color: string, offsetY: number) => {
    const screenX = toScreenX(posX);
    const radius = 10 / t.zoom;

    if (isGhost) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1 / t.zoom;
      ctx.setLineDash([4 / t.zoom, 4 / t.zoom]);
      ctx.beginPath();
      ctx.arc(screenX, centerY + offsetY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      if (options.showLabels) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${10 / t.zoom}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`t=${timeStr}s`, screenX, centerY + offsetY - radius - 15 / t.zoom);
      }
    } else {
      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX, centerY + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Position Text Above Particle
      if (options.showLabels) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10 / t.zoom}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${posX.toFixed(1)}m`, screenX, centerY + offsetY - radius - 10 / t.zoom);
      }
    }

    // Velocity Vector
    if (Math.abs(vel) > 0.05 && options.showVectors) {
      const vScale = scaleX * 0.5;
      const vEndX = screenX + vel * vScale;
      // Draw velocity arrow above box
      const yVecOff = isGhost ? centerY + offsetY - 30 / t.zoom : centerY + offsetY - 40 / t.zoom;
      const vcol = isGhost ? 'rgba(255, 82, 82, 0.4)' : '#ff5252';
      drawArrowLine(screenX, yVecOff, vEndX, yVecOff, vcol, isGhost ? 1.5 : 2.5);
      
      if (!isGhost && options.showLabels) {
        ctx.fillStyle = '#ff5252';
        ctx.fillText(`v=${vel.toFixed(1)}`, (screenX + vEndX) / 2, yVecOff - 10 / t.zoom);
      }
    }

    // Acceleration Vector
    if (Math.abs(acc) > 0.05 && options.showVectors) {
      const aScale = scaleX * 2; // exaggerated
      const aEndX = screenX + acc * aScale;
      // Draw acceleration arrow below
      const yVecOff = isGhost ? centerY + offsetY + 25 / t.zoom : centerY + offsetY + 35 / t.zoom;
      const acol = isGhost ? 'rgba(0, 230, 118, 0.4)' : '#00e676';
      drawArrowLine(screenX, yVecOff, aEndX, yVecOff, acol, isGhost ? 1.5 : 2.5);
      
      if (!isGhost && options.showLabels) {
        ctx.fillStyle = '#00e676';
        ctx.fillText(`a=${acc.toFixed(1)}`, (screenX + aEndX) / 2, yVecOff + 10 / t.zoom);
      }
    }
  };

  // Draw Ghost Box if hover exist
  if (hoverTime !== undefined && hoverTime !== null) {
      // calculate state purely analytically for the ghost
      const { x0, v0, a, enableBody2, x0_2, v0_2, a_2 } = params;
      const t = hoverTime;
      const gx = x0 + v0 * t + 0.5 * a * t * t;
      const gv = v0 + a * t;
      drawObject(gx, gv, a, t.toFixed(2), true, '#6c5ce7', body1Offset);

      if (enableBody2) {
        const gx2 = x0_2 + v0_2 * t + 0.5 * a_2 * t * t;
        const gv2 = v0_2 + a_2 * t;
        drawObject(gx2, gv2, a_2, t.toFixed(2), true, '#e17055', body2Offset);
      }
  }

  // Draw the actual object
  drawObject(state.x, state.v, state.a, state.t.toFixed(2), false, '#6c5ce7', body1Offset);
  if (params.enableBody2) {
      drawObject(state.x2, state.v2, state.a2, state.t.toFixed(2), false, '#e17055', body2Offset);
  }

  ctx.restore(); // view transform

  // Legend
  const legendY = h - 30;
  ctx.font = '10px Inter, sans-serif';
  let lx = w / 2 - 100;
  
  const legendItems = [
    { color: '#6c5ce7', label: 'Posición x(t)' },
    { color: '#ff5252', label: 'Velocidad v(t)' },
    { color: '#00e676', label: 'Aceleración a(t)' },
  ];
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(lx, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'var(--text-light)';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 8, legendY + 3);
    lx += 100;
  }
}

function getNiceStep(rawStep: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const norm = rawStep / mag;
  if (norm <= 1.5) return mag;
  if (norm <= 3) return 2 * mag;
  if (norm <= 7) return 5 * mag;
  return 10 * mag;
}
