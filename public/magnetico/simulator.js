/**
 * ============================================================
 *  Simulador de Campo Magnético Interactivo
 *  Física: Dipolo magnético con líneas de campo trazadas via RK4
 * ============================================================
 */

// ─── Helpers ───────────────────────────────────────────────
const TAU = Math.PI * 2;
const MU_0_OVER_4PI = 1; // Normalized constant for visual purposes

function vec2(x, y) { return { x, y }; }
function vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function vecScale(v, s) { return { x: v.x * s, y: v.y * s }; }
function vecLen(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
function vecNorm(v) { const l = vecLen(v) || 1e-12; return { x: v.x / l, y: v.y / l }; }
function vecDot(a, b) { return a.x * b.x + a.y * b.y; }
function vecRot(v, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// HSL to CSS string
function hsl(h, s, l, a = 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// ─── Magnet Class ──────────────────────────────────────────
class Magnet {
    constructor(x, y, angle = 0, moment = 3000) {
        this.x = x;
        this.y = y;
        this.angle = angle; // radians
        this.moment = moment;
        this.width = 80;
        this.height = 28;
        this.selected = false;
        this.hovered = false;
        this.id = Magnet._nextId++;
    }

    /** Get the magnetic moment vector (points from S to N) */
    getMomentVector() {
        return { x: Math.cos(this.angle) * this.moment, y: Math.sin(this.angle) * this.moment };
    }

    /** North pole position (tip of moment direction) */
    getNorthPos() {
        return {
            x: this.x + Math.cos(this.angle) * this.width * 0.5,
            y: this.y + Math.sin(this.angle) * this.width * 0.5
        };
    }

    /** South pole position (opposite of moment direction) */
    getSouthPos() {
        return {
            x: this.x - Math.cos(this.angle) * this.width * 0.5,
            y: this.y - Math.sin(this.angle) * this.width * 0.5
        };
    }

    /** Check if point is inside the magnet body */
    containsPoint(px, py) {
        // Transform point into magnet-local coordinates
        const dx = px - this.x;
        const dy = py - this.y;
        const c = Math.cos(-this.angle), s = Math.sin(-this.angle);
        const lx = dx * c - dy * s;
        const ly = dx * s + dy * c;
        return Math.abs(lx) <= this.width * 0.5 + 8 && Math.abs(ly) <= this.height * 0.5 + 8;
    }

    /**
     * Calculate the magnetic field at point (px, py) due to this dipole.
     * Uses the 2D dipole field formula:
     * B(r) = (μ₀/4π) * [ 3(m·r̂)r̂ - m ] / |r|³   (adapted for 2D)
     */
    updateCache() {
        const c = Math.cos(this.angle);
        const s = Math.sin(this.angle);
        this.cacheMomentX = c * this.moment;
        this.cacheMomentY = s * this.moment;
        this.cacheNX = this.x + c * this.width * 0.5;
        this.cacheNY = this.y + s * this.width * 0.5;
        this.cacheSX = this.x - c * this.width * 0.5;
        this.cacheSY = this.y - s * this.width * 0.5;
    }

    getNorthPos() { return { x: this.cacheNX, y: this.cacheNY }; }
    getSouthPos() { return { x: this.cacheSX, y: this.cacheSY }; }

    fieldAt(px, py) {
        const rx = px - this.x;
        const ry = py - this.y;
        const r2 = rx * rx + ry * ry;
        const minR2 = 400; 
        
        if (r2 < minR2) {
            const rr = Math.sqrt(r2) * 0.05; // 1/sqrt(400)
            return { x: this.cacheMomentX * rr * 0.001, y: this.cacheMomentY * rr * 0.001 };
        }

        const r = Math.sqrt(r2);
        const r3Inv = 1.0 / (r2 * r);
        const rHatX = rx / r;
        const rHatY = ry / r;
        const mDotR = this.cacheMomentX * rHatX + this.cacheMomentY * rHatY;

        const scale = MU_0_OVER_4PI * r3Inv;
        return {
            x: scale * (3 * mDotR * rHatX - this.cacheMomentX),
            y: scale * (3 * mDotR * rHatY - this.cacheMomentY)
        };
    }
}
Magnet._nextId = 0;


// ─── Field Simulator ──────────────────────────────────────
class FieldSimulator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // State
        this.magnets = [];
        this.selectedMagnet = null;
        this.hoveredMagnet = null;
        this.dragging = false;
        this.needsRedraw = true;
        this.animFrame = null;

        // Settings
        this.settings = {
            lineCount: 48,
            lineLength: 1000,
            arrowDensity: 1.2,
            showFieldLines: true,
            showArrows: true,
            showGrid: true,
            showFieldMap: false,
            showCompass: true,
            fieldIntensity: 3000,
        };

        // Static color for field lines (cyan-blue)
        this.fieldLineColor = 'rgba(0, 245, 255, 0.6)';

        // Setup
        this._resize();
        this._bindEvents();
        this._bindControls();

        // Add a default magnet
        this.addMagnet(this.canvas.width / 2, this.canvas.height / 2, 0);
    }

    getFieldColor(magnitude) {
        return this.fieldLineColor;
    }

    getFieldColorAlpha(magnitude) {
        // Subtle alpha adjustment based on magnitude for depth, without complex colors
        const logMag = Math.log10(magnitude + 1e-10);
        const t = clamp((logMag + 5) / 5, 0.2, 0.9);
        return `rgba(0, 245, 255, ${t})`;
    }

    // ─── Physics ──────────────────────────────────────────
    /** Combined magnetic field from all magnets at point (x, y) */
    totalField(x, y) {
        let bx = 0, by = 0;
        const magnets = this.magnets;
        const len = magnets.length;
        for (let i = 0; i < len; i++) {
            const mag = magnets[i];
            const rx = x - mag.x;
            const ry = y - mag.y;
            const r2 = rx * rx + ry * ry;
            const minR2 = 400; 
            
            if (r2 < minR2) {
                const rr = Math.sqrt(r2) * 0.05;
                bx += mag.cacheMomentX * rr * 0.001;
                by += mag.cacheMomentY * rr * 0.001;
                continue;
            }

            const rInv = 1.0 / Math.sqrt(r2);
            const r3Inv = rInv * rInv * rInv;
            const rHatX = rx * rInv;
            const rHatY = ry * rInv;
            const mDotR = mag.cacheMomentX * rHatX + mag.cacheMomentY * rHatY;

            const scale = MU_0_OVER_4PI * r3Inv;
            bx += scale * (3 * mDotR * rHatX - mag.cacheMomentX);
            by += scale * (3 * mDotR * rHatY - mag.cacheMomentY);
        }
        return { x: bx, y: by };
    }

    /** Trace a field line from a starting point using RK4 integration */
    traceFieldLine(startX, startY, direction = 1, maxSteps = null) {
        const ds = 4 * direction; 
        const steps = maxSteps || this.settings.lineLength;
        let x = startX, y = startY;
        const points = [];
        const margin = -50;
        const magnets = this.magnets;
        const magLen = magnets.length;

        for (let i = 0; i < steps; i++) {
            const k1 = this.totalField(x, y);
            const k1L = Math.sqrt(k1.x * k1.x + k1.y * k1.y) || 1e-12;
            const k1nx = k1.x / k1L, k1ny = k1.y / k1L;

            const x2 = x + k1nx * ds * 0.5, y2 = y + k1ny * ds * 0.5;
            const k2 = this.totalField(x2, y2);
            const k2L = Math.sqrt(k2.x * k2.x + k2.y * k2.y) || 1e-12;
            const k2nx = k2.x / k2L, k2ny = k2.y / k2L;

            const x3 = x + k2nx * ds * 0.5, y3 = y + k2ny * ds * 0.5;
            const k3 = this.totalField(x3, y3);
            const k3L = Math.sqrt(k3.x * k3.x + k3.y * k3.y) || 1e-12;
            const k3nx = k3.x / k3L, k3ny = k3.y / k3L;

            const x4 = x + k3nx * ds, y4 = y + k3ny * ds;
            const k4 = this.totalField(x4, y4);
            const k4L = Math.sqrt(k4.x * k4.x + k4.y * k4.y) || 1e-12;
            const k4nx = k4.x / k4L, k4ny = k4.y / k4L;

            // RK4 weighted average
            x += (k1nx + 2 * (k2nx + k3nx) + k4nx) * 0.16666 * ds;
            y += (k1ny + 2 * (k2ny + k3ny) + k4ny) * 0.16666 * ds;

            if (x < margin || x > this.canvas.width - margin || y < margin || y > this.canvas.height - margin) break;

            let tooClose = false;
            for (let j = 0; j < magLen; j++) {
                const mag = magnets[j];
                const dN2 = (x - mag.cacheNX)**2 + (y - mag.cacheNY)**2;
                const dS2 = (x - mag.cacheSX)**2 + (y - mag.cacheSY)**2;
                if (dN2 < 144 || dS2 < 144) { tooClose = true; break; }
            }
            
            points.push({ x, y, m: k1L });
            if (tooClose) break;
        }
        return points;
    }

    /** Generate seed points around all magnets' poles */
    generateFieldLineSeeds() {
        const seeds = [];
        const linesPerPole = Math.ceil(this.settings.lineCount / 2);

        for (const mag of this.magnets) {
            const north = mag.getNorthPos();
            const south = mag.getSouthPos();
            const seedRadius = 14; // Slightly tighter radius

            for (let i = 0; i < linesPerPole; i++) {
                const angle = (i / linesPerPole) * TAU;
                
                // Seed around North pole
                seeds.push({
                    x: north.x + Math.cos(angle) * seedRadius,
                    y: north.y + Math.sin(angle) * seedRadius,
                    direction: 1
                });

                // Seed around South pole
                seeds.push({
                    x: south.x + Math.cos(angle) * seedRadius,
                    y: south.y + Math.sin(angle) * seedRadius,
                    direction: -1
                });
            }
        }
        return seeds;
    }

    // ─── Rendering ────────────────────────────────────────
    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Clear with background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, W, H);

        // Subtle background gradient
        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
        bgGrad.addColorStop(0, 'rgba(10, 15, 30, 1)');
        bgGrad.addColorStop(1, 'rgba(10, 10, 15, 1)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Grid
        if (this.settings.showGrid) this._renderGrid(ctx, W, H);

        // Field intensity map
        if (this.settings.showFieldMap) this._renderFieldMap(ctx, W, H);

        // Compass needles
        if (this.settings.showCompass) this._renderCompasses(ctx, W, H);

        // Update magnet caches once per frame
        for (let i = 0; i < this.magnets.length; i++) {
            this.magnets[i].updateCache();
        }

        // Field lines
        if (this.settings.showFieldLines) {
            this._renderFieldLines(ctx);
        }

        // Magnets
        for (let i = 0; i < this.magnets.length; i++) {
            this._renderMagnet(ctx, this.magnets[i]);
        }

        // Update indicators
        this._updateFieldIndicator();
    }

    _renderGrid(ctx, W, H) {
        const spacing = 60;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < W; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
        }
        for (let y = 0; y < H; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
        }
        ctx.stroke();
    }

    _renderFieldMap(ctx, W, H) {
        const resolution = 12;
        const cols = Math.ceil(W / resolution);
        const rows = Math.ceil(H / resolution);

        // Create offscreen canvas for the heatmap
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cols;
        offCanvas.height = rows;
        const offCtx = offCanvas.getContext('2d');
        const imageData = offCtx.createImageData(cols, rows);
        const data = imageData.data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px = col * resolution + resolution / 2;
                const py = row * resolution + resolution / 2;
                const B = this.totalField(px, py);
                const mag = vecLen(B);

                const logMag = Math.log10(mag + 1e-10);
                const minLog = -5;
                const maxLog = -0.5;
                const t = clamp((logMag - minLog) / (maxLog - minLog), 0, 1);

                const idx = (row * cols + col) * 4;
                // Cyan → Magenta
                const h = lerp(185, 320, t);
                const [r, g, b] = hslToRgb(h / 360, 0.8, lerp(0.1, 0.4, t));
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = Math.floor(t * 120);
            }
        }

        offCtx.putImageData(imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offCanvas, 0, 0, W, H);
    }

    _renderCompasses(ctx, W, H) {
        const spacing = 120;
        const needleLen = 48;
        const needleWidth = 7;

        for (let x = spacing / 2; x < W; x += spacing) {
            for (let y = spacing / 2; y < H; y += spacing) {
                const B = this.totalField(x, y);
                const mag = vecLen(B);
                
                const angle = Math.atan2(B.y, B.x);
                // Adjust t so it stays highly visible even at low intensity
                const logMag = Math.log10(mag + 1e-10);
                const t = clamp((logMag + 6) / 6, 0.65, 1);

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);

                // North half (red)
                ctx.beginPath();
                ctx.moveTo(needleLen * t, 0);
                ctx.lineTo(0, -needleWidth * t);
                ctx.lineTo(0, needleWidth * t);
                ctx.closePath();
                ctx.fillStyle = `rgba(255, 60, 90, ${t * 0.98})`;
                ctx.strokeStyle = `rgba(0, 0, 0, 0.5)`;
                ctx.lineWidth = 1.2 * t;
                ctx.fill();
                ctx.stroke();

                // South half (blue)
                ctx.beginPath();
                ctx.moveTo(-needleLen * t, 0);
                ctx.lineTo(0, -needleWidth * t);
                ctx.lineTo(0, needleWidth * t);
                ctx.closePath();
                ctx.fillStyle = `rgba(60, 130, 255, ${t * 0.98})`;
                ctx.strokeStyle = `rgba(0, 0, 0, 0.5)`;
                ctx.lineWidth = 1.2 * t;
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    _renderFieldLines(ctx) {
        const seeds = this.generateFieldLineSeeds();

        for (const seed of seeds) {
            // Trace in the forward direction (along field)
            const forwardPoints = this.traceFieldLine(seed.x, seed.y, 1);
            // Trace in reverse (against field)
            const reversePoints = this.traceFieldLine(seed.x, seed.y, -1);

            // Combine: reverse(reversed) + forward
            const allPoints = [...reversePoints.reverse(), ...forwardPoints.slice(1)];

            if (allPoints.length < 3) continue;

            this._drawFieldLineCurve(ctx, allPoints);

            // Arrows
            if (this.settings.showArrows && allPoints.length > 10) {
                this._drawFieldLineArrows(ctx, allPoints);
            }
        }
    }

    _drawFieldLineCurve(ctx, points) {
        if (points.length < 2) return;
        
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.fieldLineColor;
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }

    _drawFieldLineArrows(ctx, points) {
        const totalLen = points.length;
        const count = Math.ceil(this.settings.arrowDensity * 3);
        const step = Math.max(1, Math.floor(totalLen / (count + 1)));
        const arrowSize = 7;

        for (let i = step; i < totalLen - 2; i += step) {
            const p = points[i];
            const p2 = points[i + 1];
            const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
            const color = this.getFieldColorAlpha(p.m);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(angle);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(arrowSize, 0);
            ctx.lineTo(-arrowSize * 0.6, -arrowSize * 0.5);
            ctx.lineTo(-arrowSize * 0.3, 0);
            ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.5);
            ctx.fill();
            ctx.restore();
        }
    }

    _renderMagnet(ctx, mag) {
        ctx.save();
        ctx.translate(mag.x, mag.y);
        ctx.rotate(mag.angle);

        const hw = mag.width / 2;
        const hh = mag.height / 2;
        const radius = 6;

        // Shadow / glow
        if (mag.selected || mag.hovered) {
            ctx.shadowColor = mag.selected ? 'rgba(0, 245, 255, 0.4)' : 'rgba(0, 245, 255, 0.2)';
            ctx.shadowBlur = mag.selected ? 25 : 15;
        }

        // North half (right side) — Red
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.lineTo(hw - radius, -hh);
        ctx.arcTo(hw, -hh, hw, -hh + radius, radius);
        ctx.lineTo(hw, hh - radius);
        ctx.arcTo(hw, hh, hw - radius, hh, radius);
        ctx.lineTo(0, hh);
        ctx.closePath();

        const northGrad = ctx.createLinearGradient(0, -hh, 0, hh);
        northGrad.addColorStop(0, '#ff3355');
        northGrad.addColorStop(0.5, '#cc2244');
        northGrad.addColorStop(1, '#aa1533');
        ctx.fillStyle = northGrad;
        ctx.fill();

        // South half (left side) — Blue
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.lineTo(-hw + radius, -hh);
        ctx.arcTo(-hw, -hh, -hw, -hh + radius, radius);
        ctx.lineTo(-hw, hh - radius);
        ctx.arcTo(-hw, hh, -hw + radius, hh, radius);
        ctx.lineTo(0, hh);
        ctx.closePath();

        const southGrad = ctx.createLinearGradient(0, -hh, 0, hh);
        southGrad.addColorStop(0, '#3388ff');
        southGrad.addColorStop(0.5, '#2266dd');
        southGrad.addColorStop(1, '#1155bb');
        ctx.fillStyle = southGrad;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Center divide line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.lineTo(0, hh);
        ctx.stroke();

        // "N" label on north
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `bold ${Math.round(hh * 0.9)}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', hw * 0.5, 1);

        // "S" label on south
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('S', -hw * 0.5, 1);

        // Border
        ctx.strokeStyle = mag.selected
            ? 'rgba(0, 245, 255, 0.6)'
            : mag.hovered
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = mag.selected ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, mag.width, mag.height, radius);
        ctx.stroke();

        // Selection ring
        if (mag.selected) {
            ctx.strokeStyle = 'rgba(0, 245, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.roundRect(-hw - 6, -hh - 6, mag.width + 12, mag.height + 12, radius + 4);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    _updateFieldIndicator() {
        // Sample max field strength near magnets
        let maxB = 0;
        for (const mag of this.magnets) {
            const testPoints = [
                { x: mag.x + 60, y: mag.y },
                { x: mag.x - 60, y: mag.y },
                { x: mag.x, y: mag.y + 60 },
                { x: mag.x, y: mag.y - 60 },
            ];
            for (const pt of testPoints) {
                const B = this.totalField(pt.x, pt.y);
                const bMag = vecLen(B);
                if (bMag > maxB) maxB = bMag;
            }
        }
        const display = maxB.toExponential(2);
        const el = document.getElementById('maxFieldValue');
        if (el) el.textContent = `${display} u`;
    }

    // ─── Interaction ──────────────────────────────────────
    _bindEvents() {
        const canvas = this.canvas;

        // Resize
        window.addEventListener('resize', () => { this._resize(); this.needsRedraw = true; });

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        canvas.addEventListener('mouseleave', () => this._onMouseUp());
        canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));
        canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

        // Touch events
        canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));

        // Keyboard
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        this.dpr = dpr;
        this.needsRedraw = true;
    }

    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    _findMagnetAt(x, y) {
        // Search in reverse (top-most first)
        for (let i = this.magnets.length - 1; i >= 0; i--) {
            if (this.magnets[i].containsPoint(x, y)) return this.magnets[i];
        }
        return null;
    }

    _onMouseDown(e) {
        const pos = this._getCanvasPos(e);
        const mag = this._findMagnetAt(pos.x, pos.y);

        if (mag) {
            this.selectMagnet(mag);
            this.dragging = true;
            this.dragOffset = { x: pos.x - mag.x, y: pos.y - mag.y };
            this.canvas.classList.add('grabbing');
        } else {
            this.selectMagnet(null);
        }
        this.needsRedraw = true;
    }

    _onMouseMove(e) {
        const pos = this._getCanvasPos(e);

        if (this.dragging && this.selectedMagnet) {
            const target = this.selectedMagnet;
            target.x = pos.x - this.dragOffset.x;
            target.y = pos.y - this.dragOffset.y;
            this.needsRedraw = true;
            if (this.selectedMagnet) this._updateTooltip(pos.x, pos.y, this.selectedMagnet);
        } else {
            const mag = this._findMagnetAt(pos.x, pos.y);

            // Magnet hover
            if (this.hoveredMagnet !== mag) {
                if (this.hoveredMagnet) this.hoveredMagnet.hovered = false;
                this.hoveredMagnet = mag;
                if (mag) {
                    mag.hovered = true;
                    this.canvas.classList.add('grab');
                    this._updateTooltip(pos.x, pos.y, mag);
                } else {
                    this.canvas.classList.remove('grab');
                    this._hideTooltip();
                }
                this.needsRedraw = true;
            } else if (mag) {
                this._updateTooltip(pos.x, pos.y, mag);
            }
        }
    }

    _onMouseUp() {
        this.dragging = false;
        this.canvas.classList.remove('grabbing');
        if (!this.hoveredMagnet) this._hideTooltip();
    }

    _onDoubleClick(e) {
        const pos = this._getCanvasPos(e);
        const existingMag = this._findMagnetAt(pos.x, pos.y);
        if (!existingMag) {
            this.addMagnet(pos.x, pos.y, 0);
        }
    }

    _onWheel(e) {
        const pos = this._getCanvasPos(e);
        const mag = this._findMagnetAt(pos.x, pos.y);
        if (mag) {
            e.preventDefault();
            mag.angle += (e.deltaY > 0 ? 1 : -1) * 0.08;
            this.needsRedraw = true;
        }
    }

    // Touch support
    _lastTouchPos = null;
    _touchMagnet = null;

    _onTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = { x: touch.clientX, y: touch.clientY };
            this._lastTouchPos = pos;
            const mag = this._findMagnetAt(pos.x, pos.y);
            if (mag) {
                this.selectMagnet(mag);
                this._touchMagnet = mag;
                this.dragOffset = { x: pos.x - mag.x, y: pos.y - mag.y };
            }
        }
    }

    _onTouchMove(e) {
        if (e.touches.length === 1 && this._touchMagnet) {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = { x: touch.clientX, y: touch.clientY };
            this._touchMagnet.x = pos.x - this.dragOffset.x;
            this._touchMagnet.y = pos.y - this.dragOffset.y;
            this._lastTouchPos = pos;
            this.needsRedraw = true;
        }
    }

    _onTouchEnd() {
        this._touchMagnet = null;
        this._lastTouchPos = null;
    }

    _onKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement === document.body) {
                if (this.selectedMagnet) this.removeMagnet(this.selectedMagnet);
            }
        }
        if (e.key === 'Escape') {
            this.selectMagnet(null);
            this.needsRedraw = true;
        }
    }

    // ─── Tooltip ──────────────────────────────────────────
    _updateTooltip(mx, my, mag) {
        const tooltip = document.getElementById('magnetTooltip');
        if (!tooltip) return;

        tooltip.classList.remove('hidden');
        tooltip.style.left = (mx + 20) + 'px';
        tooltip.style.top = (my - 60) + 'px';

        document.getElementById('tooltipPos').textContent =
            `${Math.round(mag.x)}, ${Math.round(mag.y)}`;
        document.getElementById('tooltipAngle').textContent =
            `${Math.round(mag.angle * 180 / Math.PI)}°`;

        const B = this.totalField(mx, my);
        const bMag = vecLen(B);
        document.getElementById('tooltipField').textContent = bMag.toExponential(2) + ' u';
    }

    _hideTooltip() {
        const tooltip = document.getElementById('magnetTooltip');
        if (tooltip) tooltip.classList.add('hidden');
    }

    // ─── Public Methods ───────────────────────────────────
    addMagnet(x, y, angle = 0) {
        const mag = new Magnet(x, y, angle, this.settings.fieldIntensity);
        this.magnets.push(mag);
        this.selectMagnet(mag);
        this.needsRedraw = true;
        return mag;
    }

    removeMagnet(mag) {
        const idx = this.magnets.indexOf(mag);
        if (idx !== -1) {
            this.magnets.splice(idx, 1);
            if (this.selectedMagnet === mag) this.selectedMagnet = null;
            if (this.hoveredMagnet === mag) this.hoveredMagnet = null;
            this._updateElementList();
            this.needsRedraw = true;
        }
    }

    selectMagnet(mag) {
        if (this.selectedMagnet) this.selectedMagnet.selected = false;
        this.selectedMagnet = mag;
        if (mag) mag.selected = true;

        const btnRemove = document.getElementById('btnRemoveMagnet');
        if (btnRemove) btnRemove.disabled = (!mag);
        this._updateElementList();
        this.needsRedraw = true;
    }

    reset() {
        this.magnets = [];
        
        this.selectedMagnet = null;
        this.hoveredMagnet = null;
        this.dragging = false;
        this._hideTooltip();
        this.addMagnet(this.canvas.width / (2 * this.dpr), this.canvas.height / (2 * this.dpr), 0);
        this._updateElementList();
        this.needsRedraw = true;
    }

    // ─── Controls Binding ─────────────────────────────────
    _bindControls() {
        // Panel toggle
        const panelToggle = document.getElementById('panelToggle');
        const panel = document.getElementById('controlsPanel');
        if (panelToggle && panel) {
            panelToggle.addEventListener('click', () => {
                const isCollapsed = panel.classList.toggle('collapsed');
                panelToggle.title = isCollapsed ? 'Expandir panel' : 'Colapsar panel';
                // On mobile
                if (window.innerWidth <= 768) {
                    panel.classList.toggle('expanded-mobile');
                }
            });
        }

        // Add magnet
        document.getElementById('btnAddMagnet')?.addEventListener('click', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const x = 200 + Math.random() * (w - 400);
            const y = 150 + Math.random() * (h - 300);
            this.addMagnet(x, y, Math.random() * TAU);
        });

        // Remove magnet
        document.getElementById('btnRemoveMagnet')?.addEventListener('click', () => {
            if (this.selectedMagnet) this.removeMagnet(this.selectedMagnet);
        });

        // Reset
        document.getElementById('btnReset')?.addEventListener('click', () => {
            this.reset();
        });

        // Initialize element list
        this._updateElementList();

        // Sliders
        this._bindSlider('lineCount', 'lineCountValue', (v) => { this.settings.lineCount = v; });
        this._bindSlider('lineLength', 'lineLengthValue', (v) => { this.settings.lineLength = v; });

        // Toggles
        this._bindToggle('showFieldLines', (v) => { this.settings.showFieldLines = v; });
        this._bindToggle('showArrows', (v) => { this.settings.showArrows = v; });
        this._bindToggle('showGrid', (v) => { this.settings.showGrid = v; });
        this._bindToggle('showFieldMap', (v) => { this.settings.showFieldMap = v; });
        this._bindToggle('showCompass', (v) => { this.settings.showCompass = v; });

        // Start button (overlay)
        document.getElementById('btnStart')?.addEventListener('click', () => {
            document.getElementById('instructionsOverlay')?.classList.add('hidden');
        });
    }

    _updateElementList() {
        const listEl = document.getElementById('elementList');
        if (!listEl) return;

        listEl.innerHTML = '';
        
        // List Magnets
        this.magnets.forEach((mag, i) => {
            const item = document.createElement('div');
            item.className = 'element-item' + (mag.selected ? ' active' : '');
            item.innerHTML = `
                <div class="element-name" title="ID: ${mag.id}">
                    <span class="element-type-icon type-magnet"></span>
                    Imán ${i + 1}
                </div>
                <button class="btn-remove-small" title="Eliminar este imán">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
            item.querySelector('.element-name').onclick = () => {
                this.selectMagnet(mag);
            };
            item.querySelector('.btn-remove-small').onclick = (e) => {
                e.stopPropagation();
                this.removeMagnet(mag);
            };
            listEl.appendChild(item);
        });
    }


    _bindSlider(id, valueId, callback) {
        const slider = document.getElementById(id);
        const valueEl = document.getElementById(valueId);
        if (!slider) return;
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value);
            if (valueEl) valueEl.textContent = v;
            callback(v);
            this.needsRedraw = true;
        });
    }

    _bindToggle(id, callback) {
        const toggle = document.getElementById(id);
        if (!toggle) return;
        toggle.addEventListener('change', () => {
            callback(toggle.checked);
            this.needsRedraw = true;
        });
    }

    // ─── Animation Loop ──────────────────────────────────
    start() {
        let lastTime = performance.now();
        const loop = (time) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            if (this.needsRedraw) {
                this.render();
                this.needsRedraw = false;
            }
            this.animFrame = requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        // Force periodic redraws for smooth interaction feel
        setInterval(() => {
            if (this.dragging) this.needsRedraw = true;
        }, 16);
    }
}

// ─── HSL to RGB utility ───────────────────────────────────
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ─── Initialize ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fieldCanvas');
    if (!canvas) return;

    const sim = new FieldSimulator(canvas);
    sim.start();

    // Make simulator available globally for debugging
    window.fieldSim = sim;
});
