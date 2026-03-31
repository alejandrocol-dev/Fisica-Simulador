/**
 * Dynamics Sandbox Renderer
 */
import type { DynamicsState, DynamicsParams, Vector2 } from './physics-engine';
import type { ViewTransform } from '../../hooks/useCanvasInteraction';

export interface DynamicsDisplayOptions {
  showGrid: boolean;
  showVectors: boolean;
  showLabels: boolean;
}

export function renderDynamics(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DynamicsState,
  params: DynamicsParams,
  transform?: ViewTransform,
  options: DynamicsDisplayOptions = { showGrid: true, showVectors: true, showLabels: true }
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

  // Apply view transform
  const t = transform || { panX: 0, panY: 0, zoom: 1 };
  ctx.save();
  ctx.translate(t.panX, t.panY);
  ctx.scale(t.zoom, t.zoom);

  const scaleY = -1; // Y is up in physics logic
  
  // Transform helpers
  const toScreenX = (x: number) => w / 2 + x * 10;
  const toScreenY = (y: number) => h * 0.8 + y * 10 * scaleY;

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

  // Draw terrain (Polyline)
  if (params.nodes.length > 0) {
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 4 / t.zoom;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Fill under terrain
    ctx.beginPath();
    const firstPoint = params.nodes[0];
    const lastPoint = params.nodes[params.nodes.length - 1];
    ctx.moveTo(toScreenX(firstPoint.x), toScreenY(-100)); // Deep bottom
    for (const node of params.nodes) {
      ctx.lineTo(toScreenX(node.x), toScreenY(node.y));
    }
    ctx.lineTo(toScreenX(lastPoint.x), toScreenY(-100));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 230, 118, 0.1)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toScreenX(params.nodes[0].x), toScreenY(params.nodes[0].y));
    for (let i = 1; i < params.nodes.length; i++) {
        ctx.lineTo(toScreenX(params.nodes[i].x), toScreenY(params.nodes[i].y));
    }
    ctx.stroke();

    // Draw drag nodes
    ctx.fillStyle = '#18ffff';
    for (const node of params.nodes) {
        ctx.beginPath();
        ctx.arc(toScreenX(node.x), toScreenY(node.y), 6 / t.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / t.zoom;
        ctx.stroke();
    }
  }

  // Draw Ball
  const sx = toScreenX(state.x);
  const sy = toScreenY(state.y);
  const sr = params.radius * 10;

  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  const ballGrad = ctx.createRadialGradient(sx - sr*0.3, sy - sr*0.3, sr*0.1, sx, sy, sr);
  ballGrad.addColorStop(0, state.isDraggingBall ? '#ff8a80' : '#ff5252');
  ballGrad.addColorStop(1, '#b71c1c');
  ctx.fillStyle = ballGrad;
  ctx.fill();
  ctx.strokeStyle = state.isDraggingBall ? '#fff' : '#ff8a80';
  ctx.lineWidth = 2 / t.zoom;
  ctx.stroke();

  // Draw Velocity Vector
  if (options.showVectors) {
    const vLen = Math.sqrt(state.vx*state.vx + state.vy*state.vy);
    if (vLen > 0.1) {
      const scaleV = 0.5;
      const ex = sx + state.vx * 10 * scaleV;
      const ey = sy + state.vy * 10 * scaleY * scaleV;
      drawForceArrow(ctx, sx, sy, ex, ey, '#448aff', 2.5 / t.zoom);
    }
  }

  if (options.showLabels) {
    ctx.fillStyle = '#fff';
    ctx.font = `${12 / t.zoom}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`v = ${Math.sqrt(state.vx*state.vx + state.vy*state.vy).toFixed(1)} m/s`, sx, sy - sr - 15/t.zoom);
  }

  ctx.restore(); // view transform restore

  // Help UI
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Interactive Sandbox: Drag the ball to throw it. Drag the cyan nodes to deform the ground.', w/2, 20);
  ctx.restore();
}

function drawForceArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, lineWidth: number
) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const headLen = Math.min(8, len * 0.3), angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.5), y2 - headLen * Math.sin(angle - 0.5));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.5), y2 - headLen * Math.sin(angle + 0.5));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
