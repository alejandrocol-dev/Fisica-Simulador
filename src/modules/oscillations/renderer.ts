import type { OscillationState, OscillationParams } from './physics-engine';
import type { ViewTransform } from '../../hooks/useCanvasInteraction';

const SPRING_COILS = 12;
const SPRING_WIDTH = 18;

interface TrailPoint { x: number; y: number; alpha: number; }
let trail: TrailPoint[] = [];

export function resetTrail() { trail = []; }

export function renderOscillation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: OscillationState,
  params: OscillationParams,
  history: any,
  transform?: ViewTransform,
  hoverTime?: number | null
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

  // ── Background (fixed) ──
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  bgGrad.addColorStop(0, 'rgba(15, 15, 35, 1)');
  bgGrad.addColorStop(1, 'rgba(5, 5, 16, 1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // ── Apply view transform ──
  const t = transform || { panX: 0, panY: 0, zoom: 1 };
  ctx.save();
  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);

  const zw = w / t.zoom, zh = h / t.zoom;
  const ox = -t.panX / t.zoom, oy = -t.panY / t.zoom;

  // Grid
  ctx.strokeStyle = 'rgba(108, 92, 231, 0.04)';
  ctx.lineWidth = 1 / t.zoom;
  const gridStep = 30;
  
  for (let i = -w * 2; i < w * 5; i += gridStep) {
    ctx.beginPath(); ctx.moveTo(i, -h * 5); ctx.lineTo(i, h * 5); ctx.stroke();
  }
  for (let i = -h * 5; i < h * 5; i += gridStep) {
    ctx.beginPath(); ctx.moveTo(-w * 2, i); ctx.lineTo(w * 5, i); ctx.stroke();
  }

  const centerY = h / 2;
  const wallX = 50;
  const maxStroke = (w - wallX - 120) * 0.4;
  const scale = maxStroke / (params.amplitude || 0.5);
  const massX = w / 2 + state.position * scale;
  const massSize = 40 + params.mass * 8;

  // Wall
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(wallX - 8, centerY - 80, 8, 160);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const y = centerY - 75 + i * 20;
    ctx.beginPath(); ctx.moveTo(wallX - 8, y); ctx.lineTo(wallX - 16, y + 10); ctx.stroke();
  }

  // Equilibrium line
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w / 2, centerY - 100); ctx.lineTo(w / 2, centerY + 100); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = `${10}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('x = 0', w / 2, centerY + 115);

  // Spring
  drawSpring(ctx, wallX, centerY, massX - massSize / 2, centerY, SPRING_COILS, SPRING_WIDTH, state);

  // Trail
  trail.push({ x: massX, y: centerY, alpha: 0.6 });
  if (trail.length > 60) trail.shift();
  for (const pt of trail) {
    pt.alpha *= 0.96;
    if (pt.alpha > 0.01) {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 92, 231, ${pt.alpha * 0.3})`; ctx.fill();
    }
  }

  // Mass glow
  const massGlow = ctx.createRadialGradient(massX, centerY, 0, massX, centerY, massSize);
  massGlow.addColorStop(0, 'rgba(108, 92, 231, 0.2)');
  massGlow.addColorStop(1, 'rgba(108, 92, 231, 0)');
  ctx.fillStyle = massGlow;
  ctx.fillRect(massX - massSize, centerY - massSize, massSize * 2, massSize * 2);

  // Mass block
  const blockGrad = ctx.createLinearGradient(massX - massSize / 2, centerY - massSize / 2, massX + massSize / 2, centerY + massSize / 2);
  blockGrad.addColorStop(0, '#2d2b6e'); blockGrad.addColorStop(1, '#1a1850');
  ctx.fillStyle = blockGrad;
  ctx.beginPath(); ctx.roundRect(massX - massSize / 2, centerY - massSize / 2, massSize, massSize, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(108, 92, 231, 0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(massX - massSize / 2, centerY - massSize / 2, massSize, massSize, 8); ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 12px JetBrains Mono, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${params.mass.toFixed(1)} kg`, massX, centerY);

  // Velocity vector
  if (Math.abs(state.velocity) > 0.005) {
    const vScale = scale * 0.3;
    const vEndX = massX + state.velocity * vScale;
    drawArrow(ctx, massX, centerY - massSize / 2 - 15, vEndX, centerY - massSize / 2 - 15, '#ff5252', 2.5);
    ctx.fillStyle = '#ff5252'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(`v = ${state.velocity.toFixed(2)} m/s`, (massX + vEndX) / 2, centerY - massSize / 2 - 28);
  }

  // Acceleration vector
  if (Math.abs(state.acceleration) > 0.01) {
    const aScale = scale * 0.05;
    const aEndX = massX + state.acceleration * aScale;
    drawArrow(ctx, massX, centerY + massSize / 2 + 15, aEndX, centerY + massSize / 2 + 15, '#448aff', 2.5);
    ctx.fillStyle = '#448aff'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(`a = ${state.acceleration.toFixed(2)} m/s²`, (massX + aEndX) / 2, centerY + massSize / 2 + 32);
  }

  // Force vector
  const springForce = -params.springK * state.position;
  if (Math.abs(springForce) > 0.01) {
    const fScale = scale * 0.04;
    const fEndX = massX + springForce * fScale;
    drawArrow(ctx, massX, centerY + massSize / 2 + 45, fEndX, centerY + massSize / 2 + 45, '#ffd740', 2);
    ctx.fillStyle = '#ffd740'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(`F = ${springForce.toFixed(2)} N`, (massX + fEndX) / 2, centerY + massSize / 2 + 60);
  }

  // Position indicator
  ctx.fillStyle = 'rgba(0, 230, 118, 0.8)'; ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText(`x = ${state.position.toFixed(3)} m`, massX, centerY - massSize / 2 - 50);

  // Ghost Particle
  if (hoverTime !== undefined && hoverTime !== null) {
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < history.x.length; i++) {
        const d = Math.abs(history.x[i].x - hoverTime);
        if (d < minDist) {
            minDist = d;
            closestIdx = i;
        }
    }
    const ghostPos = history.x[closestIdx]?.y || 0;
    const ghostVel = history.v[closestIdx]?.y || 0;
    
    // Ghost Mass X
    const ghostMassX = w / 2 + ghostPos * scale;

    // Draw Ghost Spring connection
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wallX, centerY);
    ctx.lineTo(ghostMassX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Ghost block outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.roundRect(ghostMassX - massSize / 2, centerY - massSize / 2, massSize, massSize, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ghost info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${hoverTime.toFixed(2)}s`, ghostMassX, centerY - massSize / 2 - 10);
  }

  // Floor line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(wallX - 20, centerY + massSize / 2 + 2); ctx.lineTo(w * 5, centerY + massSize / 2 + 2); ctx.stroke();

  ctx.restore(); // ← end view transform

  // ── Legend (fixed screen space) ──
  const legendY = h - 30;
  const legendItems = [
    { color: '#00e676', label: 'Posición' }, { color: '#ff5252', label: 'Velocidad' },
    { color: '#448aff', label: 'Aceleración' }, { color: '#ffd740', label: 'Fuerza' },
  ];
  ctx.font = '10px Inter, sans-serif';
  let lx = w / 2 - 160;
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.beginPath(); ctx.arc(lx, legendY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 8, legendY + 3);
    lx += 90;
  }

  // Hint text
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Scroll: zoom  |  Drag: pan  |  Doble-click: reset  |  Space: play/pause', w / 2, h - 10);

  ctx.restore();
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, _y2: number,
  coils: number, width: number, state: OscillationState
) {
  const springLen = x2 - x1;
  const segLen = springLen / (coils * 2 + 2);
  const stretch = Math.abs(state.position);
  const intensity = Math.min(stretch * 4, 1);
  const r = Math.round(108 + intensity * 147);
  const g = Math.round(92 - intensity * 10);
  const b = Math.round(231 - intensity * 149);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
  ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save();
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + segLen, y1);
  for (let i = 0; i < coils; i++) {
    const cx = x1 + segLen + i * segLen * 2 + segLen;
    ctx.lineTo(cx - segLen * 0.5, y1 - width);
    ctx.lineTo(cx + segLen * 0.5, y1 + width);
  }
  ctx.lineTo(x2 - segLen, y1); ctx.lineTo(x2, y1);
  ctx.stroke(); ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, lineWidth: number
) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 3) return;
  const headLen = Math.min(8, len * 0.3);
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
