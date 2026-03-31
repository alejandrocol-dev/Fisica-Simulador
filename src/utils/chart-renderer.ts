/**
 * PhysLab Pro — Custom Canvas Chart Renderer
 * Real-time chart drawing without external dependencies.
 * Smooth, GPU-friendly rendering for physics data.
 */

export interface ChartSeries {
  label: string;
  color: string;
  data: { x: number; y: number }[];
  lineWidth?: number;
}

export interface ChartConfig {
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  maxPoints?: number;
  gridLines?: boolean;
  showDot?: boolean;
  autoScale?: boolean;
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  hoverX?: number | null;
}

const PADDING = { top: 12, right: 16, bottom: 36, left: 52 };

export function drawChart(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  series: ChartSeries[],
  config: ChartConfig
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, w, h);

  const plotX = PADDING.left;
  const plotY = PADDING.top;
  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;

  if (plotW <= 0 || plotH <= 0) return;

  // Compute data bounds
  let xMin = config.xMin ?? Infinity;
  let xMax = config.xMax ?? -Infinity;
  let yMin = config.yMin ?? Infinity;
  let yMax = config.yMax ?? -Infinity;

  for (const s of series) {
    for (const p of s.data) {
      if (config.xMin === undefined) { xMin = Math.min(xMin, p.x); }
      if (config.xMax === undefined) { xMax = Math.max(xMax, p.x); }
      if (config.yMin === undefined) { yMin = Math.min(yMin, p.y); }
      if (config.yMax === undefined) { yMax = Math.max(yMax, p.y); }
    }
  }

  if (!isFinite(xMin)) xMin = 0;
  if (!isFinite(xMax)) xMax = 1;
  if (!isFinite(yMin)) yMin = -1;
  if (!isFinite(yMax)) yMax = 1;

  // Add padding to y bounds
  const yRange = yMax - yMin || 1;
  if (config.yMin === undefined) yMin -= yRange * 0.1;
  if (config.yMax === undefined) yMax += yRange * 0.1;
  const xRange = xMax - xMin || 1;

  const toPixelX = (x: number) => plotX + ((x - xMin) / (xMax - xMin)) * plotW;
  const toPixelY = (y: number) => plotY + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.roundRect(plotX, plotY, plotW, plotH, 4);
  ctx.fill();

  // Draw grid
  if (config.gridLines !== false) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Horizontal grid
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = plotY + (i / yTicks) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
    }

    // Vertical grid
    const xTicks = 6;
    for (let i = 0; i <= xTicks; i++) {
      const x = plotX + (i / xTicks) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
    }

    // Zero line
    if (yMin < 0 && yMax > 0) {
      const zeroY = toPixelY(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX, zeroY);
      ctx.lineTo(plotX + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Axis labels
  ctx.fillStyle = 'rgba(160, 160, 192, 0.7)';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';

  // X axis tick labels
  const xTickCount = 6;
  for (let i = 0; i <= xTickCount; i++) {
    const val = xMin + (i / xTickCount) * (xMax - xMin);
    const x = plotX + (i / xTickCount) * plotW;
    ctx.fillText(val.toFixed(1), x, plotY + plotH + 14);
  }

  // Y axis tick labels
  ctx.textAlign = 'right';
  const yTickCount = 5;
  for (let i = 0; i <= yTickCount; i++) {
    const val = yMax - (i / yTickCount) * (yMax - yMin);
    const y = plotY + (i / yTickCount) * plotH + 3;
    ctx.fillText(val.toFixed(2), plotX - 6, y);
  }

  // Axis labels
  ctx.fillStyle = 'rgba(160, 160, 192, 0.5)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${config.xLabel} (${config.xUnit})`, plotX + plotW / 2, h - 4);

  ctx.save();
  ctx.translate(12, plotY + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${config.yLabel} (${config.yUnit})`, 0, 0);
  ctx.restore();

  // Draw Axis Arrows
  ctx.strokeStyle = 'rgba(160, 160, 192, 0.4)';
  ctx.lineWidth = 1.5;
  // X Arrow
  ctx.beginPath();
  ctx.moveTo(plotX + plotW, plotY + plotH);
  ctx.lineTo(plotX + plotW + 12, plotY + plotH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plotX + plotW + 8, plotY + plotH - 3);
  ctx.lineTo(plotX + plotW + 12, plotY + plotH);
  ctx.lineTo(plotX + plotW + 8, plotY + plotH + 3);
  ctx.stroke();

  // Y Arrow
  ctx.beginPath();
  ctx.moveTo(plotX, plotY + plotH);
  ctx.lineTo(plotX, plotY - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plotX - 3, plotY - 4);
  ctx.lineTo(plotX, plotY - 8);
  ctx.lineTo(plotX + 3, plotY - 4);
  ctx.stroke();

  // Draw series
  for (const s of series) {
    if (s.data.length < 2) continue;

    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Glow effect
    ctx.save();
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    let started = false;
    for (const p of s.data) {
      const px = toPixelX(p.x);
      const py = toPixelY(p.y);

      // Clip to plot area
      if (px >= plotX && px <= plotX + plotW) {
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    // Gradient fill under curve
    if (s.data.length > 2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX, plotY, plotW, plotH);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
      const rgb = hexToRgb(s.color);
      gradient.addColorStop(0, `rgba(${rgb}, 0.4)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0.1)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();

      let fillStarted = false;
      let firstX = 0;
      for (const p of s.data) {
        const px = toPixelX(p.x);
        const py = toPixelY(p.y);
        if (px >= plotX && px <= plotX + plotW) {
          if (!fillStarted) {
            firstX = px;
            ctx.moveTo(px, py);
            fillStarted = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      if (fillStarted) {
        const lastPoint = s.data[s.data.length - 1];
        ctx.lineTo(toPixelX(lastPoint.x), plotY + plotH);
        ctx.lineTo(firstX, plotY + plotH);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // Current point indicator
    if (config.showDot !== false && s.data.length > 0) {
      const last = s.data[s.data.length - 1];
      const lx = toPixelX(last.x);
      const ly = toPixelY(last.y);

      if (lx >= plotX && lx <= plotX + plotW && ly >= plotY && ly <= plotY + plotH) {
        // Outer glow
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fillStyle = s.color + '33';
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
    }
  }

  // Border around plot area
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(plotX, plotY, plotW, plotH, 4);
  ctx.stroke();

  // Draw interactivity / hover info
  if (config.hoverX !== undefined && config.hoverX !== null) {
    const hx = config.hoverX;
    const px = toPixelX(hx);

    if (px >= plotX && px <= plotX + plotW) {
      // Guide line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(px, plotY);
      ctx.lineTo(px, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip background
      const tooltipW = 110;
      const tooltipH = series.length * 15 + 20;
      let tx = px + 10;
      let ty = plotY + 10;
      if (tx + tooltipW > w) tx = px - tooltipW - 10;
      
      ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
      ctx.strokeStyle = 'rgba(108, 92, 231, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`t = ${hx.toFixed(2)}s`, tx + 8, ty + 14);

      series.forEach((s, idx) => {
        // Find closest point
        let closest = s.data[0];
        let minDist = xRange;
        for (const p of s.data) {
          const d = Math.abs(p.x - hx);
          if (d < minDist) {
            minDist = d;
            closest = p;
          }
        }

        if (closest) {
          const dotY = toPixelY(closest.y);
          // Highlight dot
          ctx.beginPath();
          ctx.arc(px, dotY, 4, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Tooltip text
          ctx.fillStyle = s.color;
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(`${s.label}: ${closest.y.toFixed(2)}`, tx + 8, ty + 28 + idx * 15);
        }
      });
    }
  }
}

function hexToRgb(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const num = parseInt(c, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
