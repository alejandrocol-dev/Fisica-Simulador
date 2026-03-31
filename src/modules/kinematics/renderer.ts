import { getAnalyticalRange, getAnalyticalMaxHeight, type KinematicsState, type KinematicsParams } from './physics-engine';
import type { ViewTransform } from '../../hooks/useCanvasInteraction';

export function resetKinematicsTrail() {}

export interface KinematicsDisplayOptions {
  showGrid: boolean;
  showVectors: boolean;
  showLabels: boolean;
}

export function renderKinematics(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: KinematicsState,
  params: KinematicsParams,
  trajectoryData: { x: number; y: number; t: number }[],
  transform?: ViewTransform,
  hoverTime?: number | null,
  options: KinematicsDisplayOptions = { showGrid: true, showVectors: true, showLabels: true }
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr; canvas.height = h * dpr;
  }
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Background (fixed)
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  bgGrad.addColorStop(0, 'rgba(15, 15, 35, 1)');
  bgGrad.addColorStop(1, 'rgba(5, 5, 16, 1)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Apply view transform
  const t = transform || { panX: 0, panY: 0, zoom: 1 };
  ctx.save();
  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);

  const groundY = h - 60;
  const padding = 60;

  let theoryRange = getAnalyticalRange(params);
  let theoryMaxH = getAnalyticalMaxHeight(params);
  
  // En caso de que haya resistencia del aire u otro error que retorne NaN, hacemos un fallback simple
  if (isNaN(theoryRange) || theoryRange < 0.1) {
    theoryRange = params.initialSpeed > 0 ? params.initialSpeed * 2 : 10;
  }
  if (isNaN(theoryMaxH) || theoryMaxH < 0.1) {
    theoryMaxH = params.height > 0 ? params.height + 5 : 10;
  }

  // Escala completamente estática para evitar deformación al cambiar parámetros ("zoom in/out" automático)
  const maxX = 120;
  const maxY = Math.max(60, params.height * 1.2, (params.targetHeight || 0) * 1.2);

  const plotW = w - padding * 2;
  const plotH = groundY - padding;
  const scaleX = plotW / maxX;
  const scaleY = plotH / maxY;
  const toScreenX = (x: number) => padding + x * scaleX;
  const toScreenY = (y: number) => groundY - y * scaleY;

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

  // Solid axis lines (Y vertical and X horizontal)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1.5;
  // Y axis line
  ctx.beginPath(); ctx.moveTo(padding, groundY); ctx.lineTo(padding, toScreenY(maxY * 1.05)); ctx.stroke();
  // X axis line
  ctx.beginPath(); ctx.moveTo(padding, groundY); ctx.lineTo(toScreenX(maxX * 1.05), groundY); ctx.stroke();

  // Axis tick marks and labels — dense divisions
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; ctx.lineWidth = 1;
  const gridSpacingX = getNiceStep(maxX / 12);
  const gridSpacingY = getNiceStep(maxY / 10);
  ctx.font = '10px JetBrains Mono, monospace'; 
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  
  ctx.textAlign = 'center';
  for (let gx = 0; gx <= maxX; gx += gridSpacingX) {
    const sx = toScreenX(gx);
    ctx.beginPath(); ctx.moveTo(sx, groundY - 4); ctx.lineTo(sx, groundY + 4); ctx.stroke();
    if (options.showLabels) ctx.fillText(gx.toFixed(0) + 'm', sx, groundY + 16);
  }
  ctx.textAlign = 'right';
  for (let gy = 0; gy <= maxY; gy += gridSpacingY) {
    const sy = toScreenY(gy);
    ctx.beginPath(); ctx.moveTo(padding - 4, sy); ctx.lineTo(padding + 4, sy); ctx.stroke();
    if (options.showLabels) ctx.fillText(gy.toFixed(0) + 'm', padding - 8, sy + 4);
  }

  // Axis arrow heads
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1.5;
  // X Arrow head
  const xEnd = toScreenX(maxX * 1.05);
  ctx.beginPath(); ctx.moveTo(xEnd - 8, groundY - 4); ctx.lineTo(xEnd, groundY); ctx.lineTo(xEnd - 8, groundY + 4); ctx.stroke();
  // Y Arrow head
  const yEnd = toScreenY(maxY * 1.05);
  ctx.beginPath(); ctx.moveTo(padding - 4, yEnd + 8); ctx.lineTo(padding, yEnd); ctx.lineTo(padding + 4, yEnd + 8); ctx.stroke();

  // Ground
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 60);
  groundGrad.addColorStop(0, 'rgba(0, 100, 0, 0.6)'); groundGrad.addColorStop(1, 'rgba(0, 50, 0, 0.3)');
  ctx.fillStyle = groundGrad; ctx.fillRect(-w * 2, groundY, w * 10, 60);
  ctx.strokeStyle = 'rgba(0, 230, 118, 0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-w * 2, groundY); ctx.lineTo(w * 10, groundY); ctx.stroke();

  // Launch pad
  const padX = toScreenX(0); const padY = toScreenY(params.height);
  ctx.fillStyle = 'rgba(108, 92, 231, 0.6)';
  ctx.fillRect(padX - 15, padY, 30, groundY - padY);
  ctx.strokeStyle = 'rgba(108, 92, 231, 1.0)'; ctx.lineWidth = 1;
  ctx.strokeRect(padX - 15, padY, 30, groundY - padY);

  // Target Height Floor / Building block
  const targetH = params.targetHeight || 0;
  if (targetH > 0) {
    const tScreenY = toScreenY(targetH);

    // Usa el alcance analítico en lugar de state.x para que el edificio sea fijo
    let impactX = theoryRange;
    if (isNaN(impactX) || impactX < 0) {
      impactX = params.initialSpeed * 2; // Fallback
    }

    const roofLeftPad = maxX * 0.05;
    const blockStartX = Math.max(0, impactX - roofLeftPad);
    const startPixelX = toScreenX(blockStartX);

    const bGrad = ctx.createLinearGradient(0, tScreenY, 0, groundY);
    bGrad.addColorStop(0, '#1e272e');
    bGrad.addColorStop(1, '#0d1a0d');
    ctx.fillStyle = bGrad;
    ctx.fillRect(startPixelX, tScreenY, w * 10, groundY - tScreenY);

    // Roof Top
    ctx.fillStyle = 'rgba(0, 230, 118, 0.4)';
    ctx.fillRect(startPixelX, tScreenY, w * 10, 4);

    ctx.strokeStyle = '#00e676'; // vibrant green roof
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startPixelX, tScreenY);
    ctx.lineTo(startPixelX + w * 10, tScreenY);
    ctx.stroke();

    // Left wall of building
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startPixelX, tScreenY);
    ctx.lineTo(startPixelX, groundY);
    ctx.stroke();
  }

  // Analytical trajectory (dotted)
  if (params.airResistance <= 0) {
    const angleRad = (params.launchAngle * Math.PI) / 180;
    const v0x = params.initialSpeed * Math.cos(angleRad);
    const v0y = params.initialSpeed * Math.sin(angleRad);
    const th = params.targetHeight || 0;
    
    // Calculate total time of flight mathematically
    let totalT = 0;
    const discriminant = v0y * v0y + 2 * params.gravity * (params.height - th);
    if (discriminant >= 0) {
      if (params.height > th) {
        totalT = (v0y + Math.sqrt(discriminant)) / params.gravity;
      } else {
        // Starts below or at target height. Hits it on the way up or down.
        // It hits it on the way down if we take the larger root.
        totalT = (v0y + Math.sqrt(discriminant)) / params.gravity;
      }
    }

    if (totalT > 0) {
      ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let ti = 0; ti <= totalT + 0.05; ti += totalT / 100) {
        const ax = v0x * ti;
        const ay = params.height + v0y * ti - 0.5 * params.gravity * ti * ti;
        const sx = toScreenX(ax); const sy = toScreenY(Math.max(th, Math.max(0, ay)));
        if (ti === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // Trajectory trail
  if (trajectoryData.length > 2) {
    for (let i = 1; i < trajectoryData.length; i++) {
      const p0 = trajectoryData[i - 1]; const p1 = trajectoryData[i];
      const alpha = 0.2 + (i / trajectoryData.length) * 0.8;
      ctx.strokeStyle = `rgba(255, 82, 82, ${alpha * 0.8})`;
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.save(); ctx.shadowColor = 'rgba(255, 82, 82, 0.4)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(toScreenX(p0.x), toScreenY(p0.y));
      ctx.lineTo(toScreenX(p1.x), toScreenY(p1.y)); ctx.stroke(); ctx.restore();
    }
  }

  // Ghost particle on hover
  if (hoverTime !== null && hoverTime !== undefined && trajectoryData.length > 0) {
    let closest = trajectoryData[0];
    let minDist = Infinity;
    for (const p of trajectoryData) {
      const d = Math.abs(p.t - hoverTime);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    if (closest) {
      const gx = toScreenX(closest.x); const gy = toScreenY(closest.y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(`t=${closest.t.toFixed(2)}s`, gx, gy - 15);
    }
  }

  // Projectile
  const projX = toScreenX(state.x); const projY = toScreenY(state.y);
  
  const glow = ctx.createRadialGradient(projX, projY, 2, projX, projY, 20);
  glow.addColorStop(0, state.hasLanded ? 'rgba(0, 230, 118, 0.4)' : 'rgba(0, 255, 255, 0.4)'); 
  glow.addColorStop(1, state.hasLanded ? 'rgba(0, 230, 118, 0)' : 'rgba(0, 255, 255, 0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(projX, projY, 20, 0, Math.PI * 2); ctx.fill();
  
  if (!state.hasLanded) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(projX, projY, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(projX, projY, 4.5, 0, Math.PI * 2); ctx.stroke();

    // Position label (even higher and smaller)
    if (options.showLabels) {
      ctx.fillStyle = '#00e676'; ctx.font = 'bold 9.5px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 4;
      ctx.fillText(`(${state.x.toFixed(1)}, ${state.y.toFixed(1)}) m`, projX, projY - 75);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = 'rgba(0, 230, 118, 0.5)'; ctx.beginPath(); ctx.arc(projX, projY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00e676'; ctx.font = 'bold 11px JetBrains Mono, monospace'; ctx.textAlign = 'left';
    ctx.save(); ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 4;
    ctx.fillText(`Impacto: ${state.x.toFixed(1)}m | t: ${state.time.toFixed(2)}s`, projX + 16, projY - 8);
    ctx.restore();
  }

  // Draw vectors regardless of landing state (so final velocities are visible)
  if (options.showVectors) {
    const vScale = Math.max(6, 60 / (params.initialSpeed || 10));
    // Resultant velocity (yellow)
    drawArrow(ctx, projX, projY, projX + state.vx * vScale, projY - state.vy * vScale, '#ffd740', 2.5);
    
    // Horizontal component (red)
    if (Math.abs(state.vx) > 0.1) {
      drawArrow(ctx, projX, projY, projX + state.vx * vScale, projY, '#ff5252', 2);
      if (options.showLabels) {
        ctx.fillStyle = '#ff5252'; ctx.font = 'bold 12px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText(`vx=${state.vx.toFixed(1)}`, projX + state.vx * vScale, projY + 25);
      }
    }
    
    // Vertical component (blue)
    if (Math.abs(state.vy) > 0.1) {
      drawArrow(ctx, projX, projY, projX, projY - state.vy * vScale, '#448aff', 2);
      if (options.showLabels) {
        ctx.fillStyle = '#448aff'; ctx.font = 'bold 12px JetBrains Mono, monospace'; ctx.textAlign = 'right';
        ctx.fillText(`vy=${state.vy.toFixed(1)}`, projX - 8, projY - state.vy * vScale - 8);
      }
    }
  }

  // Max height indicator
  if (state.vy <= 0 && state.maxHeight > 0.5) {
    const mhY = toScreenY(state.maxHeight);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255, 215, 64, 0.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padding, mhY); ctx.lineTo(w - padding, mhY); ctx.stroke();
    ctx.setLineDash([]);
    if (options.showLabels) {
      ctx.fillStyle = '#ffd740'; ctx.font = 'bold 11px JetBrains Mono, monospace'; ctx.textAlign = 'right';
      ctx.fillText(`h_max = ${state.maxHeight.toFixed(1)} m (t = ${state.timeAtMaxHeight.toFixed(2)}s)`, w - padding - 5, mhY - 12);
    }
  }

  ctx.restore(); // end view transform

  // Legend (fixed screen space)
  const items = [
    { color: '#ff5252', label: 'Trayectoria / vx' }, { color: '#448aff', label: 'vy' },
    { color: '#ffd740', label: 'v total' }, { color: '#00e676', label: 'Posición' },
  ];
  ctx.font = '10px Inter, sans-serif';
  let lx = w / 2 - 200;
  for (const item of items) {
    ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(lx, h - 30, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 8, h - 27); lx += 110;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Scroll: zoom  |  Drag: pan  |  Doble-click: reset  |  Space: play/pause', w / 2, h - 10);

  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const headLen = Math.min(7, len * 0.3), angle = Math.atan2(dy, dx);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.5), y2 - headLen * Math.sin(angle - 0.5));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.5), y2 - headLen * Math.sin(angle + 0.5));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function getNiceStep(rawStep: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  if (norm <= 1) return mag; if (norm <= 2) return 2 * mag; if (norm <= 5) return 5 * mag;
  return 10 * mag;
}
