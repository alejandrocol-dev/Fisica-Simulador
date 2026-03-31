/**
 * Generador de Faraday — Simulación completa
 * Dos imanes fijos (N-S), bobina central que rota, foco que se ilumina.
 * ε = N·B·A·ω·sin(θ)   |   Φ = N·B·A·cos(θ)
 */

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t) => a + (b - a) * t;

// ── Simulation ─────────────────────────────────────────────
class FaradaySim {
    constructor(canvas) {
        this.cvs = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = 1;

        // coil physics
        this.theta   = 0;       // angle (rad)
        this.omega   = 0;       // angular velocity (rad/s)
        this.accel   = 6;       // user push (rad/s²)
        this.friction = 2.2;    // decel when no key

        // parameters
        this.N    = 10;   // turns
        this.B    = 5;    // field intensity

        // options
        this.autoRotate   = false;
        this.autoSpeed    = 3;
        this.showLines    = true;
        this.showFormulas = true;

        // derived
        this.emf  = 0;
        this.flux = 0;
        this.smoothEmf = 0;

        // waveform history (ring buffer) — larger for larger graph
        this.emfHistory = new Float32Array(400);
        this.histIdx = 0;
        this.histFull = false;
        this.showGraph = true;

        // keys
        this.keys = { left: false, right: false };

        this._resize();
        this._listen();
        this._controls();
    }

    /* ── Physics tick ─────────────────────────────────────── */
    tick(dt) {
        if (this.autoRotate) {
            this.omega = this.autoSpeed;
        } else {
            let push = 0;
            if (this.keys.right) push += this.accel;
            if (this.keys.left)  push -= this.accel;

            if (push !== 0) {
                this.omega += push * dt;
                this.omega = clamp(this.omega, -12, 12);
            } else {
                // friction
                const s = Math.sign(this.omega);
                const d = this.friction * dt;
                if (Math.abs(this.omega) < d) this.omega = 0;
                else this.omega -= s * d;
            }
        }

        this.theta += this.omega * dt;
        if (this.theta > TAU) this.theta -= TAU;
        if (this.theta < -TAU) this.theta += TAU;

        // Physics: A in arbitrary units scaled for nice numbers
        const A = 0.5; // fixed area unit
        this.flux = this.N * this.B * A * Math.cos(this.theta);
        this.emf  = this.N * this.B * A * Math.abs(this.omega) * Math.sin(this.theta);
        this.smoothEmf = lerp(this.smoothEmf, this.emf, 0.18);

        // Record to waveform history (~60 fps → 300 samples ≈ 5s window)
        this.emfHistory[this.histIdx] = this.emf;
        this.histIdx = (this.histIdx + 1) % this.emfHistory.length;
        if (this.histIdx === 0) this.histFull = true;

        // HUD
        const emfEl   = document.getElementById('emfDisplay');
        const fluxEl  = document.getElementById('fluxDisplay');
        const omegaEl = document.getElementById('omegaDisplay');
        if (emfEl)   emfEl.textContent   = this.emf.toFixed(3)  + ' V';
        if (fluxEl)  fluxEl.textContent  = this.flux.toFixed(3) + ' Wb';
        if (omegaEl) omegaEl.textContent = Math.abs(this.omega).toFixed(1) + ' rad/s';
    }

    /* ── Main Draw ───────────────────────────────────────── */
    draw() {
        const ctx = this.ctx;
        const W = this.cvs.width  / this.dpr;
        const H = this.cvs.height / this.dpr;
        const cx = W / 2;
        const cy = H / 2;

        // background
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, W, H);
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
        bg.addColorStop(0, '#0e1020'); bg.addColorStop(1, '#08080e');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        // Layout constants (smaller magnets and coil to avoid overlap at 100% zoom)
        const poleW = Math.min(W * 0.14, 150);
        const poleH = Math.min(H * 0.50, 340);
        const margin = W * 0.03;
        const leftX  = margin;
        const rightX = W - margin - poleW;
        const poleY  = cy - poleH / 2;

        const fieldL = leftX + poleW;
        const fieldR = rightX;
        const fieldT = poleY;
        const fieldB = poleY + poleH;

        // 1) Field lines
        if (this.showLines) this._drawFieldLines(ctx, fieldL, fieldR, fieldT, fieldB);

        // 2) Magnets
        this._drawMagnet(ctx, leftX,  poleY, poleW, poleH, 'N');
        this._drawMagnet(ctx, rightX, poleY, poleW, poleH, 'S');

