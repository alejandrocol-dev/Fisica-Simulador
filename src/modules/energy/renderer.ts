/**
 * Energy Module — Renderer
 * Renders the track, particle, spring, reference plane, and real-time energy bars.
 */
import type { EnergyState, EnergyParams, EnergyForces, Vector2 } from './physics-engine';
import { calculateEnergies } from './physics-engine';
import type { ViewTransform } from '../../hooks/useCanvasInteraction';

interface DisplayOptions {
  showGrid: boolean;
  showVectors: boolean;
  showLabels: boolean;
}

export function renderEnergy(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: EnergyState,
  params: EnergyParams,
  transform?: ViewTransform,
  options: DisplayOptions = { showGrid: true, showVectors: true, showLabels: true }
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

  // Background
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  bgGrad.addColorStop(0, '#0a0a1a');
  bgGrad.addColorStop(1, '#050510');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Apply Transform
  const t = transform || { panX: 0, panY: 0, zoom: 1 };
  ctx.save();
  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);
  const scaleY = -1;
  const toScreenX = (x: number) => w / 2 + x * 10;
  const toScreenY = (y: number) => h * 0.7 + y * 10 * scaleY; // Y=0 is further down

  // Grid
  if (options.showGrid) {
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.05)';
    ctx.lineWidth = 1 / t.zoom;
    const gridStep = 50;
    for (let i = -w * 2; i < w * 5; i += gridStep) {
      ctx.beginPath(); ctx.moveTo(i, -h * 5); ctx.lineTo(i, h * 5); ctx.stroke();
    }
    for (let i = -h * 5; i < h * 5; i += gridStep) {
      ctx.beginPath(); ctx.moveTo(-w * 2, i); ctx.lineTo(w * 5, i); ctx.stroke();
    }
  }

  // Reference Level (y = 0 potential energy)
  const refYScreen = toScreenY(params.referenceY);
  ctx.beginPath();
  ctx.moveTo(-w * 2, refYScreen);
  ctx.lineTo(w * 5, refYScreen);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 2 / t.zoom;
  ctx.setLineDash([10 / t.zoom, 10 / t.zoom]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (options.showLabels) {
    // Optionally render other labels here if needed
  }

  // Terrain Fill and Line
  if (params.nodes.length > 0) {
    ctx.strokeStyle = '#64ffda'; // Greenish ground
    ctx.lineWidth = 4 / t.zoom;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    const first = params.nodes[0];
    const last = params.nodes[params.nodes.length - 1];
    ctx.moveTo(toScreenX(first.x), toScreenY(-100));
    for (const node of params.nodes) {
      ctx.lineTo(toScreenX(node.x), toScreenY(node.y));
    }
    ctx.lineTo(toScreenX(last.x), toScreenY(-100));
    ctx.closePath();
    ctx.fillStyle = 'rgba(100, 255, 218, 0.1)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toScreenX(params.nodes[0].x), toScreenY(params.nodes[0].y));
    for (let i = 1; i < params.nodes.length; i++) {
      ctx.lineTo(toScreenX(params.nodes[i].x), toScreenY(params.nodes[i].y));
    }
    ctx.stroke();

    if (options.showLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${13 / t.zoom}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      
      for (let i = 0; i < params.nodes.length - 1; i++) {
        const p1 = params.nodes[i];
        const p2 = params.nodes[i + 1];
        
        let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        // Keep angle positive or display cleanly
        if (Math.abs(angle) < 0.1) angle = 0;
        
        // Midpoint of segment
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        
        ctx.save();
        ctx.translate(toScreenX(midX), toScreenY(midY));
        const angleRad = Math.atan2(-(p2.y - p1.y), p2.x - p1.x);
        ctx.rotate(angleRad);
        
        ctx.fillText(`${Math.round(angle)}°`, 0, 25 / t.zoom);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const mu = params.muKs[i] || 0;
        const label = mu > 0 ? `${distance.toFixed(1)}m | μ:${mu.toFixed(2)}` : `${distance.toFixed(1)}m`;
        ctx.fillText(label, 0, -15 / t.zoom);
        
        ctx.restore();
      }
    }

    // Terrain Nodes
    // Draw Node Markers (Dots and Letters)
    params.nodes.forEach((node, i) => {
      const sx = toScreenX(node.x);
      const sy = toScreenY(node.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 4 / t.zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / t.zoom;
      ctx.stroke();
      
      const char = String.fromCharCode(65 + i); // A, B, C...
      ctx.font = `bold ${14 / t.zoom}px Outfit`;
      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'center';
      ctx.fillText(char, sx, sy + 25 / t.zoom);
    });
  }

  // Right Spring
  if (params.hasRightSpring && params.nodes.length > 0) {
    const rightAnchorX = params.nodes[params.nodes.length - 1].x;
    const rightSpringX = rightAnchorX - params.springL;
    let springBaseY = params.referenceY;
    for (let i = 0; i < params.nodes.length - 1; i++) {
        const p1 = params.nodes[i], p2 = params.nodes[i + 1];
        if (rightSpringX >= p1.x && rightSpringX <= p2.x) {
          const tRatio = (rightSpringX - p1.x) / (p2.x - p1.x);
          springBaseY = p1.y + tRatio * (p2.y - p1.y);
          break;
        } else if (i === params.nodes.length - 2) {
          springBaseY = p2.y;
        }
    }
    const springBaseYScreen = toScreenY(springBaseY + params.radius); // Align with ball center
    
    let currentCompression = 0;
    if (state.x + params.radius > rightSpringX) {
      currentCompression = (state.x + params.radius) - rightSpringX;
      currentCompression = Math.min(params.springL * 0.9, currentCompression);
    }
    const springLeftEnd = rightSpringX + currentCompression;
    const springRightEnd = rightAnchorX;
    const screenLeft = toScreenX(springLeftEnd);
    const screenRight = toScreenX(springRightEnd);

    const wallW = toScreenX(10) - toScreenX(0);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(screenRight, springBaseYScreen - 60 / t.zoom, wallW, 120 / t.zoom);
    ctx.beginPath();
    const coils = 6;
    const dx = (screenRight - screenLeft) / (coils * 2);
    const springRadius = 14 / t.zoom;
    for (let i = 0; i <= coils * 2; i++) {
      const cx = screenLeft + dx * i;
      const cy = springBaseYScreen + (i % 2 === 0 ? springRadius : -springRadius);
      if (i === 0) ctx.moveTo(screenLeft, springBaseYScreen);
      else if (i === coils * 2) ctx.lineTo(screenRight, springBaseYScreen);
      else ctx.lineTo(cx, cy);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 4 / t.zoom;
    ctx.stroke();

    const pusherW = 12 / t.zoom;
    const pusherH = 48 / t.zoom;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(screenLeft - pusherW, springBaseYScreen - pusherH / 2, pusherW, pusherH);
    ctx.shadowBlur = 0;
  }

  // Left Spring
  if (params.hasLeftSpring && params.nodes.length > 0) {
    const leftAnchorX = params.nodes[0].x;
    const leftSpringX = leftAnchorX + params.leftSpringL;
    let springBaseY = params.referenceY;
    for (let i = 0; i < params.nodes.length - 1; i++) {
        const p1 = params.nodes[i], p2 = params.nodes[i + 1];
        if (leftSpringX >= p1.x && leftSpringX <= p2.x) {
          const tRatio = (leftSpringX - p1.x) / (p2.x - p1.x);
          springBaseY = p1.y + tRatio * (p2.y - p1.y);
          break;
        } else if (i === 0) {
          springBaseY = p1.y;
        }
    }
    const springBaseYScreen = toScreenY(springBaseY + params.radius); // Align with ball center
    
    let currentCompression = 0;
    if (state.x - params.radius < leftSpringX) {
      currentCompression = leftSpringX - (state.x - params.radius);
      currentCompression = Math.min(params.leftSpringL * 0.9, currentCompression);
    }
    const springRightEnd = leftSpringX - currentCompression;
    const springLeftEnd = leftAnchorX;
    const screenLeft = toScreenX(springLeftEnd);
    const screenRight = toScreenX(springRightEnd);

    const wallW = toScreenX(10) - toScreenX(0);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(screenLeft - wallW, springBaseYScreen - 60 / t.zoom, wallW, 120 / t.zoom);
    ctx.beginPath();
    const coils = 6;
    const dx = (screenRight - screenLeft) / (coils * 2);
    const springRadius = 14 / t.zoom;
    for (let i = 0; i <= coils * 2; i++) {
      const cx = screenLeft + dx * i;
      const cy = springBaseYScreen + (i % 2 === 0 ? springRadius : -springRadius);
      if (i === 0) ctx.moveTo(screenLeft, springBaseYScreen);
      else if (i === coils * 2) ctx.lineTo(screenRight, springBaseYScreen);
      else ctx.lineTo(cx, cy);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 4 / t.zoom;
    ctx.stroke();

    const pusherW = 12 / t.zoom;
    const pusherH = 48 / t.zoom;
    ctx.fillStyle = '#ff5252';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff5252';
    ctx.fillRect(screenRight, springBaseYScreen - pusherH / 2, pusherW, pusherH);
    ctx.shadowBlur = 0;
  }

  // Particle / Block
  const sx = toScreenX(state.x);
  const sy = toScreenY(state.y);
  const sr = params.radius * 10;

  if (params.objectType === 'block') {
    // Block
    ctx.translate(sx, sy);
    let angle = 0;
    if (!state.flightMode) angle = Math.atan2(-state.lastTangent.y, state.lastTangent.x);
    ctx.rotate(angle);

    const blockGrad = ctx.createLinearGradient(-sr, -sr, sr, sr);
    blockGrad.addColorStop(0, state.isDraggingBall ? '#e040fb' : '#ff9100');
    blockGrad.addColorStop(1, '#f57c00');

    ctx.fillStyle = blockGrad;
    ctx.fillRect(-sr, -sr, sr * 2, sr * 2);
    ctx.strokeStyle = state.isDraggingBall ? '#fff' : '#ffd180';
    ctx.lineWidth = 2 / t.zoom;
    ctx.strokeRect(-sr, -sr, sr * 2, sr * 2);

    ctx.rotate(-angle);
    ctx.translate(-sx, -sy);
  } else {
    // Ball
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
    ballGrad.addColorStop(0, state.isDraggingBall ? '#e040fb' : '#d500f9');
    ballGrad.addColorStop(1, '#4a148c');
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.strokeStyle = state.isDraggingBall ? '#fff' : '#e040fb';
    ctx.lineWidth = 2 / t.zoom;
    ctx.stroke();
  }

  // Draw Physics Vectors
  if (options.showVectors) {
    const drawVec = (vx: number, vy: number, col: string, label: string, scale = 1.5) => {
      const mag = Math.hypot(vx, vy);
      if (mag < 0.01) return;
      const dX = vx * scale * 10;
      const dY = -vy * scale * 10;
      
      // Start at edge of object
      const startDist = sr + 2/t.zoom;
      const angleP = Math.atan2(dY, dX);
      const startX = sx + Math.cos(angleP) * startDist;
      const startY = sy + Math.sin(angleP) * startDist;
      const eX = startX + dX;
      const eY = startY + dY;

      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(eX, eY);
      ctx.strokeStyle = col; ctx.lineWidth = 3 / t.zoom; ctx.stroke();
      
      // Arrow head
      const angle = Math.atan2(-vy, vx);
      const headL = 12 / t.zoom;
      ctx.beginPath();
      ctx.moveTo(eX, eY);
      ctx.lineTo(eX - headL * Math.cos(angle - Math.PI / 6), eY - headL * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(eX - headL * Math.cos(angle + Math.PI / 6), eY - headL * Math.sin(angle + Math.PI / 6));
      ctx.fillStyle = col; ctx.fill();

      if (options.showLabels) {
        ctx.fillStyle = col;
        ctx.font = `bold ${13 / t.zoom}px sans-serif`;
        ctx.fillText(label, eX + 14 / t.zoom * Math.cos(angle), eY + 14 / t.zoom * Math.sin(angle));
      }
    };

    // Velocity (Green)
    drawVec(state.vx, state.vy, '#00e676', 'v', 1.0);

    // Gravity Force
    drawVec(0, -params.mass * params.gravity, '#ff9100', 'Fg', 0.5);

    // Normal Force
    if (!state.flightMode) {
      const N = params.mass * params.gravity * Math.max(0, state.lastNormal.y);
      drawVec(state.lastNormal.x * N, state.lastNormal.y * N, '#ffd740', 'N', 0.5);
    }

    // Friction Force
    if (state.accelFriction > 0 && Math.hypot(state.vx, state.vy) > 0.1) {
      const fMag = params.mass * state.accelFriction;
      const fDir = -Math.sign(state.vx * state.lastTangent.x + state.vy * state.lastTangent.y);
      drawVec(state.lastTangent.x * fMag * fDir, state.lastTangent.y * fMag * fDir, '#ff5252', 'Fr', 1.0);
    }
  }

  if (options.showLabels) {
    ctx.fillStyle = '#fff';
    ctx.font = `${12 / t.zoom}px JetBrains Mono`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(state.y - params.referenceY).toFixed(1)}m`, sx, sy - sr - 15 / t.zoom);
  }

  ctx.restore(); // view transform restore

  // view transform restore
}