        // 3) Coil — same height as the magnets
        const coilH = poleH * 0.85;
        const coilW = poleH * 0.45;
        this._drawCoil(ctx, cx, cy, coilW, coilH, this.theta);

        // 4) Wires + Bulb
        const bulbY = cy + coilH / 2 + 70;
        this._drawWires(ctx, cx, cy + coilH / 2, cx, bulbY);
        this._drawBulb(ctx, cx, bulbY, Math.abs(this.smoothEmf));

        // 5) Rotation direction banner (top)
        this._drawRotBanner(ctx, cx, W, H);

        // 6) Physics HUD panels (bottom center)
        if (this.showFormulas) this._drawHUD(ctx, W, H);

        // 7) Live AC waveform graph (bottom right)
        if (this.showGraph) this._drawWaveform(ctx, W, H);
    }

    /* ── Field Lines ─────────────────────────────────────── */
    _drawFieldLines(ctx, l, r, t, b) {
        const n = Math.round(5 + this.B * 0.7);
        const gap = (b - t) / (n + 1);
        const alpha = clamp(0.15 + this.B * 0.04, 0.15, 0.55);

        ctx.save();
        ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
        ctx.lineWidth = 1.2;

        for (let i = 1; i <= n; i++) {
            const y = t + i * gap;
            // line
            ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke();
            // arrow at midpoint
            const mx = (l + r) / 2;
            ctx.fillStyle = `rgba(0,200,255,${alpha + 0.08})`;
            ctx.beginPath();
            ctx.moveTo(mx + 8, y);
            ctx.lineTo(mx - 5, y - 5);
            ctx.lineTo(mx - 3, y);
            ctx.lineTo(mx - 5, y + 5);
            ctx.closePath(); ctx.fill();
        }

        // "B →" label
        ctx.fillStyle = `rgba(0,210,255,0.35)`;
        ctx.font = "bold 13px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center';
        ctx.fillText('B →', (l + r) / 2, t - 6);
        ctx.restore();
    }

    /* ── Magnet Block ────────────────────────────────────── */
    _drawMagnet(ctx, x, y, w, h, pole) {
        const north = pole === 'N';
        ctx.save();

        // glow
        ctx.shadowColor = north ? 'rgba(255,50,60,0.4)' : 'rgba(50,100,255,0.4)';
        ctx.shadowBlur = 35;

        // body
        const g = ctx.createLinearGradient(x, y, x, y + h);
        if (north) { g.addColorStop(0,'#dd1b2b'); g.addColorStop(.5,'#ee2535'); g.addColorStop(1,'#b01020'); }
        else       { g.addColorStop(0,'#1535cc'); g.addColorStop(.5,'#2550ee'); g.addColorStop(1,'#0e28aa'); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
        ctx.shadowBlur = 0;

        // rim
        ctx.strokeStyle = north ? 'rgba(255,180,180,.2)' : 'rgba(150,170,255,.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();

        // label
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.font = `bold ${Math.round(h * 0.22)}px 'Inter',sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pole, x + w / 2, y + h / 2);

        ctx.restore();
    }

    /* ── Rotating Coil ───────────────────────────────────── */
    _drawCoil(ctx, cx, cy, halfW, halfH, angle) {
        // perspective: horizontal dimension scales with cos(angle)
        const perspX = Math.abs(Math.cos(angle)) * halfW;
        const turns = clamp(this.N, 1, 20);
        const spread = Math.min(4, 40 / turns);               // offset between turns
        const topY = cy - halfH / 2;
        const botY = cy + halfH / 2;

        const emfAbs = Math.abs(this.smoothEmf);
        const glowStr = clamp(emfAbs * 60, 0, 22);
        const glowCol = this.smoothEmf >= 0 ? `rgba(255,200,50,${glowStr/22})` : `rgba(100,200,255,${glowStr/22})`;

        ctx.save();

        // Draw each turn
        for (let t = turns - 1; t >= 0; t--) {
            const off = (t - (turns - 1) / 2) * spread;
            const thisCx = cx + off * Math.cos(angle);  // parallax shift for depth

            const alpha = 0.5 + 0.5 * ((turns - t) / turns);

            ctx.shadowBlur = glowStr;
            ctx.shadowColor = glowCol;

            // Back ellipse (top) – dashed copper
            ctx.strokeStyle = `rgba(140,85,36,${alpha * 0.5})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.ellipse(thisCx, topY, perspX, 10, 0, Math.PI, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            // Sides
            ctx.strokeStyle = `rgba(210,130,50,${alpha * 0.9})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(thisCx - perspX, topY); ctx.lineTo(thisCx - perspX, botY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(thisCx + perspX, topY); ctx.lineTo(thisCx + perspX, botY); ctx.stroke();

            // Front ellipse (bottom) – solid copper
            ctx.strokeStyle = `rgba(230,145,60,${alpha})`;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.ellipse(thisCx, botY, perspX, 10, 0, 0, Math.PI);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Axis (dashed line)
        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(cx, topY - 16); ctx.lineTo(cx, botY + 16); ctx.stroke();
        ctx.setLineDash([]);

        // small dots at axis ends
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.beginPath(); ctx.arc(cx, topY - 16, 3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, botY + 16, 3, 0, TAU); ctx.fill();

        // "N vueltas" label
        ctx.fillStyle = 'rgba(230,160,60,0.75)';
        ctx.font = "10px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center';
        ctx.fillText(`${this.N} espiras`, cx, topY - 26);

        ctx.restore();
    }

    /* ── Wires ───────────────────────────────────────────── */
    _drawWires(ctx, fromX, fromY, toX, toY) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,200,220,0.22)';
        ctx.lineWidth = 2;
        const sp = 18;
        // left
        ctx.beginPath();
        ctx.moveTo(fromX - sp, fromY);
        ctx.quadraticCurveTo(fromX - sp, (fromY + toY) / 2, toX - sp, toY - 12);
        ctx.stroke();
        // right
        ctx.beginPath();
        ctx.moveTo(fromX + sp, fromY);
        ctx.quadraticCurveTo(fromX + sp, (fromY + toY) / 2, toX + sp, toY - 12);
        ctx.stroke();
        ctx.restore();
    }

    /* ── Light Bulb ──────────────────────────────────────── */
    _drawBulb(ctx, x, y, emfAbs) {
        const maxEmf = 20;
        const brite  = clamp(emfAbs / maxEmf, 0, 1);
        const R = 26;

        ctx.save();

        // outer glow
        if (brite > 0.02) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, R * (2.5 + brite * 4));
            grad.addColorStop(0, `rgba(255,240,120,${brite * 0.65})`);
            grad.addColorStop(0.35, `rgba(255,200,50,${brite * 0.3})`);
            grad.addColorStop(1, `rgba(255,160,30,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, R * (2.5 + brite * 4), 0, TAU); ctx.fill();
        }

        // glass sphere
        const gR = lerp(45, 255, brite);
        const gG = lerp(45, 235, brite);
        const gB = lerp(50, 120, brite);
        const glass = ctx.createRadialGradient(x - R * .25, y - R * .25, 2, x, y, R);
        glass.addColorStop(0, `rgba(${gR+50},${gG+15},${Math.min(gB+40,255)},0.95)`);
        glass.addColorStop(1, `rgba(${gR},${gG},${gB},0.85)`);
        ctx.fillStyle = glass;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();

        // rim
        ctx.strokeStyle = brite > 0.08
            ? `rgba(255,220,80,${0.3 + brite * 0.6})`
            : 'rgba(130,130,140,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();

        // filament
        const fa = lerp(0.3, 1, brite);
        ctx.strokeStyle = brite > 0.05 ? `rgba(255,240,180,${fa})` : `rgba(160,150,140,${fa})`;
        ctx.lineWidth = brite > 0.1 ? 2.5 : 1.5;
        ctx.shadowColor = `rgba(255,220,80,${brite})`;
        ctx.shadowBlur = brite * 10;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 3);
        ctx.quadraticCurveTo(x - 4, y - 7, x, y);
        ctx.quadraticCurveTo(x + 4, y + 7, x + 8, y - 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // base socket
        const bw = R * 0.65, bh = 14;
        ctx.fillStyle = 'rgba(75,75,85,0.9)';
        ctx.beginPath(); ctx.roundRect(x - bw, y + R - 2, bw * 2, bh, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(180,180,190,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(x - bw, y + R - 2, bw * 2, bh, 3); ctx.stroke();

        // text below bulb
        ctx.fillStyle = brite > 0.05
            ? `rgba(255,240,140,${0.5 + brite * 0.5})`
            : 'rgba(120,120,140,0.45)';
        ctx.font = "bold 15px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(
            brite > 0.03 ? `${emfAbs.toFixed(2)} V` : 'sin girar',
            x, y + R + bh + 8
        );

        ctx.restore();
    }

    /* ── Rotation Banner (TOP of screen) ─────────────────── */
    _drawRotBanner(ctx, cx, W, H) {
        if (Math.abs(this.omega) < 0.05 && !this.keys.left && !this.keys.right) return;

        const dir   = Math.sign(this.omega) || (this.keys.right ? 1 : -1);
        const speed = Math.abs(this.omega);
        const alpha = clamp(speed / 4, 0.15, 0.95);
        const bannerY = H - 80;  // bottom area

        // Position it to the left or right of the light bulb
        const offset = Math.min(W * 0.25, 250);
        const posX = dir > 0 ? cx + offset : cx - offset;

        ctx.save();

        // Arrow line
        const arrowLen = Math.min(W * 0.15, 140);
        const arrowStartX = posX - (dir * arrowLen / 2);
        const arrowEndX   = posX + (dir * arrowLen / 2);

        // Glow trail
        const trailGrad = ctx.createLinearGradient(arrowStartX, 0, arrowEndX, 0);
        trailGrad.addColorStop(0, `rgba(0,245,255,0)`);
        trailGrad.addColorStop(1, `rgba(0,245,255,${alpha * 0.6})`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(arrowStartX, bannerY); ctx.lineTo(arrowEndX, bannerY); ctx.stroke();

        // Big arrowhead
        const hs = 18;
        ctx.fillStyle = `rgba(0,245,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(arrowEndX + dir * hs, bannerY);
        ctx.lineTo(arrowEndX - dir * 4, bannerY - hs * 0.65);
        ctx.lineTo(arrowEndX - dir * 4, bannerY + hs * 0.65);
        ctx.closePath(); ctx.fill();

        // Direction label
        const label = dir > 0 ? 'GIRANDO  →' : '←  GIRANDO';
        ctx.fillStyle = `rgba(0,245,255,${alpha * 0.9})`;
        ctx.font = `bold 16px 'Inter',sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, posX, bannerY - 22);

        // Speed value
        ctx.fillStyle = `rgba(0,245,255,${alpha * 0.65})`;
        ctx.font = `13px 'JetBrains Mono',monospace`;
        ctx.fillText(`ω = ${speed.toFixed(1)} rad/s`, posX, bannerY + 22);

        ctx.restore();
    }

    _drawWaveform(ctx, W, H) {
        const gW = 340;
        const graphH = 170;
        const padLeft = 48;     // space for Y-axis labels
        const padBot  = 24;     // space for X-axis labels
        const padTop  = 28;     // space for title
        const padRight = 14;
        const gH = padTop + graphH + padBot;
        const gX = W - gW - 14;
        const gY = 14;

        // Plot area bounds
        const pL = gX + padLeft;
        const pR = gX + gW - padRight;
        const pT = gY + padTop;
        const pB = gY + padTop + graphH;
        const pMidY = (pT + pB) / 2;
        const plotW = pR - pL;

        ctx.save();

        // Glass panel background
        ctx.fillStyle = 'rgba(8,12,22,0.78)';
        ctx.beginPath(); ctx.roundRect(gX, gY, gW, gH, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(0,245,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(gX, gY, gW, gH, 10); ctx.stroke();

        // ── Determine scale ──
        const len = this.emfHistory.length;
        const count = this.histFull ? len : this.histIdx;

        // Compute actual max from data, but also a theoretical max so scale is steady
        let dataMax = 0.001;
        for (let i = 0; i < count; i++) {
            const v = Math.abs(this.emfHistory[i]);
            if (v > dataMax) dataMax = v;
        }
        const A = 0.5;
        const theoMax = this.N * this.B * A * Math.max(Math.abs(this.omega), 1);
        const rangeMax = Math.max(dataMax, theoMax * 0.8, 1);

        // Nice round Y-axis tick: pick a power-of-10 based step
        const rawStep = rangeMax / 3;
        const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const niceOptions = [1, 2, 5, 10];
        let yStep = mag;
        for (const n of niceOptions) {
            if (n * mag >= rawStep) { yStep = n * mag; break; }
        }
        const yMax = yStep * Math.ceil(rangeMax / yStep);
        const scale = (graphH / 2) / yMax;

        // ── Title / legend (Positioned to the right to avoid overlap with axis) ──
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Title
        ctx.fillStyle = 'rgba(0,220,255,0.5)';
        ctx.font = "bold 10px 'JetBrains Mono',monospace";
        ctx.fillText('FEM ε(t)  —  Corriente Alterna', gX + gW - 12, gY + 8);

        // Config badge (below the title or on the same line if there is space)
        ctx.fillStyle = 'rgba(0,200,255,0.3)';
        ctx.font = "9px 'JetBrains Mono',monospace";
        ctx.fillText(`N=${this.N}  B=${this.B.toFixed(1)}T`, gX + gW - 12, gY + 20);

        // ── Y-Axis (Voltage) ──
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        // Vertical axis line
        ctx.beginPath(); ctx.moveTo(pL, pB); ctx.lineTo(pL, pT - 6); ctx.stroke();
        // Arrowhead
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(pL, pT - 6);
        ctx.lineTo(pL - 3, pT + 2);
        ctx.lineTo(pL + 3, pT + 2);
        ctx.closePath(); ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = "italic 10px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('ε (V)', pL, pT - 8);

        // Y grid lines and tick labels
        ctx.font = "9px 'JetBrains Mono',monospace";
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let v = -yMax; v <= yMax; v += yStep) {
            const py = pMidY - v * scale;
            if (py < pT - 2 || py > pB + 2) continue;

            // Grid line
            ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
            ctx.lineWidth = v === 0 ? 1 : 0.5;
            ctx.setLineDash(v === 0 ? [] : [3, 3]);
            ctx.beginPath(); ctx.moveTo(pL, py); ctx.lineTo(pR, py); ctx.stroke();
            ctx.setLineDash([]);

            // Tick mark
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pL - 4, py); ctx.lineTo(pL, py); ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(0,220,255,0.45)';
            const label = Math.abs(v) >= 100 ? v.toFixed(0) : v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
            ctx.fillText(label, pL - 6, py);
        }

        // ── X-Axis (Time) ──
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pL, pMidY); ctx.lineTo(pR + 8, pMidY); ctx.stroke();
        // Arrowhead
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(pR + 8, pMidY);
        ctx.lineTo(pR, pMidY - 3);
        ctx.lineTo(pR, pMidY + 3);
        ctx.closePath(); ctx.fill();

        // Time ticks — buffer is ~400 samples at 60fps ≈ 6.67s
        const bufferSeconds = len / 60;
        const visibleSec = this.histFull ? bufferSeconds : (count / 60);
        const timeStep = bufferSeconds <= 4 ? 1 : 2;  // tick every 1s or 2s

        ctx.font = "9px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let s = timeStep; s <= bufferSeconds; s += timeStep) {
            const frac = s / bufferSeconds;
            const tx = pL + frac * plotW;
            if (tx > pR - 10) continue;

            // Tick mark
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.moveTo(tx, pMidY - 3); ctx.lineTo(tx, pMidY + 3); ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(0,200,255,0.35)';
            ctx.fillText(`${s}s`, tx, pMidY + 5);
        }
        // "t" label at end
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = "italic 10px 'JetBrains Mono',monospace";
        ctx.fillText('t', pR + 8, pMidY + 5);

        // ── Waveform plot ──
        if (count >= 2) {
            ctx.beginPath();
            for (let i = 0; i < count; i++) {
                const idx = this.histFull ? (this.histIdx + i) % len : i;
                const val = this.emfHistory[idx];
                const px = pL + (i / (len - 1)) * plotW;
                const py = pMidY - val * scale;
                // Clamp to plot area
                const cyy = clamp(py, pT, pB);
                if (i === 0) ctx.moveTo(px, cyy);
                else ctx.lineTo(px, cyy);
            }

            // Gradient stroke
            const grad = ctx.createLinearGradient(pL, 0, pR, 0);
            grad.addColorStop(0, 'rgba(0,245,255,0.06)');
            grad.addColorStop(0.6, 'rgba(0,245,255,0.45)');
            grad.addColorStop(1, 'rgba(0,245,255,0.9)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Bright dot at current point
            const lastIdx = (this.histIdx - 1 + len) % len;
            const lastVal = this.emfHistory[lastIdx];
            const dotX = pL + ((count - 1) / (len - 1)) * plotW;
            const dotY = clamp(pMidY - lastVal * scale, pT, pB);
            ctx.fillStyle = 'rgba(0,245,255,0.95)';
            ctx.shadowColor = 'rgba(0,245,255,0.6)';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, TAU); ctx.fill();
            ctx.shadowBlur = 0;

            // Current value readout next to dot
            ctx.fillStyle = 'rgba(0,245,255,0.7)';
            ctx.font = "bold 10px 'JetBrains Mono',monospace";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const readout = `${lastVal.toFixed(1)} V`;
            const readX = dotX + 8 > pR - 30 ? dotX - 40 : dotX + 8;
            ctx.fillText(readout, readX, dotY - 6);
        }

        ctx.restore();
    }

    _drawHUD(ctx, W, H) {
        ctx.save();

        const panelW = 200;   // Wider to avoid number overlap with units
        const panelH = 100;
        const py = 28;        // Slightly lower to clear the top fade of the container
        const gap = 18;

        // Panel positions: center 3 panels
        const totalW = panelW * 3 + gap * 2;
        const startX = (W - totalW) / 2;

        const panels = [
            { x: startX,               label: 'FEM  ε',     value: Math.abs(this.emf).toFixed(3),  unit: 'V'  },
            { x: startX + panelW + gap, label: 'Flujo  Φ',   value: this.flux.toFixed(3),           unit: 'Wb' },
            { x: startX + (panelW + gap) * 2, label: 'Ω',      value: Math.abs(this.omega).toFixed(1), unit: 'rad/s' },
        ];

        for (const p of panels) {
            // Glass background
            ctx.fillStyle = 'rgba(12,18,34,0.72)';
            ctx.beginPath(); ctx.roundRect(p.x, py, panelW, panelH, 12); ctx.fill();
            ctx.strokeStyle = 'rgba(0,245,255,0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(p.x, py, panelW, panelH, 12); ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(0,220,255,0.45)';
            ctx.font = "bold 13px 'JetBrains Mono',monospace";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(p.label, p.x + 16, py + 14);

            // Value (extra large)
            ctx.fillStyle = 'rgba(0,255,255,0.95)';
            ctx.font = "bold 36px 'JetBrains Mono',monospace";
            ctx.textBaseline = 'bottom';
            ctx.fillText(p.value, p.x + 16, py + panelH - 14);

            // Unit
            ctx.fillStyle = 'rgba(0,220,255,0.4)';
            ctx.font = "14px 'JetBrains Mono',monospace";
            ctx.textAlign = 'right';
            ctx.fillText(p.unit, p.x + panelW - 16, py + panelH - 18);
        }

        ctx.restore();
    }

    /* ── Resize ──────────────────────────────────────────── */
    _resize() {
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;
        this.cvs.width  = window.innerWidth  * dpr;
        this.cvs.height = window.innerHeight * dpr;
        this.cvs.style.width  = window.innerWidth  + 'px';
        this.cvs.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ── Events ──────────────────────────────────────────── */
    _listen() {
        window.addEventListener('resize', () => this._resize());

        window.addEventListener('keydown', e => {
            if (e.repeat) return; // avoid stacking
            if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') this.keys.left  = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
        });
        window.addEventListener('keyup', e => {
            if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') this.keys.left  = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        });
    }

    /* ── Panel Controls ──────────────────────────────────── */
    _controls() {
        // collapse
        document.getElementById('btnCollapse')?.addEventListener('click', () => {
            document.getElementById('panel').classList.toggle('collapsed');
        });

        // start
        document.getElementById('btnStart')?.addEventListener('click', () => {
            document.getElementById('overlay').classList.add('hidden');
        });

        // reset
        document.getElementById('btnReset')?.addEventListener('click', () => {
            this.theta = 0; this.omega = 0;
        });

        // sliders
        const bind = (id, valId, cb) => {
            const s = document.getElementById(id);
            const v = document.getElementById(valId);
            if (!s) return;
            s.addEventListener('input', () => { const n = parseFloat(s.value); if (v) v.textContent = n; cb(n); });
        };
        bind('sliderN',    'valN',    v => { this.N    = v; });
        bind('sliderB',    'valB',    v => { this.B    = v; });
        bind('sliderAutoSpeed', 'valAutoSpeed', v => { this.autoSpeed = v; });

        // toggles
        const tog = (id, cb) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => cb(el.checked));
        };
        tog('chkAuto', v => {
            this.autoRotate = v;
            document.getElementById('autoSpeedRow').classList.toggle('hidden', !v);
            if (!v) this.omega = 0;
        });
        tog('chkLines',    v => { this.showLines    = v; });
        tog('chkFormulas', v => { this.showFormulas = v; });
    }

    /* ── Loop ────────────────────────────────────────────── */
    run() {
        let last = performance.now();
        const loop = t => {
            const dt = Math.min((t - last) / 1000, 0.05);
            last = t;
            this.tick(dt);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const cvs = document.getElementById('simCanvas');
    if (!cvs) return;
    const sim = new FaradaySim(cvs);
    sim.run();
    window.sim = sim;
});
